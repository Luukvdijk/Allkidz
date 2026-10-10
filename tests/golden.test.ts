import { describe, it, expect } from "vitest";
import { detectConflicts } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const key = (c: { type: string; shiftIds: string[] }) => `${c.type}:${[...c.shiftIds].sort().join("+")}`;

describe("golden: full test dataset", () => {
  const data = loadFixture();
  const conflicts = detectConflicts(data);

  it("loads the full dataset", () => {
    expect(data.shifts).toHaveLength(293);
    expect(data.employees).toHaveLength(40);
    expect(data.locations).toHaveLength(28);
  });

  it("finds exactly the 15 known conflicts and nothing else", () => {
    expect(conflicts.map(key).sort()).toEqual(
      [
        "function:D082", "function:D141",
        "overlap:D003+D132", "overlap:D008+D281", "overlap:D076+D083", "overlap:D105+D176", "overlap:D126+D193",
        "travel:D034+D254", "travel:D053+D121", "travel:D113+D263", "travel:D191+D198",
        "unavailable:D086", "unavailable:D135", "unavailable:D182", "unavailable:D274",
      ].sort(),
    );
  });

  it("does not flag the look-alike traps", () => {
    const flagged = new Set(conflicts.flatMap((c) => c.shiftIds));
    // Gijs 20/20 min, Yara 25/25 min, Niels back-to-back same location, Amber ends 20:00 when unavailable starts
    for (const id of ["D270", "D020", "D271", "D123", "D242", "D245", "D055"]) expect(flagged.has(id)).toBe(false);
  });

  it("never flags an open shift", () => {
    const open = data.shifts.filter((s) => !s.employeeId).map((s) => s.id);
    expect(open).toHaveLength(22);
    const flagged = new Set(conflicts.flatMap((c) => c.shiftIds));
    expect(open.some((id) => flagged.has(id))).toBe(false);
  });
});
