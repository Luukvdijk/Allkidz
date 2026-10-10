import type { TravelTime } from "@/lib/types";

/** Minutes between two locations, or null when unknown. Same location is always 0. */
export type TravelLookup = (a: string, b: string) => number | null;

export function travelLookup(travel: TravelTime[]): TravelLookup {
  const m = new Map<string, number>();
  for (const t of travel) {
    m.set(`${t.a}|${t.b}`, t.minutes);
    m.set(`${t.b}|${t.a}`, t.minutes);
  }
  return (a, b) => (a === b ? 0 : (m.get(`${a}|${b}`) ?? null));
}
