import { it, expect } from "vitest";
import { buildClientMessage } from "@/lib/messages";

const shift = { code: "D041", date: "2026-10-23", start: "12:00", end: "13:15", fn: "KidzCoach" };

it("employee removed: names the shift, the change and that a replacement is sought", () => {
  const m = buildClientMessage({ action: "employee_removed", shift, locationName: "TSO De Brug", employeeName: "Hana" });
  expect(m.subject).toBe("Wijziging dienst vr 23 okt 12:00-13:15 (TSO De Brug)");
  expect(m.body).toContain("Hana");
  expect(m.body).toContain("zoeken een vervanger");
  expect(m.body).not.toContain("\u2014");
});
it("cancelled shift", () => {
  const m = buildClientMessage({ action: "shift_cancelled", shift, locationName: "TSO De Brug", employeeName: null });
  expect(m.body).toContain("geannuleerd");
});
it("updated shift includes the change description", () => {
  const m = buildClientMessage({ action: "shift_updated", shift, locationName: "TSO De Brug", employeeName: "Hana", changes: "Tijd: 12:00-13:15 wordt 12:30-13:45." });
  expect(m.body).toContain("12:30-13:45");
});
it("never contains an internal reason (it is not an input)", () => {
  const m = buildClientMessage({ action: "employee_cancelled_self", shift, locationName: "TSO De Brug", employeeName: "Hana" });
  expect(m.body).not.toMatch(/ziek|tentamen|reden/i);
});
