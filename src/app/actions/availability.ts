"use server";

import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import type { Actor } from "@/lib/data/actor";
import { logChange } from "./_log";

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
type Result = { ok: true } | { error: string };

export async function addUnavailability(
  p: { employeeId: string; date: string; from: string; to: string; reason: string },
  actor: Actor,
): Promise<Result> {
  if (!p.reason.trim()) return { error: "Geef een reden op." };
  if (!DATE.test(p.date) || !TIME.test(p.from) || !TIME.test(p.to)) return { error: "Vul een geldige datum en tijd in." };
  if (p.to <= p.from) return { error: "De eindtijd moet na de begintijd liggen." };
  if (actor.role === "medewerker" && actor.employeeId !== p.employeeId)
    return { error: "Je kunt alleen je eigen beschikbaarheid doorgeven." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { data, error } = await sb
    .from("unavailability")
    .insert({
      workspace_id: ws.id,
      employee_id: p.employeeId,
      date: p.date,
      start_time: p.from,
      end_time: p.to,
      reason: p.reason.trim(),
      source: actor.role === "medewerker" ? "medewerker" : "planner",
    })
    .select("employee_id, date, start_time, end_time, reason")
    .single();
  if (error) return { error: "Opslaan mislukt." };
  await logChange(sb, { ws, actor, action: "availability_changed", after: data, reason: p.reason.trim() });
  refresh();
  return { ok: true };
}

export async function removeUnavailability(id: string, actor: Actor): Promise<Result> {
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { data: before } = await sb
    .from("unavailability")
    .select("employee_id, date, start_time, end_time, reason")
    .eq("id", id)
    .single();
  if (!before) return { error: "Niet gevonden." };
  if (actor.role === "medewerker" && actor.employeeId !== before.employee_id) return { error: "Niet jouw beschikbaarheid." };
  const { error } = await sb.from("unavailability").delete().eq("id", id);
  if (error) return { error: "Verwijderen mislukt." };
  await logChange(sb, { ws, actor, action: "availability_changed", before });
  refresh();
  return { ok: true };
}
