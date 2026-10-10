"use server";

import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import { PLANNER, type Actor } from "@/lib/data/actor";
import { logChange } from "./_log";

/** The coach on a shift reports something missing from the bag; it lands on the planner's bag overview. */
export async function reportMissing(shiftId: string, actor: Actor, text: string): Promise<{ ok: true } | { error: string }> {
  const t = text.trim();
  if (!t || t.length > 300) return { error: "Beschrijf wat er mist (max 300 tekens)." };
  if (actor.role !== "medewerker") return { error: "Alleen de medewerker op de dienst kan dit melden." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { data: shift } = await sb.from("shifts").select("id, code, employee_id, bag_id").eq("id", shiftId).single();
  if (!shift || shift.employee_id !== actor.employeeId) return { error: "Dit is niet jouw dienst." };
  if (!shift.bag_id) return { error: "Bij deze dienst hoort geen tas." };
  const { data, error } = await sb
    .from("material_reports")
    .insert({ workspace_id: ws.id, bag_id: shift.bag_id, shift_id: shift.id, employee_id: actor.employeeId, text: t })
    .select("id, bag_id, text")
    .single();
  if (error) return { error: "Melden mislukt." };
  await logChange(sb, { ws, actor, action: "material_reported", after: { ...data, shift_code: shift.code }, reason: t });
  refresh();
  return { ok: true };
}

export async function resolveReport(id: string): Promise<{ ok: true } | { error: string }> {
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { data: before } = await sb.from("material_reports").select("id, bag_id, text, resolved_at").eq("id", id).single();
  if (!before || before.resolved_at) return { error: "Melding niet (meer) open." };
  const { error } = await sb.from("material_reports").update({ resolved_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Opslaan mislukt." };
  await logChange(sb, { ws, actor: PLANNER, action: "material_resolved", before });
  refresh();
  return { ok: true };
}
