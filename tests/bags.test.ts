import { describe, it, expect } from "vitest";
import { bagDay, bagDoubles, bagMonth, missingFor, pickBag } from "@/lib/bags";
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

describe("missing items", () => {
  const withMissing = (shifts: Shift[]): PlanData => ({
    ...data(shifts),
    missing: [{ id: "m1", bagId: "jacht1", text: "Fluitje kwijt", createdAt: "2026-10-12T10:00:00Z", employeeId: "emma" }],
  });

  it("lists the open reports of a bag", () => {
    expect(missingFor("jacht1", withMissing([])).map((m) => m.text)).toEqual(["Fluitje kwijt"]);
    expect(missingFor("jacht2", withMissing([]))).toEqual([]);
    expect(missingFor(null, withMissing([]))).toEqual([]);
  });

  it("pickBag prefers a complete bag over one with something missing", () => {
    expect(pickBag("jacht", "2026-10-21", "anouk", withMissing([]))).toBe("jacht2");
  });

  it("pickBag still takes the incomplete bag when it is the only free one", () => {
    const d = withMissing([s({ employeeId: "lisa", bagId: "jacht2" })]);
    expect(pickBag("jacht", "2026-10-20", "anouk", d)).toBe("jacht1");
  });
});

describe("bagDay", () => {
  it("lists every bag, with its shifts in time order and how long each coach has it", () => {
    const day = bagDay(
      data([s({ id: "late", start: "14:45", end: "18:00" }), s({ id: "early", start: "07:30", end: "08:45" }), s({ id: "other", date: "2026-10-21" })]),
      "2026-10-20",
    );
    expect(day.map((d) => d.bagId)).toEqual(["jacht1", "jacht2"]);
    expect(day[0].shifts.map((x) => x.id)).toEqual(["early", "late"]);
    // The bag goes home with the coach, so it is out from the first shift to the last.
    expect(day[0].spans).toEqual([{ employeeId: "emma", from: "07:30", to: "18:00" }]);
    expect(day[0].double).toBe(false);
    expect(day[1]).toMatchObject({ shifts: [], spans: [], double: false });
  });
  it("marks a double and gives each coach a span", () => {
    const [one] = bagDay(data([s({ employeeId: "emma" }), s({ employeeId: "anouk", start: "12:00", end: "13:15" })]), "2026-10-20");
    expect(one.double).toBe(true);
    expect(one.spans.map((x) => x.employeeId).sort()).toEqual(["anouk", "emma"]);
  });
  it("shows an open shift with a bag, but gives it no coach span", () => {
    const [one] = bagDay(data([s({ employeeId: null })]), "2026-10-20");
    expect(one.shifts).toHaveLength(1);
    expect(one.spans).toEqual([]);
  });
});

describe("bagMonth", () => {
  it("counts bags in use and doubles per day", () => {
    const m = bagMonth(
      [s({}), s({ employeeId: "anouk" }), s({ bagId: "jacht2", date: "2026-10-21" }), s({ date: "2026-10-22", status: "cancelled" })],
    );
    expect(m.get("2026-10-20")).toEqual({ inUse: 1, doubles: 1 });
    expect(m.get("2026-10-21")).toEqual({ inUse: 1, doubles: 0 });
    expect(m.get("2026-10-22")).toBeUndefined();
  });
});
