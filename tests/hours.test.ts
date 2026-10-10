import { it, expect } from "vitest";
import { durationMin, hoursLabel, totalMinutes } from "@/lib/hours";

it("duration and label", () => {
  expect(durationMin({ start: "14:45", end: "18:00" })).toBe(195);
  expect(hoursLabel(195)).toBe("3u15");
  expect(hoursLabel(120)).toBe("2u");
  expect(hoursLabel(0)).toBe("0u");
});
it("totals", () => {
  expect(totalMinutes([{ start: "07:30", end: "08:45" }, { start: "12:00", end: "13:15" }])).toBe(150);
});
