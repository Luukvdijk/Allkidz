import { describe, it, expect } from "vitest";
import { detectConflicts } from "@/lib/conflicts";
import { rankCandidates } from "@/lib/suggest";
import { loadFixture } from "@/lib/testdata/load";

const key = (c: { type: string; shiftIds: string[] }) => `${c.type}:${[...c.shiftIds].sort().join("+")}`;
// Expected values come from scripts/analyze_extra.py (independent of this engine).
const ORIGINAL = [
  "function:D082", "function:D141",
  "overlap:D003+D132", "overlap:D008+D281", "overlap:D076+D083", "overlap:D105+D176", "overlap:D126+D193",
  "travel:D034+D254", "travel:D053+D121", "travel:D113+D263", "travel:D191+D198",
  "unavailable:D086", "unavailable:D135", "unavailable:D182", "unavailable:D274",
];

describe("golden: original + self-made extra data", () => {
  const data = loadFixture({ extended: true });
  const conflicts = detectConflicts(data);

  it("finds the 15 original conflicts plus exactly 4 licence and 1 bag conflict", () => {
    expect(conflicts.map(key).sort()).toEqual(
      [...ORIGINAL, "licence:D037", "licence:D094", "licence:D125", "licence:D253", "bag:D003+D066"].sort(),
    );
  });

  it("explains licence conflicts in Dutch", () => {
    const msgs = conflicts.filter((c) => c.type === "licence").map((c) => c.message);
    expect(msgs).toContain("Mist Kinder-EHBO (vereist op KDV)");
    expect(msgs).toContain("EHBO verlopen op 1 okt");
    expect(msgs).toContain("Mist BHV (extra eis voor deze dienst)");
  });

  it("does not flag the traps", () => {
    const flagged = new Set(conflicts.filter((c) => c.type === "licence" || c.type === "bag").flatMap((c) => c.shiftIds));
    // Amber: EHBO expires on the day of her last pool shift; Lotte has BHV; Niels uses the same bag twice himself.
    for (const s of data.shifts.filter((x) => x.employeeId === "Amber")) expect(flagged.has(s.id)).toBe(false);
    for (const id of ["D064", "D242", "D245"]) expect(flagged.has(id)).toBe(false);
  });

  it("never suggests Nina for a pool shift (expired EHBO)", () => {
    const pool = data.shifts.find((s) => s.id === "D230")!; // open Toezichthouder shift, Zwembad Het Bassin
    expect(rankCandidates(data, pool).map((c) => c.employeeId)).not.toContain("Nina");
  });

  it("the original data alone still gives exactly the 15 conflicts", () => {
    expect(detectConflicts(loadFixture()).map(key).sort()).toEqual([...ORIGINAL].sort());
  });
});
