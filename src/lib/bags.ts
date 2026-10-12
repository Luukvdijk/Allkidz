import type { MissingReport, PlanData, Shift } from "@/lib/types";
import { toMin } from "@/lib/time";

export interface BagDouble {
  bagId: string;
  date: string;
  shiftIds: string[];
}

const holds = (s: Shift) => s.status === "active" && s.employeeId && s.bagId;

/** A bag goes home with the coach for the day: the same bag with two different coaches on one day is a double booking. */
export function bagDoubles(shifts: Shift[]): BagDouble[] {
  const groups = new Map<string, Shift[]>();
  for (const s of shifts) {
    if (!holds(s)) continue;
    const k = `${s.date}|${s.bagId}`;
    const list = groups.get(k);
    if (list) list.push(s);
    else groups.set(k, [s]);
  }
  const out: BagDouble[] = [];
  for (const [k, list] of groups) {
    if (new Set(list.map((s) => s.employeeId)).size < 2) continue;
    const [date, bagId] = k.split("|");
    out.push({ bagId, date, shiftIds: list.map((s) => s.id) });
  }
  return out;
}

/** Open reports of something missing from this bag. */
export function missingFor(bagId: string | null | undefined, data: PlanData): MissingReport[] {
  return bagId ? (data.missing ?? []).filter((m) => m.bagId === bagId) : [];
}

/** A bag of the activity that no other coach holds on that date, preferring one with nothing missing; null when none is free. */
export function pickBag(activityId: string, date: string, employeeId: string | null, data: PlanData, ignoreShiftId?: string): string | null {
  const taken = new Set(
    data.shifts
      .filter((s) => s.id !== ignoreShiftId && s.date === date && holds(s) && s.employeeId !== employeeId)
      .map((s) => s.bagId),
  );
  const free = (data.bags ?? []).filter((b) => b.activityId === activityId && !taken.has(b.id));
  return (free.find((b) => missingFor(b.id, data).length === 0) ?? free[0])?.id ?? null;
}

export interface BagDayUse {
  bagId: string;
  /** shifts that use the bag that day, in time order (open shifts included) */
  shifts: Shift[];
  /** per coach: the bag is with them from their first to their last shift with it */
  spans: { employeeId: string; from: string; to: string }[];
  double: boolean;
}

/** What every bag does on one day, free bags included, in the order of `data.bags`. */
export function bagDay(data: PlanData, date: string): BagDayUse[] {
  const today = data.shifts
    .filter((s) => s.status === "active" && s.bagId && s.date === date)
    .sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
  return (data.bags ?? []).map((b) => {
    const shifts = today.filter((s) => s.bagId === b.id);
    const spans = new Map<string, { employeeId: string; from: string; to: string }>();
    for (const s of shifts) {
      if (!s.employeeId) continue;
      const cur = spans.get(s.employeeId);
      if (!cur) spans.set(s.employeeId, { employeeId: s.employeeId, from: s.start, to: s.end });
      else if (toMin(s.end) > toMin(cur.to)) cur.to = s.end;
    }
    return { bagId: b.id, shifts, spans: [...spans.values()], double: spans.size > 1 };
  });
}

/** Per date: how many bags are out and how many of them are double booked. Dates without bag use are absent. */
export function bagMonth(shifts: Shift[]): Map<string, { inUse: number; doubles: number }> {
  const used = new Map<string, Set<string>>();
  for (const s of shifts) {
    if (s.status !== "active" || !s.bagId) continue;
    (used.get(s.date) ?? used.set(s.date, new Set()).get(s.date)!).add(s.bagId);
  }
  const doubles = new Map<string, number>();
  for (const d of bagDoubles(shifts)) doubles.set(d.date, (doubles.get(d.date) ?? 0) + 1);
  return new Map([...used].map(([date, bags]) => [date, { inUse: bags.size, doubles: doubles.get(date) ?? 0 }]));
}
