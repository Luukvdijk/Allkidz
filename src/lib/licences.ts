import type { Licence, Shift } from "@/lib/types";

export interface LicenceProblem {
  type: string;
  kind: "missing" | "expired";
  expiresOn?: string;
}

/** Requirements of the location type plus the shift's own extra requirements, in that order, without duplicates. */
export function requiredLicences(shift: Shift, locationType: string, requirements: Record<string, string[]>): string[] {
  return [...new Set([...(requirements[locationType] ?? []), ...(shift.extraRequirements ?? [])])];
}

/** A licence is valid on the shift date when it has no expiry or expires on or after that date. */
export function licenceProblems(shift: Shift, licences: Licence[], required: string[]): LicenceProblem[] {
  const mine = licences.filter((l) => l.employeeId === shift.employeeId);
  const out: LicenceProblem[] = [];
  for (const type of required) {
    const l = mine.find((x) => x.type === type);
    if (!l) out.push({ type, kind: "missing" });
    else if (l.expiresOn !== null && l.expiresOn < shift.date) out.push({ type, kind: "expired", expiresOn: l.expiresOn });
  }
  return out;
}
