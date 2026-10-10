import type { Conflict, PlanData, Shift } from "@/lib/types";
import { detectConflicts } from "./detect";

/**
 * Conflicts that would involve `shift` if it were assigned to `employeeId`.
 * Pure: used for the live check in the shift form, open shifts in the employee app and suggestions.
 */
export function conflictsIfAssigned(data: PlanData, shift: Shift, employeeId: string): Conflict[] {
  const probe: Shift = { ...shift, employeeId, status: "active" };
  const sameDay = data.shifts.filter(
    (s) => s.id !== shift.id && s.employeeId === employeeId && s.date === shift.date,
  );
  return detectConflicts({ ...data, shifts: [...sameDay, probe] }).filter((c) => c.shiftIds.includes(probe.id));
}
