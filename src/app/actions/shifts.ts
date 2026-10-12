"use server";

import { refresh } from "next/cache";
import { supabaseServer, type Supabase } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import type { Actor } from "@/lib/data/actor";
import { SHIFT_COLS, employeeName, logChange, notifyClientIfShortNotice, type ShiftRow } from "./_log";
import { insertShifts, validTimes, type NewShiftInput } from "./_insert";
import { PAST_DATE_ERROR } from "@/lib/time";

export type { NewShiftInput };

export type ActionResult = { ok: true; notified?: boolean; firstDate?: string } | { error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const now = () => new Date().toISOString();


async function getShift(sb: Supabase, id: string) {
  const { data } = await sb.from("shifts").select(SHIFT_COLS).eq("id", id).single();
  return data as ShiftRow | null;
}

export async function createShifts(input: NewShiftInput): Promise<ActionResult> {
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const r = await insertShifts(sb, ws, input);
  if ("error" in r) return r;
  refresh();
  return { ok: true, firstDate: r.dates[0] };
}

export interface ShiftPatch {
  employeeId: string | null;
  locationId: string;
  fn: string;
  date: string;
  start: string;
  end: string;
  note: string | null;
  activityId?: string | null;
  bagId?: string | null;
  extraRequirements?: string[];
}

function describeChanges(a: ShiftRow, b: ShiftRow): string {
  const t = (s: ShiftRow) => `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`;
  const parts: string[] = [];
  if (a.date !== b.date) parts.push(`Datum: ${a.date} wordt ${b.date}.`);
  if (t(a) !== t(b)) parts.push(`Tijd: ${t(a)} wordt ${t(b)}.`);
  if (a.location_id !== b.location_id) parts.push("De dienst is naar een andere locatie verplaatst.");
  if (a.employee_id !== b.employee_id)
    parts.push(b.employee_id ? "Er is een andere medewerker ingepland." : "De medewerker is van de dienst gehaald.");
  return parts.join(" ");
}

export async function updateShift(id: string, patch: ShiftPatch, actor: Actor): Promise<ActionResult> {
  const timeError = validTimes(patch.start, patch.end);
  if (timeError) return { error: timeError };
  if (!DATE.test(patch.date)) return { error: "Ongeldige datum." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const before = await getShift(sb, id);
  if (!before || before.status !== "active") return { error: "Dienst niet gevonden." };
  // A shift that already lies in the past may keep its date (to fix a note), but nothing moves into the past.
  if (patch.date !== before.date && patch.date < ws.today) return { error: PAST_DATE_ERROR };
  const { data, error } = await sb
    .from("shifts")
    .update({
      employee_id: patch.employeeId,
      location_id: patch.locationId,
      function: patch.fn,
      date: patch.date,
      start_time: patch.start,
      end_time: patch.end,
      note: patch.note?.trim() || null,
      activity_id: patch.activityId ?? null,
      bag_id: patch.bagId ?? null,
      extra_requirements: patch.extraRequirements ?? [],
      updated_at: now(),
    })
    .eq("id", id)
    .select(SHIFT_COLS)
    .single();
  if (error || !data) return { error: "Opslaan mislukt." };
  const after = data as ShiftRow;
  const changes = describeChanges(before, after);
  // A change of only the bag is logged as such; it does not concern the client.
  const onlyBag = !changes && (before.bag_id ?? null) !== (after.bag_id ?? null);
  const logId = await logChange(sb, { ws, actor, action: onlyBag ? "bag_changed" : "shift_updated", shift: after, before, after });
  // Notify when the earliest of the old and new date falls within the notice period.
  const earliest = before.date < after.date ? before.date : after.date;
  const notified = changes
    ? await notifyClientIfShortNotice(sb, {
        ws,
        logId,
        action: "shift_updated",
        shift: { ...after, date: earliest },
        employeeName: await employeeName(sb, after.employee_id),
        changes,
      })
    : false;
  refresh();
  return { ok: true, notified };
}

export async function cancelShift(id: string, reason: string, actor: Actor): Promise<ActionResult> {
  if (!reason.trim()) return { error: "Geef een reden op." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const before = await getShift(sb, id);
  if (!before || before.status !== "active") return { error: "Dienst niet gevonden." };
  const { data, error } = await sb
    .from("shifts")
    .update({ status: "cancelled", updated_at: now() })
    .eq("id", id)
    .select(SHIFT_COLS)
    .single();
  if (error || !data) return { error: "Annuleren mislukt." };
  const logId = await logChange(sb, {
    ws, actor, action: "shift_cancelled", shift: data as ShiftRow, before, after: data, reason,
  });
  const notified = await notifyClientIfShortNotice(sb, {
    ws, logId, action: "shift_cancelled", shift: before, employeeName: null,
  });
  refresh();
  return { ok: true, notified };
}

/** Planner removes an employee (self = false) or the employee cancels (self = true). The shift becomes open. */
export async function removeEmployee(id: string, reason: string, actor: Actor, self = false): Promise<ActionResult> {
  if (!reason.trim()) return { error: "Geef een reden op." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const before = await getShift(sb, id);
  if (!before || before.status !== "active" || !before.employee_id) return { error: "Er staat niemand op deze dienst." };
  if (self && (actor.role !== "medewerker" || actor.employeeId !== before.employee_id))
    return { error: "Dit is niet jouw dienst." };
  const name = await employeeName(sb, before.employee_id);
  const { data, error } = await sb
    .from("shifts")
    .update({ employee_id: null, updated_at: now() })
    .eq("id", id)
    .select(SHIFT_COLS)
    .single();
  if (error || !data) return { error: "Opslaan mislukt." };
  const action = self ? "employee_cancelled_self" : "employee_removed";
  const logId = await logChange(sb, { ws, actor, action, shift: data as ShiftRow, before, after: data, reason });
  const notified = await notifyClientIfShortNotice(sb, { ws, logId, action, shift: before, employeeName: name });
  refresh();
  return { ok: true, notified };
}

/**
 * Puts an employee on a shift. Normally the shift must be open; with `replacing` the planner hands a shift
 * (usually one with a conflict) from that employee to another, and only if it still belongs to them.
 */
export async function assignEmployee(id: string, employeeId: string, actor: Actor, replacing?: string): Promise<ActionResult> {
  if (replacing && actor.role !== "planner") return { error: "Alleen de planner kan een dienst overdragen." };
  if (replacing === employeeId) return { error: "Kies een andere medewerker." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const before = await getShift(sb, id);
  if (!before || before.status !== "active") return { error: "Dienst niet gevonden." };
  if ((before.employee_id ?? undefined) !== replacing) return { error: replacing ? "Deze dienst is intussen gewijzigd." : "Deze dienst is al ingevuld." };
  const { data: emp } = await sb.from("employees").select("name, functions").eq("id", employeeId).single();
  if (!emp) return { error: "Medewerker niet gevonden." };
  if (actor.role === "medewerker" && (actor.employeeId !== employeeId || !emp.functions.includes(before.function)))
    return { error: "Deze dienst past niet bij je functie." };
  // Only succeeds while the shift is still as we saw it (open, or still with `replacing`),
  // so two people cannot take the same shift and a hand-over never overwrites someone else's change.
  const base = sb.from("shifts").update({ employee_id: employeeId, updated_at: now() }).eq("id", id);
  const { data, error } = await (replacing ? base.eq("employee_id", replacing) : base.is("employee_id", null))
    .select(SHIFT_COLS)
    .maybeSingle();
  if (error || !data) return { error: replacing ? "Deze dienst is intussen gewijzigd." : "Iemand anders was je net voor." };
  const action = actor.role === "medewerker" ? "open_shift_accepted" : "employee_assigned";
  const previous = replacing ? await employeeName(sb, replacing) : null;
  const reason = replacing ? `Overgenomen van ${previous ?? "een collega"} om een conflict op te lossen` : undefined;
  const logId = await logChange(sb, { ws, actor, action, shift: data as ShiftRow, before, after: data, reason });
  const notified = await notifyClientIfShortNotice(sb, {
    ws, logId, action: "employee_assigned", shift: data as ShiftRow, employeeName: emp.name,
  });
  refresh();
  return { ok: true, notified };
}
