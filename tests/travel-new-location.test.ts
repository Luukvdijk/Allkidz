import { it, expect } from "vitest";
import { travelForNewLocation } from "@/lib/travel-new-location";
import type { Location, TravelTime } from "@/lib/types";

const locations: Location[] = [
  { id: "A", name: "BSO A", type: "BSO", city: "Leiden" },
  { id: "B", name: "BSO B", type: "BSO", city: "Katwijk" },
];
const travel: TravelTime[] = [{ a: "A", b: "B", minutes: 20 }];

it("copies travel times from a location in the same city", () => {
  const r = travelForNewLocation("NEW", "leiden", locations, travel);
  expect(r.unknown).toBe(false);
  expect(r.travel).toEqual(expect.arrayContaining([{ a: "NEW", b: "A", minutes: 10 }, { a: "NEW", b: "B", minutes: 20 }]));
  expect(r.travel).toHaveLength(2);
});

it("marks an unknown city instead of guessing", () => {
  expect(travelForNewLocation("NEW", "Utrecht", locations, travel)).toEqual({ travel: [], unknown: true });
});
