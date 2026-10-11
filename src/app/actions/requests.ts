"use server";

import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import { describeRule, expandRule, type RecurrenceRule } from "@/lib/recurrence";
import { PLANNER, type Actor } from "@/lib/data/actor";
import { logChange } from "./_log";
import { insertShifts, validTimes } from "./_insert";

type Result = { ok: true; shiftIds?: string[] } | { error: string };
const FUNCTIONS = ["KidzCoach", "Toezichthouder", "Aqualessen", "Zwemonderwijzer", "Gymdocent"];

export interface RequestInput {
  locationId: string;
  rule: RecurrenceRule;
  start: string;
  end: string;
  fn: string;
  activityId: string | null;
  note: string | null;
}

/** A client asks for one or more shifts at one of its own, active locations. */
export async function createRequest(clientId: string, input: RequestInput): Promise<Result> {
  const timeError = validTimes(input.start, input.end);
  if (timeError) return { error: timeError };
  if (!FUNCTIONS.includes(input.fn)) return { error: "Kies een functie." };
  const dates = expandRule(input.rule);
  if (dates.length === 0) return { error: "Kies minstens één datum." };
  if (dates.length > 60) return { error: "Maximaal 60 diensten per aanvraag." };

  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const [{ data: client }, { data: loc }] = await Promise.all([
    sb.from("clients").select("id, name").eq("id", clientId).single(),
    sb.from("locations").select("id, client_id, archived_at").eq("id", input.locationId).single(),
  ]);
  if (!client) return { error: "Opdrachtgever niet gevonden." };
  if (!loc || loc.client_id !== clientId) return { error: "Deze locatie hoort niet bij jouw organisatie." };
  if (loc.archived_at) return { error: "Deze locatie is gearchiveerd." };

  const { data, error } = await sb
    .from("shift_requests")
    .insert({
      workspace_id: ws.id, client_id: clientId, location_id: input.locationId, rule: input.rule,
      start_time: input.start, end_time: input.end, function: input.fn, activity_id: input.activityId,
      note: input.note?.trim() || null,
    })
    .select("id, location_id, rule, start_time, end_time, function, note")
    .single();
  if (error) return { error: "Aanvraag versturen mislukt." };
  const actor: Actor = { role: "opdrachtgever", name: client.name, clientId };
  await logChange(sb, { ws, actor, action: "request_created", after: data, reason: describeRule(input.rule) });
  refresh();
  return { ok: true };
}

/** Planner approves: the request becomes open shift(s), on the same path as a shift made on the planbord. */
export async function approveRequest(id: string): Promise<Result> {
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { data: r } = await sb.from("shift_requests").select("*").eq("id", id).single();
  if (!r || r.status !== "aangevraagd") return { error: "Aanvraag niet (meer) open." };
  const created = await insertShifts(sb, ws, {
    employeeId: null, locationId: r.location_id, fn: r.function, start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5),
    note: r.note, rule: r.rule as RecurrenceRule, actor: PLANNER, activityId: r.activity_id, extraRequirements: [],
  });
  if ("error" in created) return created;
  const { error } = await sb
    .from("shift_requests")
    .update({ status: "goedgekeurd", shift_ids: created.ids, decided_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "aangevraagd");
  if (error) return { error: "Goedkeuren mislukt." };
  await logChange(sb, { ws, actor: PLANNER, action: "request_approved", before: r, after: { shift_ids: created.ids } });
  refresh();
  return { ok: true, shiftIds: created.ids };
}

export async function rejectRequest(id: string, reason: string): Promise<Result> {
  if (!reason.trim()) return { error: "Geef een reden op; de opdrachtgever ziet die." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { data: r } = await sb.from("shift_requests").select("*").eq("id", id).single();
  if (!r || r.status !== "aangevraagd") return { error: "Aanvraag niet (meer) open." };
  const { error } = await sb
    .from("shift_requests")
    .update({ status: "afgewezen", reason: reason.trim(), decided_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: "Afwijzen mislukt." };
  await logChange(sb, { ws, actor: PLANNER, action: "request_rejected", before: r, reason: reason.trim() });
  refresh();
  return { ok: true };
}
