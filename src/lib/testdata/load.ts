import raw from "./testdata.json";
import extra from "./aanvullende-testdata.json";
import type { PlanData } from "@/lib/types";

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * The supplied fictional test data as PlanData. Ids are names and shift codes, so tests read naturally.
 * With `extended`, the self-made extra data (licences, clients, activities, bags) is merged in.
 */
export function loadFixture({ extended = false }: { extended?: boolean } = {}): PlanData {
  const base: PlanData = {
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
  if (!extended) return base;

  const clientOf = new Map(extra.clients.flatMap((c) => c.locations.map((l) => [l, slug(c.name)] as const)));
  const extras = new Map(extra.shiftExtras.map((x) => [x.code, x]));
  const activityId = (name: string | null) => (name ? slug(name) : null);
  return {
    ...base,
    locations: base.locations.map((l) => ({ ...l, clientId: clientOf.get(l.name) ?? null, archived: false })),
    shifts: base.shifts.map((s) => {
      const x = extras.get(s.code);
      return x
        ? { ...s, activityId: activityId(x.activity), bagId: x.bag ? slug(x.bag) : null, extraRequirements: x.extraRequirements }
        : s;
    }),
    licences: extra.employeeLicences.map((l) => ({ employeeId: l.employee, type: l.type, expiresOn: l.expiresOn })),
    requirements: extra.requirementsByLocationType,
    clients: extra.clients.map((c) => ({ id: slug(c.name), name: c.name })),
    activities: extra.activities.map((a) => ({ id: slug(a.name), name: a.name, packingList: a.packingList })),
    bags: extra.bags.map((b) => ({ id: slug(b.label), activityId: slug(b.activity), label: b.label })),
  };
}
