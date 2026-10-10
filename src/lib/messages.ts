import { shortDate } from "@/lib/time";

export type ClientAction =
  | "employee_removed"
  | "employee_cancelled_self"
  | "shift_cancelled"
  | "shift_updated"
  | "employee_assigned";

interface Input {
  action: ClientAction;
  shift: { code: string; date: string; start: string; end: string; fn: string };
  locationName: string;
  employeeName: string | null;
  /** for shift_updated, e.g. "Tijd: 12:00-13:15 wordt 12:30-13:45." */
  changes?: string;
}

/**
 * Message to the client (opdrachtgever) about a change.
 * The internal reason is deliberately not an input: it can be private (illness) and stays in the change log.
 */
export function buildClientMessage({ action, shift, locationName, employeeName, changes }: Input) {
  const when = `${shortDate(shift.date)} ${shift.start}-${shift.end}`;
  const subject = `Wijziging dienst ${when} (${locationName})`;
  const intro = `Beste opdrachtgever,\n\nEr is een wijziging in de dienst ${shift.fn} op ${when} bij ${locationName} (${shift.code}).`;
  const line = {
    employee_removed: `${employeeName} komt niet meer naar deze dienst. We zoeken een vervanger en laten het je weten zodra die bekend is.`,
    employee_cancelled_self: `${employeeName} heeft zich afgemeld voor deze dienst. We zoeken een vervanger en laten het je weten zodra die bekend is.`,
    shift_cancelled: "Deze dienst is geannuleerd.",
    shift_updated: `De dienst is aangepast. ${changes ?? ""}`.trim(),
    employee_assigned: `${employeeName} is ingepland op deze dienst.`,
  }[action];
  return { subject, body: `${intro}\n\n${line}\n\nMet vriendelijke groet,\nPlanning AllKidz` };
}
