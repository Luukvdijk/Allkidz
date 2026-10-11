import { test, expect } from "@playwright/test";

test("planner sees conflicts, removes an employee with a reason, and finds it in the log and outbox", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.DEMO_EMAIL!);
  await page.getByLabel("Wachtwoord").fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen" }).click();
  // Logging in seeds a fresh copy of the demo data, which can take several seconds.
  await expect(page).toHaveURL(/planbord/, { timeout: 30_000 });

  // Monday: Tom has an overlap and Noor too little travel time.
  await expect(page.getByRole("article", { name: "Dag van Tom" }).getByText(/overlapt met/).first()).toBeVisible();
  await expect(page.getByRole("article", { name: "Dag van Noor" }).getByText(/Te weinig reistijd/).first()).toBeVisible();
  // The whole week: 24 shifts in the 15 original conflicts, plus 5 from the self-made extra data
  // (licences: D037, D094, D125, D253; bag double: D066, its partner D003 is already in an overlap).
  // The employee's name opens the planner's overview of that employee.
  await page.getByRole("link", { name: "Profiel en overzicht van Tom" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Tom" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Wat aandacht nodig heeft (1)" })).toBeVisible();
  await page.goBack();

  await page.getByRole("tab", { name: "Week" }).click();
  await expect(page.getByRole("button", { name: /Alleen conflicten \(29\)/ })).toBeVisible();

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
  await expect(page.getByText("Hana is van D041 gehaald")).toBeVisible({ timeout: 15_000 });

  await page.goto("/log");
  await expect(page.getByText(/haalde Hana van/)).toBeVisible();
  await expect(page.getByText("Ziek", { exact: true })).toBeVisible();

  await page.goto("/berichten");
  await expect(page.getByText("Wijziging dienst vr 23 okt 12:00-13:15 (TSO De Brug)")).toBeVisible();
});
