import type { PlanData, Shift } from "@/lib/types";
import { toMin } from "@/lib/time";
import { travelLookup } from "./travel";

/** ok: enough time; krap: exactly the travel time (valid, but tight); te-krap: too little; overlap: shifts overlap */
export type GapStatus = "ok" | "krap" | "te-krap" | "overlap";

export interface Gap {
  fromShiftId: string;
  toShiftId: string;
  gap: number;
  need: number | null;
  status: GapStatus;
}

export interface DayTimeline {
  shifts: Shift[];
  gaps: Gap[];
}

/** One employee's day in time order, with the transfer between each pair of consecutive shifts. */
export function buildDayTimeline(data: PlanData, employeeId: string, date: string): DayTimeline {
  const shifts = data.shifts
    .filter((s) => s.employeeId === employeeId && s.date === date && s.status === "active")
    .sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
  const travel = travelLookup(data.travel);
  const gaps: Gap[] = [];
  for (let i = 0; i + 1 < shifts.length; i++) {
    const a = shifts[i], b = shifts[i + 1];
    const gap = toMin(b.start) - toMin(a.end);
    const need = travel(a.locationId, b.locationId);
    let status: GapStatus = "ok";
    if (gap < 0) status = "overlap";
    else if (need !== null && gap < need) status = "te-krap";
    else if (need !== null && need > 0 && gap === need) status = "krap";
    gaps.push({ fromShiftId: a.id, toShiftId: b.id, gap, need, status });
  }
  return { shifts, gaps };
}
