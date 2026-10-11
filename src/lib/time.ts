/** Minutes since midnight. "23:59" counts as end of day (1440) so whole-day blocks cover everything. */
export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  const v = h * 60 + m;
  return v === 1439 ? 1440 : v;
}

export function fromMin(v: number): string {
  const h = Math.floor(v / 60);
  const m = v % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ISO dates are handled in UTC so daylight saving never shifts a day.
const toDate = (iso: string) => new Date(iso + "T00:00:00Z");
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** 1 = Monday ... 7 = Sunday */
export function weekday(iso: string): number {
  const w = toDate(iso).getUTCDay();
  return w === 0 ? 7 : w;
}

export function mondayOf(iso: string): string {
  return addDays(iso, 1 - weekday(iso));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400000);
}

/** All dates of the calendar grid for the month of `iso`, Monday-first, whole weeks. */
export function monthGrid(iso: string): string[] {
  const first = iso.slice(0, 8) + "01";
  const d = toDate(first);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  const last = toIso(d);
  const end = addDays(mondayOf(last), 6);
  const out: string[] = [];
  for (let x = mondayOf(first); x <= end; x = addDays(x, 1)) out.push(x);
  return out;
}

export function addMonths(iso: string, n: number): string {
  const d = toDate(iso.slice(0, 8) + "01");
  d.setUTCMonth(d.getUTCMonth() + n);
  return toIso(d);
}

export const DAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];
export const DAY_LONG = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const MONTH_SHORT = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
const MONTH_LONG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

export function shortDate(iso: string): string {
  return `${DAY_SHORT[weekday(iso) - 1]} ${Number(iso.slice(8))} ${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]}`;
}

/** "1 okt" */
export function dayMonth(iso: string): string {
  return `${Number(iso.slice(8))} ${MONTH_SHORT[Number(iso.slice(5, 7)) - 1]}`;
}

export function longDate(iso: string): string {
  return `${DAY_LONG[weekday(iso) - 1]} ${Number(iso.slice(8))} ${MONTH_LONG[Number(iso.slice(5, 7)) - 1]}`;
}

export function monthLabel(iso: string): string {
  return `${MONTH_LONG[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}
