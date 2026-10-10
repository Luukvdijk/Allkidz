import { describe, it, expect } from "vitest";
import { bagDoubles, pickBag } from "@/lib/bags";
import type { PlanData, Shift } from "@/lib/types";

let n = 0;
const s = (p: Partial<Shift>): Shift => ({
  id: `S${++n}`, code: `S${n}`, date: "2026-10-20", start: "14:45", end: "18:00", locationId: "L", fn: "KidzCoach",
  employeeId: "emma", status: "active", note: null, seriesId: null, activityId: "jacht", bagId: "jacht1", ...p,
});
const data = (shifts: Shift[]): PlanData => ({
  employees: [], locations: [], travel: [], unavailability: [], shifts,
  activities: [{ id: "jacht", name: "Jachtseizoen", packingList: [] }],
  bags: [{ id: "jacht1", activityId: "jacht", label: "Jachtseizoen tas 1" }, { id: "jacht2", activityId: "jacht", label: "Jachtseizoen tas 2" }],
});

describe("bagDoubles", () => {
  it("flags the same bag on the same day with two different coaches", () => {
    const d = bagDoubles([s({ id: "a" }), s({ id: "b", employeeId: "anouk" })]);
    expect(d).toEqual([{ bagId: "jacht1", date: "2026-10-20", shiftIds: ["a", "b"] }]);
  });
  it("allows the same coach to use the bag twice that day", () => {
    expect(bagDoubles([s({}), s({ start: "07:30", end: "08:45" })])).toEqual([]);
  });
  it("allows different days, open shifts and cancelled shifts", () => {
    expect(bagDoubles([s({}), s({ employeeId: "anouk", date: "2026-10-21" })])).toEqual([]);
    expect(bagDoubles([s({}), s({ employeeId: null })])).toEqual([]);
    expect(bagDoubles([s({}), s({ employeeId: "anouk", status: "cancelled" })])).toEqual([]);
  });
});

describe("pickBag", () => {
  it("takes the first bag not held by another coach that day", () => {
    const d = data([s({ employeeId: "emma" })]);
    expect(pickBag("jacht", "2026-10-20", "anouk", d)).toBe("jacht2");
    expect(pickBag("jacht", "2026-10-20", "emma", d)).toBe("jacht1");
    expect(pickBag("jacht", "2026-10-21", "anouk", d)).toBe("jacht1");
  });
  it("returns null when every bag is taken", () => {
    const d = data([s({ employeeId: "emma" }), s({ employeeId: "lisa", bagId: "jacht2" })]);
    expect(pickBag("jacht", "2026-10-20", "anouk", d)).toBeNull();
  });
  it("ignores the shift being edited", () => {
    const d = data([s({ id: "self", employeeId: "emma" }), s({ employeeId: "lisa", bagId: "jacht2" })]);
    expect(pickBag("jacht", "2026-10-20", "anouk", d, "self")).toBe("jacht1");
  });
});
