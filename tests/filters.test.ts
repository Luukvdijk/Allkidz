import { it, expect } from "vitest";
import { parseFilters, toQuery, applyFilters } from "@/lib/filters";
import { loadFixture } from "@/lib/testdata/load";
import { detectConflicts } from "@/lib/conflicts";

const data = loadFixture();
const conflictIds = new Set(detectConflicts(data).flatMap((c) => c.shiftIds));
const f = (q: string) => parseFilters(new URLSearchParams(q));

it("round-trips through the URL with defaults omitted", () => {
  const x = f("view=week&d=2026-10-21&conflicts=1&loc=TSO%20De%20Brug");
  expect(x).toMatchObject({ view: "week", date: "2026-10-21", onlyConflicts: true, onlyOpen: false, locationId: "TSO De Brug" });
  expect(toQuery(x)).toBe("view=week&d=2026-10-21&loc=TSO+De+Brug&conflicts=1");
});
it("defaults to day view on the first data day and ignores junk", () => {
  expect(f("")).toMatchObject({ view: "dag", date: "2026-10-19", q: "" });
  expect(f("view=nope&d=gisteren")).toMatchObject({ view: "dag", date: "2026-10-19" });
});
it("only conflicts gives exactly the shifts involved in a conflict (24)", () => {
  expect(conflictIds.size).toBe(24);
  expect(applyFilters(data, f("conflicts=1"), conflictIds)).toHaveLength(24);
});
it("only open gives 22", () => {
  expect(applyFilters(data, f("open=1"), conflictIds)).toHaveLength(22);
});
it("search matches location and code, case-insensitive", () => {
  const r = applyFilters(data, f("q=kompas"), conflictIds);
  expect(r.length).toBeGreaterThan(0);
  expect(r.every((s) => s.locationId.includes("Kompas"))).toBe(true);
  expect(applyFilters(data, f("q=d041"), conflictIds).map((s) => s.code)).toEqual(["D041"]);
});
it("search by employee name and 'open'", () => {
  expect(applyFilters(data, f("q=hana"), conflictIds).every((s) => s.employeeId === "Hana")).toBe(true);
  expect(applyFilters(data, f("q=open"), conflictIds).every((s) => s.employeeId === null)).toBe(true);
});
it("combines filters", () => {
  const r = applyFilters(data, f("fn=Aqualessen&open=1"), conflictIds);
  expect(r.every((s) => s.fn === "Aqualessen" && !s.employeeId)).toBe(true);
});
it("hides cancelled shifts", () => {
  const d2 = { ...data, shifts: data.shifts.map((s) => (s.code === "D001" ? { ...s, status: "cancelled" as const } : s)) };
  expect(applyFilters(d2, f("q=D001"), conflictIds)).toEqual([]);
});
