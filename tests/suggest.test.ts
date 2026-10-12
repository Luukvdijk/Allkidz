import { it, expect } from "vitest";
import { rankCandidates } from "@/lib/suggest";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const data = loadFixture();
const D010 = data.shifts.find((s) => s.id === "D010")!; // open, Fri TSO Het Kompas 12:00-13:15, KidzCoach

it("only suggests employees with the right function and no conflict", () => {
  const r = rankCandidates(data, D010);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) {
    expect(data.employees.find((e) => e.id === c.employeeId)!.functions).toContain("KidzCoach");
    expect(conflictsIfAssigned(data, D010, c.employeeId)).toEqual([]);
  }
  expect(r.map((c) => c.employeeId)).not.toContain("Hana"); // works TSO De Brug at the same time
  expect(r.map((c) => c.employeeId)).not.toContain("Senna"); // unavailable all Friday
});

it("ranks the fewest planned hours that week first", () => {
  const r = rankCandidates(data, D010);
  for (let i = 1; i < r.length; i++) expect(r[i - 1].weekMinutes).toBeLessThanOrEqual(r[i].weekMinutes);
});

it("suggests nobody for a function nobody free has", () => {
  const gym = data.shifts.find((s) => s.id === "D006")!; // open Gymdocent Fri 13:00-15:00
  for (const c of rankCandidates(data, gym)) expect(data.employees.find((e) => e.id === c.employeeId)!.functions).toContain("Gymdocent");
});

it("suggests a replacement for a shift that has a conflict, never the current employee", () => {
  const d105 = data.shifts.find((s) => s.id === "D105")!; // Tom, Mon 08:00-12:00, overlaps his D176
  expect(d105.employeeId).toBe("Tom");
  const r = rankCandidates(data, d105);
  expect(r.length).toBeGreaterThan(0);
  expect(r.map((c) => c.employeeId)).not.toContain("Tom");
  for (const c of r) expect(conflictsIfAssigned(data, d105, c.employeeId)).toEqual([]);
});
