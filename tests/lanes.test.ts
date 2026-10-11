import { describe, expect, it } from "vitest";
import { assignLanes, hourRange } from "@/lib/lanes";

const s = (start: string, end: string) => ({ start, end });

describe("assignLanes", () => {
  it("puts shifts that follow each other in one lane", () => {
    expect(assignLanes([s("08:00", "12:00"), s("12:00", "14:00")])).toEqual({ lanes: [0, 0], count: 1 });
  });

  it("puts overlapping shifts in separate lanes and reuses a lane once it is free", () => {
    expect(assignLanes([s("14:45", "18:00"), s("15:00", "17:00"), s("18:00", "19:00")])).toEqual({ lanes: [0, 1, 0], count: 2 });
  });

  it("keeps the input order for the result, whatever the start times", () => {
    expect(assignLanes([s("15:00", "17:00"), s("14:45", "18:00")])).toEqual({ lanes: [1, 0], count: 2 });
  });

  it("returns no lanes for no shifts", () => {
    expect(assignLanes([])).toEqual({ lanes: [], count: 0 });
  });
});

describe("hourRange", () => {
  it("rounds to whole hours around the shifts", () => {
    expect(hourRange([s("08:30", "12:00"), s("14:45", "18:15")])).toEqual({ from: 8, to: 19 });
  });

  it("is at least six hours wide so short days still read as a timeline", () => {
    expect(hourRange([s("12:00", "13:00")])).toEqual({ from: 9, to: 15 });
  });

  it("falls back to a working day without shifts", () => {
    expect(hourRange([])).toEqual({ from: 8, to: 18 });
  });
});
