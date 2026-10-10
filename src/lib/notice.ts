import { daysBetween } from "@/lib/time";

/** The client is notified about changes to shifts from today up to and including today + noticeDays. */
export function isShortNotice(shiftDate: string, today: string, noticeDays: number): boolean {
  const d = daysBetween(today, shiftDate);
  return d >= 0 && d <= noticeDays;
}
