import type { Conflict, PlanData, Shift, Unavailability } from "@/lib/types";
import { dayMonth, toMin } from "@/lib/time";
import { licenceProblems, requiredLicences } from "@/lib/licences";
import { bagDoubles } from "@/lib/bags";
import { travelLookup } from "./travel";

function push<K, V>(m: Map<K, V[]>, k: K, v: V) {
  const list = m.get(k);
  if (list) list.push(v);
  else m.set(k, [v]);
}

const byStart = (a: Shift, b: Shift) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end);

/** Active, assigned shifts grouped per "employeeId|date", sorted by start time. */
export function groupByEmployeeDay(shifts: Shift[]): Map<string, Shift[]> {
  const g = new Map<string, Shift[]>();
  for (const s of shifts) if (s.employeeId && s.status === "active") push(g, `${s.employeeId}|${s.date}`, s);
  for (const list of g.values()) list.sort(byStart);
  return g;
}

/**
 * Finds every planning conflict. Open shifts (no employee) and cancelled shifts never conflict.
 * Boundaries are exclusive: a shift ending at 10:00 and one starting at 10:00 do not overlap,
 * and a gap exactly equal to the travel time is fine.
 */
export function detectConflicts(data: PlanData): Conflict[] {
  const out: Conflict[] = [];
  const locName = new Map(data.locations.map((l) => [l.id, l.name]));
  const employees = new Map(data.employees.map((e) => [e.id, e]));
  const travel = travelLookup(data.travel);
  const unavailable = new Map<string, Unavailability[]>();
  for (const u of data.unavailability) push(unavailable, `${u.employeeId}|${u.date}`, u);

  for (const [key, list] of groupByEmployeeDay(data.shifts)) {
    const [employeeId, date] = key.split("|");

    // Overlap: every pair, since a long shift can overlap several later ones.
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (toMin(b.start) < toMin(a.end) && toMin(a.start) < toMin(b.end))
          out.push({
            type: "overlap", employeeId, date, shiftIds: [a.id, b.id],
            message: `${a.code} (${a.start}-${a.end}) overlapt met ${b.code} (${b.start}-${b.end})`,
          });
      }

    // Travel: consecutive shifts that do not overlap.
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i], b = list[i + 1];
      const gap = toMin(b.start) - toMin(a.end);
      if (gap < 0) continue;
      const need = travel(a.locationId, b.locationId);
      if (need !== null && gap < need)
        out.push({
          type: "travel", employeeId, date, shiftIds: [a.id, b.id],
          message: `Te weinig reistijd: ${gap} min tussen ${locName.get(a.locationId)} en ${locName.get(b.locationId)}, nodig ${need} min`,
        });
    }

    // Unavailable and wrong function: per shift.
    const employee = employees.get(employeeId);
    for (const s of list) {
      for (const u of unavailable.get(key) ?? [])
        if (toMin(s.start) < toMin(u.to) && toMin(u.from) < toMin(s.end))
          out.push({
            type: "unavailable", employeeId, date, shiftIds: [s.id],
            message: u.from === "00:00" && toMin(u.to) === 1440
              ? `Niet beschikbaar (hele dag): ${u.reason}`
              : `Niet beschikbaar ${u.from}-${u.to}: ${u.reason}`,
          });
      if (employee && !employee.functions.includes(s.fn))
        out.push({
          type: "function", employeeId, date, shiftIds: [s.id],
          message: `${employee.name} heeft geen functie ${s.fn} (wel: ${employee.functions.join(", ")})`,
        });
    }
  }
  out.push(...extensionConflicts(data));
  return out;
}

/** Licence and bag conflicts. Only active when the extension data (requirements, bags) is present. */
function extensionConflicts(data: PlanData): Conflict[] {
  const out: Conflict[] = [];
  if (data.requirements) {
    const locations = new Map(data.locations.map((l) => [l.id, l]));
    const licences = data.licences ?? [];
    for (const s of data.shifts) {
      if (!s.employeeId || s.status !== "active") continue;
      const loc = locations.get(s.locationId);
      if (!loc) continue;
      const byType = new Set(data.requirements[loc.type] ?? []);
      for (const p of licenceProblems(s, licences, requiredLicences(s, loc.type, data.requirements))) {
        out.push({
          type: "licence", employeeId: s.employeeId, date: s.date, shiftIds: [s.id],
          message: p.kind === "expired"
            ? `${p.type} verlopen op ${dayMonth(p.expiresOn!)}`
            : `Mist ${p.type} (${byType.has(p.type) ? `vereist op ${loc.type}` : "extra eis voor deze dienst"})`,
        });
      }
    }
  }
  if (data.bags?.length) {
    const label = new Map(data.bags.map((b) => [b.id, b.label]));
    const byId = new Map(data.shifts.map((s) => [s.id, s]));
    const name = new Map(data.employees.map((e) => [e.id, e.name]));
    for (const d of bagDoubles(data.shifts)) {
      const list = d.shiftIds.map((id) => byId.get(id)!);
      out.push({
        type: "bag", employeeId: list[0].employeeId!, date: d.date, shiftIds: d.shiftIds,
        message: `${label.get(d.bagId)} is die dag bij meerdere coaches: ${list.map((s) => `${name.get(s.employeeId!)} (${s.code})`).join(" en ")}`,
      });
    }
  }
  return out;
}

export function conflictsByShift(conflicts: Conflict[]): Map<string, Conflict[]> {
  const m = new Map<string, Conflict[]>();
  for (const c of conflicts) for (const id of c.shiftIds) push(m, id, c);
  return m;
}
