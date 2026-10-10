import { it, expect } from "vitest";
import { buildDayTimeline } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const data = loadFixture();

it("Gijs on Friday has a tight but valid transfer", () => {
  const t = buildDayTimeline(data, "Gijs", "2026-10-23");
  const gap = t.gaps.find((g) => g.fromShiftId === "D270")!;
  expect(gap).toMatchObject({ toShiftId: "D020", gap: 20, need: 20, status: "krap" });
});

it("Niels back-to-back at the same location is ok", () => {
  const t = buildDayTimeline(data, "Niels", "2026-10-21");
  expect(t.gaps.find((g) => g.fromShiftId === "D242")?.status).toBe("ok");
});

it("Mila has a travel problem and shifts are sorted by time", () => {
  const t = buildDayTimeline(data, "Mila", "2026-10-21");
  const starts = t.shifts.map((s) => s.start);
  expect(starts).toEqual([...starts].sort());
  expect(t.gaps.find((g) => g.fromShiftId === "D254")?.status).toBe("te-krap");
});

it("Fleur on Thursday shows the overlap as a gap status", () => {
  const t = buildDayTimeline(data, "Fleur", "2026-10-22");
  expect(t.gaps.some((g) => g.status === "overlap")).toBe(true);
});
