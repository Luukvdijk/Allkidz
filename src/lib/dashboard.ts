import type { Conflict, PlanData, Shift } from "@/lib/types";
import { addDays, mondayOf, toMin, weekday } from "@/lib/time";
import { durationMin } from "@/lib/hours";
import { bagDoubles } from "@/lib/bags";
import { licenceStatus } from "@/lib/licences";

export interface DayLoad {
  date: string;
  total: number;
  open: number;
  conflicted: number;
}

export interface Workload {
  employeeId: string;
  minutes: number;
  shifts: number;
}

export interface DashboardStats {
  from: string;
  to: string;
  shifts: number;
  filled: number;
  open: number;
  conflicted: number;
  minutes: number;
  /** every weekday (Mon-Fri) in the period */
  days: DayLoad[];
  /** open shifts from today on, soonest first */
  openSoon: Shift[];
  /** conflicts from today on within the period, by date */
  conflicts: Conflict[];
  /** every employee with their planned time in the period, most first */
  workload: Workload[];
  /** per client: shifts in the period and how many are still open, most open first */
  clients: { clientId: string; shifts: number; open: number }[];
  /** licences that are expired or expire within 30 days, soonest first */
  licences: { employeeId: string; type: string; expiresOn: string; expired: boolean }[];
  bagDoubles: number;
  /** first date from today with a bag double, to open the bag page there */
  firstBagDouble: string | null;
}

const byStart = (a: Shift, b: Shift) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start);

/** Everything the dashboard shows, for this week and the next (Monday of today's week up to two weeks later). */
export function dashboardStats(data: PlanData, today: string, conflicts: Conflict[]): DashboardStats {
  const from = mondayOf(today);
  const to = addDays(from, 13);
  const inPeriod = data.shifts.filter((s) => s.status === "active" && s.date >= from && s.date <= to);
  const conflictedIds = new Set(conflicts.flatMap((c) => c.shiftIds));

  const days = Array.from({ length: 14 }, (_, i) => addDays(from, i))
    .filter((d) => weekday(d) <= 5)
    .map((date) => {
      const list = inPeriod.filter((s) => s.date === date);
      return { date, total: list.length, open: list.filter((s) => !s.employeeId).length, conflicted: list.filter((s) => conflictedIds.has(s.id)).length };
    });

  const work = new Map<string, Workload>(data.employees.map((e) => [e.id, { employeeId: e.id, minutes: 0, shifts: 0 }]));
  for (const s of inPeriod) {
    const w = s.employeeId ? work.get(s.employeeId) : undefined;
    if (!w) continue;
    w.minutes += durationMin(s);
    w.shifts += 1;
  }

  const clientOf = new Map(data.locations.map((l) => [l.id, l.clientId ?? null]));
  const clients = new Map<string, { clientId: string; shifts: number; open: number }>();
  for (const s of inPeriod) {
    const c = clientOf.get(s.locationId);
    if (!c) continue;
    const row = clients.get(c) ?? clients.set(c, { clientId: c, shifts: 0, open: 0 }).get(c)!;
    row.shifts += 1;
    if (!s.employeeId) row.open += 1;
  }

  const licences = (data.licences ?? [])
    .map((l) => ({ l, status: licenceStatus(l, today) }))
    .filter(({ l, status }) => l.expiresOn && status !== "ok")
    .map(({ l, status }) => ({ employeeId: l.employeeId, type: l.type, expiresOn: l.expiresOn!, expired: status === "expired" }))
    .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn));

  return {
    from,
    to,
    shifts: inPeriod.length,
    filled: inPeriod.filter((s) => s.employeeId).length,
    open: inPeriod.filter((s) => !s.employeeId).length,
    conflicted: inPeriod.filter((s) => conflictedIds.has(s.id)).length,
    minutes: inPeriod.reduce((t, s) => t + durationMin(s), 0),
    days,
    openSoon: inPeriod.filter((s) => !s.employeeId && s.date >= today).sort(byStart),
    conflicts: conflicts.filter((c) => c.date >= today && c.date <= to).sort((a, b) => a.date.localeCompare(b.date)),
    workload: [...work.values()].sort((a, b) => b.minutes - a.minutes),
    clients: [...clients.values()].sort((a, b) => b.open - a.open || b.shifts - a.shifts),
    licences,
    bagDoubles: bagDoubles(inPeriod).length,
    firstBagDouble: bagDoubles(inPeriod).map((d) => d.date).filter((d) => d >= today).sort()[0] ?? null,
  };
}
