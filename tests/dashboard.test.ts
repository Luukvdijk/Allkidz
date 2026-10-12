import { describe, it, expect } from "vitest";
import type { PlanData, Shift } from "@/lib/types";
import { dashboardStats } from "@/lib/dashboard";
import { detectConflicts } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

let n = 0;
const s = (p: Partial<Shift>): Shift => ({
  id: `S${++n}`, code: `S${n}`, date: "2026-10-19", start: "09:00", end: "11:00", locationId: "L1", fn: "KidzCoach",
  employeeId: "emma", status: "active", note: null, seriesId: null, ...p,
});

const data: PlanData = {
  employees: [{ id: "emma", name: "Emma", functions: ["KidzCoach"] }, { id: "sven", name: "Sven", functions: ["KidzCoach"] }],
  locations: [{ id: "L1", name: "BSO", type: "BSO", city: "Leiden", clientId: "C1" }, { id: "L2", name: "School", type: "School", city: "Katwijk", clientId: "C2" }],
  travel: [], unavailability: [],
  shifts: [
    s({ id: "a" }),
    s({ id: "b", employeeId: null, date: "2026-10-20", locationId: "L2" }),
    s({ id: "c", employeeId: null, date: "2026-10-14" }), // before today: counted in the period, not as "open soon"
    s({ id: "d", date: "2026-10-31" }), // after the period
    s({ id: "e", status: "cancelled" }),
  ],
  licences: [
    { employeeId: "emma", type: "EHBO", expiresOn: "2026-10-01" },
    { employeeId: "sven", type: "BHV", expiresOn: "2026-11-05" },
    { employeeId: "sven", type: "VOG", expiresOn: null },
    { employeeId: "emma", type: "BHV", expiresOn: "2027-06-01" },
  ],
};

describe("dashboardStats", () => {
  const st = dashboardStats(data, "2026-10-16", []);

  it("covers this week and the next, weekdays only in the day chart", () => {
    expect([st.from, st.to]).toEqual(["2026-10-12", "2026-10-25"]);
    expect(st.days).toHaveLength(10);
    expect(st.days.find((d) => d.date === "2026-10-20")).toEqual({ date: "2026-10-20", total: 1, open: 1, conflicted: 0 });
  });
  it("counts active shifts in the period only", () => {
    expect([st.shifts, st.filled, st.open, st.minutes]).toEqual([3, 1, 2, 360]);
  });
  it("lists open shifts from today on and fill per client", () => {
    expect(st.openSoon.map((x) => x.id)).toEqual(["b"]);
    expect(st.clients).toEqual([
      { clientId: "C1", shifts: 2, open: 1 },
      { clientId: "C2", shifts: 1, open: 1 },
    ]);
  });
  it("includes every employee in the workload, busiest first", () => {
    expect(st.workload).toEqual([
      { employeeId: "emma", minutes: 120, shifts: 1 },
      { employeeId: "sven", minutes: 0, shifts: 0 },
    ]);
  });
  it("lists expired and soon expiring licences, never ones without an end date", () => {
    expect(st.licences).toEqual([
      { employeeId: "emma", type: "EHBO", expiresOn: "2026-10-01", expired: true },
      { employeeId: "sven", type: "BHV", expiresOn: "2026-11-05", expired: false },
    ]);
  });
  it("agrees with the conflict engine on the supplied test data", () => {
    const fixture = loadFixture();
    const conflicts = detectConflicts(fixture);
    const real = dashboardStats(fixture, "2026-10-16", conflicts);
    expect(real.conflicted).toBe(new Set(conflicts.flatMap((c) => c.shiftIds)).size);
    expect(real.days.reduce((t, d) => t + d.conflicted, 0)).toBe(real.conflicted);
    // The supplied data has no bags; the extended data has its double on Tuesday 20 October.
    expect(real.firstBagDouble).toBeNull();
  });
  it("points to the first bag double from today on", () => {
    const withBags: PlanData = {
      ...data,
      shifts: [
        s({ id: "x1", date: "2026-10-21", bagId: "B1" }),
        s({ id: "x2", date: "2026-10-21", bagId: "B1", employeeId: "sven", start: "14:00", end: "16:00" }),
        s({ id: "y1", date: "2026-10-23", bagId: "B1" }),
        s({ id: "y2", date: "2026-10-23", bagId: "B1", employeeId: "sven", start: "14:00", end: "16:00" }),
      ],
    };
    const st = dashboardStats(withBags, "2026-10-16", []);
    expect(st.bagDoubles).toBe(2);
    expect(st.firstBagDouble).toBe("2026-10-21");
  });
});
