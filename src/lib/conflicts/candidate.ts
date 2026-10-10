import type { Conflict, PlanData, Shift } from "@/lib/types";
import { detectConflicts } from "./detect";

/**
 * Conflicts that would involve `shift` if it were assigned to `employeeId`.
 * Pure: used for the live check in the shift form, open shifts in the employee app and suggestions.
 */
export function conflictsIfAssigned(data: PlanData, shift: Shift, employeeId: string): Conflict[] {
  const probe: Shift = { ...shift, employeeId, status: "active" };
  // The employee's own day, plus other coaches' shifts holding the same bag that day (bag doubles).
  const sameDay = data.shifts.filter(
    (s) =>
      s.id !== shift.id &&
      s.date === shift.date &&
      (s.employeeId === employeeId || (probe.bagId != null && s.bagId === probe.bagId)),
  );
  return detectConflicts({ ...data, shifts: [...sameDay, probe] }).filter((c) => c.shiftIds.includes(probe.id));
}
