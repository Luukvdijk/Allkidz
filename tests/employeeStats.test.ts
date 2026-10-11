import { describe, it, expect } from "vitest";
import type { PlanData, Shift } from "@/lib/types";
import { employeeStats } from "@/lib/employeeStats";

const shift = (p: Partial<Shift>): Shift => ({
  id: p.id ?? "s", code: p.code ?? "D1", date: "2026-10-19", start: "09:00", end: "11:00", locationId: "L1", fn: "KidzCoach",
  employeeId: "e1", status: "active", note: null, seriesId: null, ...p,
});

const data: PlanData = {
  employees: [{ id: "e1", name: "Emma", functions: ["KidzCoach"] }],
  locations: [], travel: [], unavailability: [],
  shifts: [
    shift({ id: "past", date: "2026-10-12" }),
    shift({ id: "a", date: "2026-10-20", start: "14:00", end: "17:30", locationId: "L2" }),
    shift({ id: "b", date: "2026-10-19" }),
    shift({ id: "next", date: "2026-10-27", locationId: "L2" }),
    shift({ id: "later", date: "2026-11-02", locationId: "L2" }),
    shift({ id: "cancel", date: "2026-10-21", status: "cancelled" }),
    shift({ id: "other", employeeId: "e2" }),
    shift({ id: "open1", employeeId: null }),
    shift({ id: "open2", employeeId: null, fn: "Aqualessen" }),
  ],
};

describe("employeeStats", () => {
  const stats = employeeStats(data, "e1", "2026-10-16", [
    { type: "overlap", employeeId: "e1", date: "2026-10-20", shiftIds: ["a"], message: "" },
    { type: "overlap", employeeId: "e1", date: "2026-10-12", shiftIds: ["past"], message: "" },
  ]);

  it("lists only active upcoming shifts of this employee, in time order", () => {
    expect(stats.upcoming.map((s) => s.id)).toEqual(["b", "a", "next", "later"]);
  });
  it("counts hours per week from today's week on, empty weeks included", () => {
    expect(stats.weeks).toHaveLength(6);
    expect(stats.thisWeek).toEqual({ monday: "2026-10-12", minutes: 120, shifts: 1 });
    expect(stats.weeks[1]).toEqual({ monday: "2026-10-19", minutes: 330, shifts: 2 });
    expect(stats.weeks[4].shifts).toBe(0);
  });
  it("only counts conflicts from today on", () => {
    expect(stats.conflicts).toHaveLength(1);
    expect(stats.conflictedUpcoming).toBe(1);
  });
  it("ranks locations and finds open shifts that fit the employee's functions", () => {
    expect(stats.locations).toEqual([{ locationId: "L2", shifts: 3 }, { locationId: "L1", shifts: 2 }]);
    expect(stats.matchingOpen).toBe(1);
  });
});
