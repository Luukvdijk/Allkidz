import { describe, it, expect } from "vitest";
import { toMin, fromMin, addDays, weekday, mondayOf, daysBetween, monthGrid, shortDate } from "@/lib/time";

describe("time", () => {
  it("parses HH:MM and treats 23:59 as end of day", () => {
    expect(toMin("07:30")).toBe(450);
    expect(toMin("23:59")).toBe(1440);
    expect(fromMin(450)).toBe("07:30");
  });
  it("date math on ISO dates without timezone drift", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-10-25", 1)).toBe("2026-10-26"); // DST change in NL
    expect(weekday("2026-10-19")).toBe(1);
    expect(weekday("2026-10-25")).toBe(7);
    expect(mondayOf("2026-10-23")).toBe("2026-10-19");
    expect(daysBetween("2026-10-16", "2026-10-19")).toBe(3);
  });
  it("month grid starts on Monday and covers whole weeks", () => {
    const g = monthGrid("2026-11-15");
    expect(g[0]).toBe("2026-10-26");
    expect(g.length % 7).toBe(0);
    expect(g).toContain("2026-11-30");
  });
  it("short Dutch date", () => {
    expect(shortDate("2026-10-23")).toBe("vr 23 okt");
  });
});
