import { test, expect, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.DEMO_EMAIL!);
  await page.getByLabel("Wachtwoord").fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/planbord/);
}

async function viewAs(page: Page, label: string) {
  const value = await page
    .locator('select[aria-label="Bekijk als"]')
    .first()
    .locator("option", { hasText: label })
    .first()
    .getAttribute("value");
  await page.goto(value!);
}

test("client requests a pool shift, planner approves and assigns a licensed coach, client sees the coach's licences", async ({ page }) => {
  await login(page);

  // Client: opens on the day view, one timeline row per location; week and month are one click away.
  await viewAs(page, "Sportbedrijf Kust & Rijn");
  await expect(page.getByRole("tab", { name: "dag" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("listitem", { name: /^Zwembad De Waterlelie, \d+ dienst/ })).toBeVisible();
  await page.getByRole("tab", { name: "maand" }).click();
  await expect(page.getByText("oktober 2026")).toBeVisible();

  // Client: request one Aqualessen shift at a pool on Monday 26 October.
  await page.getByRole("tab", { name: /Aanvragen/ }).click();
  await page.getByLabel("Locatie").selectOption({ label: "Zwembad De Waterlelie" });
  await expect(page.getByLabel("Functie")).toHaveValue("Aqualessen");
  await page.getByLabel("Begin").fill("15:00");
  await page.getByLabel("Eind").fill("17:00");
  await page.getByRole("button", { name: /Aanvragen \(1 dienst\)/ }).click();
  await expect(page.getByText("Aanvraag verstuurd")).toBeVisible();
  await expect(page.getByText("Aangevraagd, wacht op AllKidz").first()).toBeVisible();

  // Planner: approve it.
  await page.goto("/aanvragen");
  const card = page.getByRole("listitem").filter({ hasText: "Zwembad De Waterlelie" }).first();
  await card.getByRole("button", { name: /Goedkeuren/ }).click();
  await expect(page.getByText(/Goedgekeurd: open dienst/)).toBeVisible();

  // Planner: the new open shift, suggestions show licence status; assign the first.
  await page.goto("/planbord?d=2026-10-26&q=Waterlelie&open=1");
  await page.getByRole("button", { name: "Stel iemand voor" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/geldige EHBO/)).toBeVisible();
  await expect(dialog.getByText(/EHBO geldig t\/m/).first()).toBeVisible();
  await expect(dialog.getByText("Nina")).toHaveCount(0); // her EHBO expired
  await dialog.getByRole("button", { name: "Inplannen" }).first().click();
  await expect(page.getByText(/staat op D\d+/)).toBeVisible();

  // Client: the request is now planned; the coach profile shows licences.
  await viewAs(page, "Sportbedrijf Kust & Rijn");
  await page.getByRole("tab", { name: /Aanvragen/ }).click();
  await expect(page.getByText(/Ingepland met/).first()).toBeVisible();
  await page.getByRole("button", { name: /^Profiel / }).first().click();
  await expect(page.getByRole("dialog").getByText("EHBO")).toBeVisible();
  await expect(page.getByRole("dialog").getByText(/BSN deelt AllKidz niet/)).toBeVisible();
  await page.keyboard.press("Escape");

  // Client: add a location in a new city; travel times are honestly unknown.
  await page.getByRole("tab", { name: /Locaties/ }).click();
  await page.getByLabel("Naam").fill("Zwembad De Vuurtoren");
  await page.getByLabel("Type").selectOption("Zwembad");
  await page.getByLabel("Plaats").fill("Utrecht");
  await page.getByRole("button", { name: "Toevoegen" }).click();
  await expect(page.getByText(/reistijden zijn nog onbekend/)).toBeVisible();
});

test("employee sees the bag and reports a missing item, planner sees it on the bag board", async ({ page }) => {
  await login(page);
  await viewAs(page, "Emma");
  await page.getByRole("button", { name: /Neem mee: Jachtseizoen tas 1/ }).first().click();
  await expect(page.getByText("4x Walkietalkies").first()).toBeVisible();
  await page.getByRole("button", { name: "Er mist iets" }).click();
  await page.getByLabel("Wat mist er?").fill("Fluitje kwijt");
  await page.getByRole("button", { name: "Meld aan planner" }).click();
  await expect(page.getByText("Gemeld")).toBeVisible();

  await page.goto("/tassen");
  await expect(page.getByText("“Fluitje kwijt”")).toBeVisible();
  await expect(page.getByText("Dubbel: twee coaches")).toBeVisible();
});
