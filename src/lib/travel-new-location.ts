import type { Location, TravelTime } from "@/lib/types";

const SAME_CITY_MINUTES = 10;

/**
 * Travel times for a newly added location. In a known city it borrows the travel times of a location in that
 * city (and is 10 minutes from it). In an unknown city it returns nothing and `unknown: true`, so the planner
 * sees "Reistijd onbekend" instead of a silent "all clear".
 */
export function travelForNewLocation(newId: string, city: string, locations: Location[], travel: TravelTime[]) {
  const twin = locations.find((l) => l.city.trim().toLowerCase() === city.trim().toLowerCase());
  if (!twin) return { travel: [] as TravelTime[], unknown: true };
  const out: TravelTime[] = [{ a: newId, b: twin.id, minutes: SAME_CITY_MINUTES }];
  for (const t of travel) {
    if (t.a === twin.id) out.push({ a: newId, b: t.b, minutes: t.minutes });
    else if (t.b === twin.id) out.push({ a: newId, b: t.a, minutes: t.minutes });
  }
  return { travel: out, unknown: false };
}
