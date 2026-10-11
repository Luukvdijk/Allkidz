import type { MissingReport, PlanData, Shift } from "@/lib/types";

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
