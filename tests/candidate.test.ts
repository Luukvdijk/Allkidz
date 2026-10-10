import { it, expect } from "vitest";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const data = loadFixture();
const D010 = data.shifts.find((s) => s.id === "D010")!; // open, Fri TSO Het Kompas 12:00-13:15

it("fixture assumptions hold", () => {
  expect(D010).toMatchObject({ employeeId: null, date: "2026-10-23", start: "12:00", end: "13:15" });
  expect(data.shifts.find((s) => s.id === "D041")).toMatchObject({ employeeId: "Hana", date: "2026-10-23", start: "12:00" });
});

it("reports conflicts for a hypothetical assignment without mutating data", () => {
  const before = JSON.stringify(data);
  const c = conflictsIfAssigned(data, D010, "Hana");
  expect(c.some((x) => x.type === "overlap")).toBe(true);
  expect(JSON.stringify(data)).toBe(before);
});

it("reports a function mismatch", () => {
  expect(conflictsIfAssigned(data, D010, "Jayden").map((c) => c.type)).toContain("function");
});

it("returns no conflicts for a free employee with the right function", () => {
  const busy = new Set(data.shifts.filter((s) => s.date === D010.date && s.employeeId).map((s) => s.employeeId));
  const free = data.employees.find((e) => e.functions.includes("KidzCoach") && !busy.has(e.id))!;
  expect(free).toBeDefined();
  expect(conflictsIfAssigned(data, D010, free.id)).toEqual([]);
});

it("sees a bag held by another coach that day and missing licences (extended data)", () => {
  const ext = loadFixture({ extended: true });
  const probe = { ...ext.shifts.find((s) => s.id === "D010")!, date: "2026-10-20", activityId: "jachtseizoen", bagId: "jachtseizoen-tas-1" };
  const types = conflictsIfAssigned(ext, probe, "Liv").map((c) => c.type); // Emma holds tas 1 on Tuesday
  expect(types).toContain("bag");
  const kdv = ext.shifts.find((s) => s.id === "D099")!; // open, KDV De Pluimpjes
  expect(conflictsIfAssigned(ext, kdv, "Hana").map((c) => c.type)).toContain("licence");
});
