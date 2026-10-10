import { describe, it, expect } from "vitest";
import { requiredLicences, licenceProblems } from "@/lib/licences";
import type { Licence, Shift } from "@/lib/types";

const req = { BSO: ["VOG"], KDV: ["VOG", "Kinder-EHBO"], Zwembad: ["VOG", "EHBO"] };
const shift = (p: Partial<Shift> = {}): Shift => ({
  id: "s", code: "S1", date: "2026-10-23", start: "08:00", end: "12:00", locationId: "L", fn: "Aqualessen",
  employeeId: "amber", status: "active", note: null, seriesId: null, ...p,
});
const lic = (type: string, expiresOn: string | null = null): Licence => ({ employeeId: "amber", type, expiresOn });

describe("requiredLicences", () => {
  it("combines the location type's requirements with the shift's extras, without duplicates", () => {
    expect(requiredLicences(shift({ extraRequirements: ["BHV", "VOG"] }), "Zwembad", req)).toEqual(["VOG", "EHBO", "BHV"]);
    expect(requiredLicences(shift(), "Onbekend", req)).toEqual([]);
  });
});

describe("licenceProblems", () => {
  const required = ["VOG", "EHBO"];
  it("reports a missing licence", () => {
    expect(licenceProblems(shift(), [lic("VOG")], required)).toEqual([{ type: "EHBO", kind: "missing" }]);
  });
  it("reports an expired licence", () => {
    expect(licenceProblems(shift(), [lic("VOG"), lic("EHBO", "2026-10-01")], required)).toEqual([
      { type: "EHBO", kind: "expired", expiresOn: "2026-10-01" },
    ]);
  });
  it("accepts a licence that expires on the day of the shift", () => {
    expect(licenceProblems(shift(), [lic("VOG"), lic("EHBO", "2026-10-23")], required)).toEqual([]);
  });
  it("accepts licences without expiry", () => {
    expect(licenceProblems(shift(), [lic("VOG"), lic("EHBO", null)], required)).toEqual([]);
  });
  it("ignores other employees' licences", () => {
    expect(licenceProblems(shift(), [lic("VOG"), { employeeId: "nina", type: "EHBO", expiresOn: null }], required)).toEqual([
      { type: "EHBO", kind: "missing" },
    ]);
  });
});
