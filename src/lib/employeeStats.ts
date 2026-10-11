import type { Conflict, PlanData, Shift } from "@/lib/types";
import { addDays, mondayOf } from "@/lib/time";
import { totalMinutes } from "@/lib/hours";

export interface WeekLoad {
  monday: string;
  minutes: number;
  shifts: number;
}

export interface EmployeeStats {
  /** active shifts from today on, by date and start time */
  upcoming: Shift[];
  thisWeek: WeekLoad;
  /** today's week and the five after it, also weeks without shifts */
  weeks: WeekLoad[];
  /** upcoming shifts that have at least one conflict */
  conflictedUpcoming: number;
  /** conflicts on upcoming dates, for this employee */
  conflicts: Conflict[];
  /** where this employee works, most shifts first */
  locations: { locationId: string; shifts: number }[];
  /** open shifts from today that match one of the employee's functions */
  matchingOpen: number;
}

/** Everything the planner's employee page shows, computed from the loaded workspace. */
export function employeeStats(data: PlanData, employeeId: string, today: string, conflicts: Conflict[]): EmployeeStats {
  const employee = data.employees.find((e) => e.id === employeeId);
  const mine = data.shifts.filter((s) => s.employeeId === employeeId && s.status === "active");
  const upcoming = mine.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));

  const first = mondayOf(today);
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const monday = addDays(first, i * 7);
    const sunday = addDays(monday, 6);
    const inWeek = mine.filter((s) => s.date >= monday && s.date <= sunday);
    return { monday, minutes: totalMinutes(inWeek), shifts: inWeek.length };
  });

  const own = conflicts.filter((c) => c.employeeId === employeeId && c.date >= today);
  const conflictedIds = new Set(own.flatMap((c) => c.shiftIds));

  const perLocation = new Map<string, number>();
  for (const s of mine) perLocation.set(s.locationId, (perLocation.get(s.locationId) ?? 0) + 1);

  const fns = new Set(employee?.functions ?? []);
  return {
    upcoming,
    thisWeek: weeks[0],
    weeks,
    conflictedUpcoming: upcoming.filter((s) => conflictedIds.has(s.id)).length,
    conflicts: own,
    locations: [...perLocation].map(([locationId, shifts]) => ({ locationId, shifts })).sort((a, b) => b.shifts - a.shifts),
    matchingOpen: data.shifts.filter((s) => !s.employeeId && s.status === "active" && s.date >= today && fns.has(s.fn)).length,
  };
}
