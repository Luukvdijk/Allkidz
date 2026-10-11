# Licences, client portal and sport bags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the planning demo with licence matching, client organisations with their own locations and shift requests, a coach profile for clients, and sport bags with packing lists, all on branch `dev` (main keeps the current demo).

**Architecture:** Same pattern as the core: rules are pure TypeScript in `src/lib/` with Vitest tests (two golden tests: original data only, and original + self-made extra data). Supabase gets backward-compatible additions (nullable columns, new tables, extended seed) so the code on `main` keeps working against the same database. Screens reuse the planbord context, the recurrence input and the role switcher.

**Tech Stack:** unchanged (Next.js 16, Supabase, Tailwind v4, shadcn/Base UI, Vitest, Playwright).

**Spec:** `docs/superpowers/specs/2026-10-10-licences-clients-bags-design.md`

**Deviation from spec (decided while planning, based on the real shift counts):** instead of a "missing VOG" case (every employee has 4+ shifts, so one missing VOG would flood the board), the third licence case is an extra requirement on one shift (BHV at a busy event) that the assigned coach lacks.

---

## File structure

```
scripts/make_extra_testdata.py        generates data/aanvullende-testdata.json (deterministic, stdlib)
scripts/analyze_extra.py              independent check: expected licence/bag conflicts and traps
data/aanvullende-testdata.json        self-made fictional extension (also copied to src/lib/testdata/)
src/lib/types.ts                      + Licence, Activity, Bag, Client; optional PlanData extension fields
src/lib/licences.ts                   requiredLicences(), licenceProblems()
src/lib/bags.ts                       bagHolders(), pickBag()
src/lib/travel-new-location.ts        travelForNewLocation()
src/lib/conflicts/detect.ts           + licence and bag conflict types (only when extension data is present)
src/lib/testdata/load.ts              loadFixture({ extended })
supabase/migrations/20261011090000_licences_clients_bags.sql
supabase/migrations/20261011090100_seed_extra.sql   (generated)
src/app/actions/requests.ts, locations.ts, materials.ts
src/components/aanvragen/*, tassen/*, medewerkers/*, opdrachtgever/* (rewritten for organisations)
tests/licences.test.ts, bags.test.ts, travel-new-location.test.ts, golden-extended.test.ts
e2e/client-request.spec.ts
```

---

### Task 1: Extra test data + independent analysis

- [ ] Write `scripts/make_extra_testdata.py` (stdlib, deterministic) producing:
  - `licenceTypes` = ["VOG", "EHBO", "Kinder-EHBO", "BHV", "Toezicht zwembad"]
  - `requirementsByLocationType` = { BSO: [VOG], TSO: [VOG], School: [VOG], KDV: [VOG, Kinder-EHBO], Zwembad: [VOG, EHBO] }
  - `employeeLicences`: everyone VOG; everyone with a KDV shift Kinder-EHBO (expiry 2027-06-30) except Hana; everyone with a Zwembad shift EHBO (expiry 2027-03-31) except Nina (expired 2026-10-01) and Amber (expires 2026-10-23 = her last pool shift, trap); Toezichthouders also "Toezicht zwembad"; BHV for Lotte, Eva, Tom, Roos, Stijn (valid) and Sven (expired 2026-09-01, trap); a few extra realistic licences.
  - `clients`: 7 organisations covering all 28 locations exactly once (see spec section; Duinstreek, Kind & Co Leiden, Oegstgeest, Bollenstreek Kids, Wassenaar-Voorschoten, Sportbedrijf Kust & Rijn, Scholengroep Rijnland).
  - `activities`: Jachtseizoen (2 bags), Voetbal clinic (2), Levend Stratego (1), Speurtocht (1), Apenkooien (1), Zwemspelletjes (1), each with a Dutch packing list.
  - `shiftActivities`: per day the first 4 assigned BSO shifts (by code) cycle Jachtseizoen, Voetbal clinic, Levend Stratego, Jachtseizoen; bag = first bag of that activity not held by another coach that day; plus Speurtocht tas 1 on D242 and D245 (Niels, trap); Zwemspelletjes on one Aqualessen shift on two different days; plus one forced double: an extra Tuesday Jachtseizoen shift gets the bag already held by another coach.
  - `extraRequirements`: D037 (Bo) and D064 (Lotte), both BSO Kakelbont Wednesday, get ["BHV"].
  - `requests`: 3 open requests (Sportbedrijf: Aqualessen Zwembad De Zijl Fri 23 Oct 15:00-17:00 activity Zwemspelletjes; Duinstreek: Jachtseizoen BSO De Duinroos loose dates 26 + 28 Oct 14:45-18:00; Scholengroep: Gymdocent School De Meidoorn weekly Tuesday 3-24 Nov 13:00-15:00).
