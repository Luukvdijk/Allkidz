/** Who performs an action. In the demo, roles are switched in the app; the sandbox itself is a real auth user. */
export type Actor =
  | { role: "planner"; name: string }
  | { role: "medewerker"; name: string; employeeId: string }
  | { role: "opdrachtgever"; name: string; clientId: string };

export const PLANNER: Actor = { role: "planner", name: "Sanne" };

export const actingAs = (a: Actor) =>
  a.role === "medewerker" ? "via medewerker-app" : a.role === "opdrachtgever" ? "via opdrachtgeversportaal" : null;
