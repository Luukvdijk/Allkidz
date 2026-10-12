import type { PlanData, Shift } from "@/lib/types";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { durationMin } from "@/lib/hours";
import { mondayOf } from "@/lib/time";

export interface Candidate {
  employeeId: string;
  name: string;
  weekMinutes: number;
  dayShifts: number;
}

/**
 * Who can take an open shift: right function, available, no overlap and enough travel time
 * (the same conflict engine as everywhere else). Fewest planned hours that week first, to spread the work.
 * Also used to fix a conflict: for a shift that already has someone, it suggests who could take it over.
 */
export function rankCandidates(data: PlanData, shift: Shift): Candidate[] {
  const week = mondayOf(shift.date);
  return data.employees
    .filter((e) => e.id !== shift.employeeId && e.functions.includes(shift.fn))
    .filter((e) => conflictsIfAssigned(data, shift, e.id).length === 0)
    .map((e) => {
      const mine = data.shifts.filter((s) => s.employeeId === e.id && s.status === "active");
      return {
        employeeId: e.id,
        name: e.name,
        weekMinutes: mine.filter((s) => mondayOf(s.date) === week).reduce((t, s) => t + durationMin(s), 0),
        dayShifts: mine.filter((s) => s.date === shift.date).length,
      };
    })
    .sort((a, b) => a.weekMinutes - b.weekMinutes || a.name.localeCompare(b.name));
}