- [ ] Write `scripts/analyze_extra.py` that, independently of the TS engine, computes licence problems and bag doubles over original + extra data and prints them.
- [ ] Run both; expected: 4 licence conflicts (Hana D253, Nina D094 + D125, Bo D037), 1 bag double (2 shifts), no flags for Amber, Sven, Lotte, Niels. If the generator output differs, fix the generator, not the expectation.
- [ ] Copy JSON to `src/lib/testdata/aanvullende-testdata.json`. Commit `feat: self-made extra test data (licences, clients, activities, bags) with analysis`.

### Task 2: Types and pure rules (TDD)

- [ ] Types: `Licence { employeeId; type; expiresOn: string | null }`, `Activity { id; name; packingList: {item; qty}[] }`, `Bag { id; activityId; label }`, `Client { id; name }`. Location gets `clientId?`, `archived?`. Shift gets `extraRequirements?: string[]`, `activityId?: string | null`, `bagId?: string | null`. PlanData gets optional `licences?`, `requirements?: Record<string, string[]>`, `activities?`, `bags?`, `clients?`.
- [ ] `tests/licences.test.ts`: missing licence; expired (expiry < date); expiry == date is valid; extra requirement adds BHV; no requirements data means no check; open shift never.
- [ ] `src/lib/licences.ts`: `requiredLicences(shift, location, requirements)`, `licenceProblems(shift, employeeLicences, required) -> { type, kind: "missing" | "expired", expiresOn? }[]`.
- [ ] `tests/bags.test.ts`: same bag same day two coaches = double; same coach twice = fine; different days fine; open shift ignored; `pickBag` returns first free bag or null.
- [ ] `src/lib/bags.ts`: `bagDoubles(shifts) -> [shiftA, shiftB, bagId][]`, `pickBag(activityId, date, employeeId, data)`.
- [ ] `tests/travel-new-location.test.ts` + `src/lib/travel-new-location.ts`: known city copies travel times from a location in that city (+10 to it); unknown city returns [] and `unknown: true`.
- [ ] Extend `detectConflicts`: types `"licence"` and `"bag"`; licence only when `data.requirements` is set; Dutch messages "Mist Kinder-EHBO (vereist op KDV)", "EHBO verlopen op 1 okt", "Jachtseizoen tas 1 is die dag ook bij Lisa (D087)". Extend `CONFLICT_LABEL` + icons.
- [ ] `loadFixture({ extended: true })` merges the extra JSON (ids = names/codes as before).
- [ ] `tests/golden-extended.test.ts`: exactly 15 original + 4 licence + 1 bag conflict, traps absent. Original `golden.test.ts` unchanged and green.
- [ ] `tests/suggest.test.ts` gains: for a Zwembad shift, Nina is never suggested (expired EHBO).
- [ ] Commit `feat: licence and bag rules in the conflict engine with extended golden test`.

### Task 3: Database (backward compatible)

