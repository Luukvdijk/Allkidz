import raw from "./testdata.json";
import type { PlanData } from "@/lib/types";

/** The supplied fictional test data as PlanData. Ids are names and shift codes, so tests read naturally. */
export function loadFixture(): PlanData {
  return {
    employees: raw.employees.map((e) => ({ id: e.name, name: e.name, functions: e.functions })),
    locations: raw.locations.map((l) => ({ id: l.name, name: l.name, type: l.type, city: l.city })),
    travel: raw.travel.map((t) => ({ a: t.a, b: t.b, minutes: t.minutes })),
    unavailability: raw.unavailability.map((u, i) => ({
      id: `U${i + 1}`, employeeId: u.employee, date: u.date, from: u.from, to: u.to, reason: u.reason,
    })),
    shifts: raw.shifts.map((s) => ({
      id: s.code, code: s.code, date: s.date, start: s.start, end: s.end, locationId: s.location,
      fn: s.function, employeeId: s.employee, status: "active" as const, note: s.note, seriesId: null,
    })),
  };
}
