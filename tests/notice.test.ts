import { it, expect } from "vitest";
import { isShortNotice } from "@/lib/notice";

it("short notice when the shift is within noticeDays of today (inclusive)", () => {
  expect(isShortNotice("2026-10-19", "2026-10-16", 7)).toBe(true);
  expect(isShortNotice("2026-10-23", "2026-10-16", 7)).toBe(true);
  expect(isShortNotice("2026-10-24", "2026-10-16", 7)).toBe(false);
  expect(isShortNotice("2026-11-20", "2026-10-16", 7)).toBe(false);
});
it("today itself counts as short notice", () => {
  expect(isShortNotice("2026-10-16", "2026-10-16", 0)).toBe(true);
});
it("past shifts are not notified", () => {
  expect(isShortNotice("2026-10-15", "2026-10-16", 7)).toBe(false);
});
