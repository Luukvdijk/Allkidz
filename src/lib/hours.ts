import { toMin } from "@/lib/time";

export const durationMin = (s: { start: string; end: string }) => toMin(s.end) - toMin(s.start);

export const totalMinutes = (shifts: { start: string; end: string }[]) =>
  shifts.reduce((t, s) => t + durationMin(s), 0);

export function hoursLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}u${String(m).padStart(2, "0")}` : `${h}u`;
}
