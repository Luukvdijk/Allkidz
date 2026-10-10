import { describe, it, expect } from "vitest";
import { expandRule, describeRule, type RecurrenceRule } from "@/lib/recurrence";

type Expect = string[] | ((d: string[]) => void);
const cases: [string, RecurrenceRule, Expect][] = [
  ["V1 elke ma en wo", { kind: "weekly", weekdays: [1, 3], interval: 1, from: "2026-11-02", to: "2026-11-25" },
    ["2026-11-02", "2026-11-04", "2026-11-09", "2026-11-11", "2026-11-16", "2026-11-18", "2026-11-23", "2026-11-25"]],
  ["V2 elke wo", { kind: "weekly", weekdays: [3], interval: 1, from: "2026-11-04", to: "2026-11-25" },
    ["2026-11-04", "2026-11-11", "2026-11-18", "2026-11-25"]],
  ["V3 elke derde vrijdag", { kind: "monthly", weekday: 5, nth: 3, from: "2026-11-01", to: "2026-12-31" },
    ["2026-11-20", "2026-12-18"]],
  ["V4 elke di en do", { kind: "weekly", weekdays: [2, 4], interval: 1, from: "2026-11-03", to: "2026-12-17" },
    (d) => { expect(d).toHaveLength(14); expect(d[0]).toBe("2026-11-03"); expect(d.at(-1)).toBe("2026-12-17"); }],
  ["V5 ma t/m vr", { kind: "weekly", weekdays: [1, 2, 3, 4, 5], interval: 1, from: "2026-11-02", to: "2026-12-04" },
    (d) => { expect(d).toHaveLength(25); expect(d.every((x) => x >= "2026-11-02" && x <= "2026-12-04")).toBe(true); }],
  ["V6 wo om de week", { kind: "weekly", weekdays: [3], interval: 2, from: "2026-11-04", to: "2026-12-16" },
    ["2026-11-04", "2026-11-18", "2026-12-02", "2026-12-16"]],
  ["V7 elke vr", { kind: "weekly", weekdays: [5], interval: 1, from: "2026-11-06", to: "2026-12-18" },
    (d) => expect(d).toHaveLength(7)],
  ["V8 elke di en do", { kind: "weekly", weekdays: [2, 4], interval: 1, from: "2026-11-03", to: "2026-11-26" },
    (d) => expect(d).toHaveLength(8)],
  ["V9 elke do", { kind: "weekly", weekdays: [4], interval: 1, from: "2026-11-05", to: "2026-11-26" },
    ["2026-11-05", "2026-11-12", "2026-11-19", "2026-11-26"]],
];

describe("expandRule: the 9 vaste-inzet rules from the test data", () => {
  for (const [name, rule, expected] of cases)
    it(name, () => {
      const d = expandRule(rule);
      if (typeof expected === "function") expected(d);
      else expect(d).toEqual(expected);
    });
});

describe("other modes", () => {
  it("once and loose dates are sorted and deduplicated", () => {
    expect(expandRule({ kind: "once", date: "2026-10-20" })).toEqual(["2026-10-20"]);
    expect(expandRule({ kind: "dates", dates: ["2026-10-23", "2026-10-19", "2026-10-23"] })).toEqual(["2026-10-19", "2026-10-23"]);
  });
  it("last weekday of the month (nth = -1)", () => {
    expect(expandRule({ kind: "monthly", weekday: 5, nth: -1, from: "2026-11-01", to: "2026-11-30" })).toEqual(["2026-11-27"]);
  });
  it("every other week anchors on the start date's week, even mid-week", () => {
    // from Thu 5 Nov: the week of 2 Nov is week 0, so Mondays in week 2 and 4 count (16 and 30 Nov)
    expect(expandRule({ kind: "weekly", weekdays: [1], interval: 2, from: "2026-11-05", to: "2026-11-30" }))
      .toEqual(["2026-11-16", "2026-11-30"]);
  });
  it("empty when the range is reversed", () => {
    expect(expandRule({ kind: "weekly", weekdays: [1], interval: 1, from: "2026-12-01", to: "2026-11-01" })).toEqual([]);
  });
  it("caps runaway ranges at 366 dates", () => {
    expect(expandRule({ kind: "weekly", weekdays: [1, 2, 3, 4, 5, 6, 7], interval: 1, from: "2026-01-01", to: "2030-01-01" })).toHaveLength(366);
  });
  it("describes rules in Dutch", () => {
    expect(describeRule({ kind: "monthly", weekday: 5, nth: 3, from: "2026-11-01", to: "2026-12-31" })).toBe("Elke derde vrijdag van de maand");
    expect(describeRule({ kind: "weekly", weekdays: [3], interval: 2, from: "2026-11-04", to: "2026-12-16" })).toBe("Elke woensdag, om de week");
    expect(describeRule({ kind: "weekly", weekdays: [3, 1], interval: 1, from: "2026-11-02", to: "2026-11-25" })).toBe("Elke maandag en woensdag");
    expect(describeRule({ kind: "weekly", weekdays: [1, 2, 3, 4, 5], interval: 1, from: "2026-11-02", to: "2026-12-04" })).toBe("Elke dag van maandag t/m vrijdag");
    expect(describeRule({ kind: "dates", dates: ["2026-10-19", "2026-10-21"] })).toBe("2 losse datums");
  });
});
