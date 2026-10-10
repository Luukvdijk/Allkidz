import { describe, it, expect } from "vitest";
import { detectConflicts } from "@/lib/conflicts";
import type { PlanData, Shift } from "@/lib/types";

const base: PlanData = {
  employees: [{ id: "noor", name: "Noor", functions: ["KidzCoach"] }],
  locations: [
    { id: "A", name: "BSO A", type: "BSO", city: "Leiden" },
    { id: "B", name: "TSO B", type: "TSO", city: "Katwijk" },
  ],
  travel: [{ a: "A", b: "B", minutes: 25 }],
  unavailability: [],
  shifts: [],
};
let n = 0;
const s = (p: Partial<Shift>): Shift => ({
  id: `S${++n}`, code: `S${n}`, date: "2026-10-19", start: "08:00", end: "10:00", locationId: "A",
  fn: "KidzCoach", employeeId: "noor", status: "active", note: null, seriesId: null, ...p,
});
const run = (shifts: Shift[], extra: Partial<PlanData> = {}) => detectConflicts({ ...base, ...extra, shifts });

describe("overlap", () => {
  it("flags overlapping shifts", () => {
    const c = run([s({ id: "a" }), s({ id: "b", start: "09:00", end: "11:00" })]);
    expect(c.map((x) => x.type)).toEqual(["overlap"]);
    expect([...c[0].shiftIds].sort()).toEqual(["a", "b"]);
  });
  it("flags identical times", () => {
    expect(run([s({}), s({})]).map((x) => x.type)).toEqual(["overlap"]);
  });
  it("does not flag touching shifts on the same location", () => {
    expect(run([s({}), s({ start: "10:00", end: "12:00" })])).toEqual([]);
  });
  it("ignores open and cancelled shifts and other days", () => {
    expect(run([s({}), s({ employeeId: null })])).toEqual([]);
    expect(run([s({}), s({ status: "cancelled" })])).toEqual([]);
    expect(run([s({}), s({ date: "2026-10-20" })])).toEqual([]);
  });
});

describe("travel", () => {
  it("flags a gap shorter than travel time", () => {
    const c = run([s({}), s({ locationId: "B", start: "10:10", end: "12:00" })]);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("travel");
    expect(c[0].message).toContain("10 min");
    expect(c[0].message).toContain("25 min");
  });
  it("accepts a gap exactly equal to travel time", () => {
    expect(run([s({}), s({ locationId: "B", start: "10:25", end: "12:00" })])).toEqual([]);
  });
  it("is symmetric in direction", () => {
    expect(run([s({ locationId: "B" }), s({ locationId: "A", start: "10:10", end: "12:00" })])).toHaveLength(1);
  });
  it("does not report travel on top of an overlap for the same pair", () => {
    const c = run([s({}), s({ locationId: "B", start: "09:00", end: "11:00" })]);
    expect(c.map((x) => x.type)).toEqual(["overlap"]);
  });
});

describe("unavailable", () => {
  const un = (from: string, to: string) => ({
    unavailability: [{ id: "u", employeeId: "noor", date: "2026-10-19", from, to, reason: "Tandarts" }],
  });
  it("flags a partial overlap with unavailability", () => {
    const c = run([s({})], un("09:30", "13:00"));
    expect(c[0].type).toBe("unavailable");
    expect(c[0].message).toContain("Tandarts");
  });
  it("does not flag when unavailability starts exactly at shift end", () => {
    expect(run([s({})], un("10:00", "23:59"))).toEqual([]);
  });
  it("does not flag when unavailability ends exactly at shift start", () => {
    expect(run([s({ start: "12:30", end: "14:00" })], un("00:00", "12:30"))).toEqual([]);
  });
  it("whole day 00:00-23:59 flags any shift", () => {
    const c = run([s({ start: "18:00", end: "20:00" })], un("00:00", "23:59"));
    expect(c).toHaveLength(1);
    expect(c[0].message).toContain("hele dag");
  });
});

describe("function", () => {
  it("flags a shift whose function the employee does not have", () => {
    const c = run([s({ fn: "Gymdocent" })]);
    expect(c[0].type).toBe("function");
    expect(c[0].message).toContain("Gymdocent");
  });
});
