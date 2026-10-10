import type { PlanData, Shift } from "@/lib/types";

export type View = "dag" | "lijst" | "week" | "maand";

export interface Filters {
  view: View;
  date: string;
  q: string;
  employeeId?: string;
  locationId?: string;
  fn?: string;
  onlyConflicts: boolean;
  onlyOpen: boolean;
}

/** First day of the supplied test data. */
export const DEFAULT_DATE = "2026-10-19";
const VIEWS: View[] = ["dag", "lijst", "week", "maand"];
const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseFilters(sp: URLSearchParams): Filters {
  const view = sp.get("view") as View;
  const d = sp.get("d") ?? "";
  return {
    view: VIEWS.includes(view) ? view : "dag",
    date: ISO.test(d) ? d : DEFAULT_DATE,
    q: sp.get("q") ?? "",
    employeeId: sp.get("emp") || undefined,
    locationId: sp.get("loc") || undefined,
    fn: sp.get("fn") || undefined,
    onlyConflicts: sp.get("conflicts") === "1",
    onlyOpen: sp.get("open") === "1",
  };
}

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.view !== "dag") p.set("view", f.view);
  if (f.date !== DEFAULT_DATE) p.set("d", f.date);
  if (f.q) p.set("q", f.q);
  if (f.employeeId) p.set("emp", f.employeeId);
  if (f.locationId) p.set("loc", f.locationId);
  if (f.fn) p.set("fn", f.fn);
  if (f.onlyConflicts) p.set("conflicts", "1");
  if (f.onlyOpen) p.set("open", "1");
  return p.toString();
}

export const hasActiveFilters = (f: Filters) =>
  Boolean(f.q || f.employeeId || f.locationId || f.fn || f.onlyConflicts || f.onlyOpen);

/** Applies every filter except the date scope; each view scopes dates itself. Cancelled shifts are never shown. */
export function applyFilters(data: PlanData, f: Filters, conflictIds: Set<string>): Shift[] {
  const emp = new Map(data.employees.map((e) => [e.id, e.name]));
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const q = f.q.trim().toLowerCase();
  return data.shifts.filter((s) => {
    if (s.status !== "active") return false;
    if (f.employeeId && s.employeeId !== f.employeeId) return false;
    if (f.locationId && s.locationId !== f.locationId) return false;
    if (f.fn && s.fn !== f.fn) return false;
    if (f.onlyConflicts && !conflictIds.has(s.id)) return false;
    if (f.onlyOpen && s.employeeId) return false;
    if (q) {
      const who = s.employeeId ? emp.get(s.employeeId) : "open";
      const hay = `${s.code} ${who} ${loc.get(s.locationId)} ${s.fn}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