- [ ] Migration `20261011090000_licences_clients_bags.sql`: tables `clients`, `employee_licences`, `activities`, `bags`, `shift_requests`, `material_reports` (all `workspace_id` + RLS "own workspace" policy, FK indexes); columns `locations.client_id`, `locations.archived_at`, `shifts.extra_requirements text[] default '{}'`, `shifts.activity_id`, `shifts.bag_id`; seed tables `seed.clients`, `seed.client_locations`, `seed.employee_licences`, `seed.activities`, `seed.bags`, `seed.shift_extras`, `seed.requests`; `workspaces.requirements jsonb` (default from the extra data); extend `change_log.action` check with the new actions; `private.seed_workspace` extended to fill the new tables after the existing inserts.
- [ ] Generated `20261011090100_seed_extra.sql` from the JSON (script extension).
- [ ] Apply both via Supabase MCP; verify counts; RLS check with two simulated users; advisors clean.
- [ ] Commit.

### Task 4: Data loading + server actions

- [ ] `loadWorkspace` loads licences, clients, activities, bags, requirements and the new shift/location columns into PlanData.
- [ ] Shift actions accept `activityId`, `bagId`, `extraRequirements`; log `bag_changed` when the bag changes.
- [ ] `actions/requests.ts`: `createRequest(clientId, input)` (validates location belongs to client and is active), `approveRequest(id)` (creates open shift(s) via the same insert path as createShifts, stores created ids), `rejectRequest(id, reason)` (reason required). All logged.
- [ ] `actions/locations.ts`: `addLocation(clientId, {name, type, city})` (inserts travel times via `travelForNewLocation`), `archiveLocation(clientId, id)` (sets archived_at; returns number of future shifts). Logged.
- [ ] `actions/materials.ts`: `reportMissing(shiftId, employeeId, text)` (only the employee on that shift), `resolveReport(id)`. Logged.
- [ ] Typecheck, commit.

### Task 5: Planner screens

- [ ] Shift chip: activity + bag label + extra requirements line. Shift form: Activiteit select, Tas select (auto via `pickBag`, editable, "Geen tas vrij" note), Extra eisen checkboxes; live preview includes licence and bag conflicts.
- [ ] Suggest dialog shows licence status per candidate ("EHBO verloopt 23 okt, geldig").
- [ ] `/aanvragen` page + menu badge (open count): list, approve (then suggestions for created shifts), reject with required reason.
- [ ] `/tassen` page: per bag a week row (day, coach, shift code, location), doubles red; open material reports with "Opgelost".
- [ ] `/medewerkers` page: table with functions and licences (expired red, within 30 days of demo today orange); click name opens profile panel.
- [ ] Browser check, commit.

### Task 6: Employee app

- [ ] Shift card with bag: "Neem mee: Jachtseizoen tas 2", packing list checklist (localStorage key per shift), "Er mist iets" dialog -> `reportMissing`.
- [ ] Tab "Profiel": own licences with expiry and status.
- [ ] Browser check at 375px, commit.

### Task 7: Client portal (organisation)

- [ ] Role switcher: "Opdrachtgever" group lists the 7 organisations; route `/opdrachtgever/[clientId]`.
- [ ] Tabs: Planning (all locations, Week/Maand, location filter, coach first name links to profile), Aanvragen (new request form with own active locations + RecurrenceInput + times + function + optional activity + note; list with status incl. "ingepland met [coach]"), Locaties (add, archive with future-shift warning; archived shown greyed), Meldingen (existing, filtered to the organisation's locations).
- [ ] Coach profile dialog: first name, functions, licences with "in orde"/"verlopen"; only for coaches booked at this organisation.
- [ ] Browser check at desktop and 375px, commit.

### Task 8: E2E + docs

- [ ] `e2e/client-request.spec.ts`: client requests the Zwembad shift, planner approves, suggestions exclude Nina, planner assigns, client sees coach + licences; employee with a bag reports missing item; planner sees it on /tassen.
- [ ] Both e2e tests, all unit tests, lint, build green.
- [ ] Update README, ai-log, video script (tightened to <= 10 min), toelichting (self-made extra data line).
- [ ] Push `dev` only. Commit.
