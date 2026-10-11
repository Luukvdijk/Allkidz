import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import { expandRule, describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { hasPastDate, PAST_DATE_ERROR } from "@/lib/time";
import type { Actor } from "@/lib/data/actor";
import { SHIFT_COLS, type ShiftRow } from "./_log";

const TIME = /^\d{2}:\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function validTimes(start: string, end: string): string | null {
  if (!TIME.test(start) || !TIME.test(end)) return "Vul een geldige begin- en eindtijd in.";
  if (end <= start) return "De eindtijd moet na de begintijd liggen.";
  return null;
}

async function nextCodes(sb: Supabase, n: number): Promise<string[]> {
  const { data } = await sb.from("shifts").select("code").order("code", { ascending: false }).limit(1);
  let max = Number(data?.[0]?.code?.slice(1) ?? 0);
  return Array.from({ length: n }, () => `D${String(++max).padStart(3, "0")}`);
}

export interface NewShiftInput {
  employeeId: string | null;
  locationId: string;
  fn: string;
  start: string;
  end: string;
  note: string | null;
  rule: RecurrenceRule;
  actor: Actor;
  activityId?: string | null;
  /** chosen bag; for a series only the first date gets it, the others are picked per date by the caller */
  bagIds?: (string | null)[];
  extraRequirements?: string[];
}

/** Shared by the planner form and request approval: validate, insert one shift per date (as a series), log each. */
export async function insertShifts(
  sb: Supabase,
  ws: { id: string; today: string },
  input: NewShiftInput,
): Promise<{ ids: string[]; dates: string[] } | { error: string }> {
  const timeError = validTimes(input.start, input.end);
  if (timeError) return { error: timeError };
  const dates = expandRule(input.rule);
  if (dates.length === 0) return { error: "Kies minstens één datum." };
  if (dates.length > 200) return { error: "Maximaal 200 diensten tegelijk." };
  if (!dates.every((d) => DATE.test(d))) return { error: "Ongeldige datum." };
  if (hasPastDate(dates, ws.today)) return { error: PAST_DATE_ERROR };

  let seriesId: string | null = null;
  if (dates.length > 1) {
    const { data, error } = await sb
      .from("shift_series")
      .insert({ workspace_id: ws.id, rule: input.rule, description: describeRule(input.rule) })
      .select("id")
      .single();
    if (error) return { error: "Opslaan mislukt." };
    seriesId = data.id;
  }
  const codes = await nextCodes(sb, dates.length);
  const { data: created, error } = await sb
    .from("shifts")
    .insert(
      dates.map((date, i) => ({
        workspace_id: ws.id,
        code: codes[i],
        date,
        start_time: input.start,
        end_time: input.end,
        location_id: input.locationId,
        function: input.fn,
        employee_id: input.employeeId,
        note: input.note?.trim() || null,
        series_id: seriesId,
        activity_id: input.activityId ?? null,
        bag_id: input.bagIds?.[i] ?? null,
        extra_requirements: input.extraRequirements ?? [],
      })),
    )
    .select(SHIFT_COLS);
  if (error || !created) return { error: "Opslaan mislukt." };

  const { error: logError } = await sb.from("change_log").insert(
    (created as ShiftRow[]).map((s) => ({
      workspace_id: ws.id,
      actor_role: input.actor.role,
      actor_name: input.actor.name,
      action: "shift_created",
      shift_id: s.id,
      shift_code: s.code,
      after: s,
      reason: seriesId ? describeRule(input.rule) : null,
    })),
  );
  if (logError) return { error: "Opgeslagen, maar het wijzigingslog kon niet worden bijgewerkt." };
  return { ids: (created as ShiftRow[]).map((s) => s.id), dates };
}

