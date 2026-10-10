import { test, expect } from "@playwright/test";

test("planner sees conflicts, removes an employee with a reason, and finds it in the log and outbox", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.DEMO_EMAIL!);
  await page.getByLabel("Wachtwoord").fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/planbord/);

  // Monday: Tom has an overlap and Noor too little travel time.
  await expect(page.getByRole("article", { name: "Dag van Tom" }).getByText(/overlapt met/).first()).toBeVisible();
  await expect(page.getByRole("article", { name: "Dag van Noor" }).getByText(/Te weinig reistijd/).first()).toBeVisible();
  // The whole week has exactly 24 shifts involved in a conflict (15 conflicts).
  await page.getByRole("tab", { name: "Week" }).click();
  await expect(page.getByRole("button", { name: /Alleen conflicten \(24\)/ })).toBeVisible();

  // Friday: Gijs has exactly enough travel time, which is shown as tight, not as a conflict.
  await page.goto("/planbord?d=2026-10-23");
  await expect(page.getByRole("article", { name: "Dag van Gijs" }).getByText("Precies genoeg reistijd (20 min)")).toBeVisible();

  // Remove Hana from D041 with a reason.
  await page.goto("/planbord?d=2026-10-23&q=D041");
  await page.getByRole("button", { name: "Acties D041" }).click();
  await page.getByRole("menuitem", { name: "Medewerker eraf halen" }).click();
  await page.getByRole("radio", { name: "Ziek" }).check();
  await expect(page.getByText(/krijgt automatisch dit bericht/)).toBeVisible();
  await page.getByRole("button", { name: "Bevestigen" }).click();
  await expect(page.getByText("Open dienst").first()).toBeVisible();

  await page.goto("/log");
  await expect(page.getByText(/haalde Hana van/)).toBeVisible();
  await expect(page.getByText("Ziek", { exact: true })).toBeVisible();

  await page.goto("/berichten");
  await expect(page.getByText("Wijziging dienst vr 23 okt 12:00-13:15 (TSO De Brug)")).toBeVisible();
});
