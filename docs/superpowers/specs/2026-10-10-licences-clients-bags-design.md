# Extension: licences, client portal and sport bags (design)

Date: 2026-10-10. Builds on `2026-10-10-planning-demo-design.md`. Deadline still Friday 2026-10-16 (deploy + video on Thursday).

## Goal

Four additions, all small and solid:

1. **Licences as a matching rule** (VOG, EHBO, Kinder-EHBO, BHV, Toezicht zwembad, with expiry date), checked by the same conflict engine.
2. **Clients with multiple locations** that they can add and archive themselves.
3. **Client portal**: request shifts/events, follow the status, see the profile (licences) of the booked coach.
4. **Sport bags**: activities with a packing list and physical bags linked to shifts; the employee sees what to bring and can report missing items.

## Extra test data (self-made, transparent)

The supplied test data has no licences, client organisations, activities or bags. Extra fictional data lives in `data/aanvullende-testdata.json`, marked as self-made, separate from their data. The A4 and video say so explicitly. Luuk asks Jesse whether this is OK.

Contents:

- `licenceTypes`: VOG (no expiry), EHBO, Kinder-EHBO, BHV, Toezicht zwembad.
- `requirementsByLocationType`: every type VOG; KDV + Kinder-EHBO; Zwembad + EHBO.
- `employeeLicences`: per employee a realistic set with expiry dates.
- `clients`: about 7 fictional organisations; every one of the 28 locations belongs to exactly one.
- `activities`: Jachtseizoen, Levend Stratego, Voetbal clinic, Speurtocht, Apenkooien, Zwemspelletjes; each with a packing list (items + quantity) and 1 or 2 physical bags.
- `shiftActivities`: about 25 existing BSO/zwembad shifts get an activity and a bag; optional `extraRequirements` on a few shifts.
- `requests`: 2 or 3 open client requests.

Deliberate cases, verified by an independent analysis script before building:

- About 3 licence conflicts (missing Kinder-EHBO on a KDV shift, EHBO expired before a zwembad shift, missing VOG).
- 1 bag conflict (same bag, same day, two different coaches).
- Traps that must not be flagged: a licence expiring the day after the shift; the same coach using the same bag for two shifts on one day; an expired licence that no shift requires.

## Rules (pure, in `src/lib/`)

- **Licence**: required = requirements of the location type + the shift's extra requirements. A requirement is met if the employee has that licence and it has no expiry date or `expiry >= shift date`. Conflict messages: "Mist Kinder-EHBO (vereist op KDV)", "EHBO verlopen op 3 okt". Open and cancelled shifts never conflict. The existing "function" check stays separate.
- **Bag double**: a bag is with one coach for a whole day. Two active shifts on the same date with the same bag and different (non-null) employees: conflict on both shifts, "Jachtseizoen tas 1 is die dag ook bij Lisa (D087)". Same coach twice is fine. Open shifts with a bag do not count yet (no coach to hold it).
- **Bag auto-pick**: for a shift with an activity, pick the first bag of that activity that is not held by another coach on that date; none free: no bag + message "Geen tas vrij op deze dag".
- **New location travel time**: a new location in a city that already has a location copies that location's travel times (and gets 10 min to it, 0 to itself); an unknown city gets no travel times and the day view shows a neutral "Reistijd onbekend" between its shifts and neighbours (not a conflict).
- **Suggestions** (`rankCandidates`) automatically include licences and bags because they use the conflict engine.

Golden tests:

- Original data only: still exactly the 15 known conflicts.
- Original + extra data: 15 + the new cases, traps asserted absent.

## Data model (Supabase, all workspace-scoped with RLS)

- `clients` (id, workspace_id, name).
- `locations` + `client_id`, `archived_at`.
- `licence_types` are constants in code; `employee_licences` (employee_id, licence, expires_on nullable).
- `location_type_requirements` constants in code (data file), `shifts` + `extra_requirements text[]`, `activity_id`, `bag_id`.
- `activities` (id, name, description, packing_list jsonb), `bags` (id, activity_id, label).
- `shift_requests` (id, client_id, location_id, rule jsonb, start, end, function, activity_id, note, status `aangevraagd|goedgekeurd|afgewezen`, reason, created_at, decided_at, created shift ids).
- `material_reports` (id, bag_id, shift_id, employee_id, text, created_at, resolved_at).
- `change_log.action` gains: `request_created`, `request_approved`, `request_rejected`, `location_added`, `location_archived`, `material_reported`, `material_resolved`, `bag_changed`.
- Seed function seeds the extra data too; reset restores it.

## Screens

Planner:

- Shift chip shows activity, bag and extra requirements; shift form gets Activiteit, Tas (auto, editable), Extra eisen; live check includes licences and bags.
- "Stel iemand voor" filters on licences, shows reasons ("Mist EHBO", "EHBO verloopt 22 okt, geldig").
- **Aanvragen** page (menu badge): approve (creates open shift(s), opens suggestions) or reject (reason required, visible to client). Logged.
- **Tassen** page: per bag the week (day, coach, shift, location), doubles in red, missing-material reports with "Opgelost".
- **Medewerkers** page: list with functions and licences (expired red, expiring within 30 days orange); click opens profile.

Employee app:

- Shift with a bag: "Neem mee: Jachtseizoen tas 2" + packing list as checklist (ticks stored in localStorage only) + "Er mist iets" report.
- New tab **Profiel**: own licences with expiry dates.

Client portal ("Bekijk als" now picks a client organisation):

- **Planning**: all its locations, Week/Maand, location filter, filled/open + coach first name.
- **Aanvragen**: new request (own active locations, date(s) via the same recurrence input, times, function, optional activity, note) + list with status (aangevraagd, goedgekeurd/open, ingepland met [coach], afgewezen + reason).
- **Locaties**: add (name, type, city), archive (warning with number of future shifts; archived locations cannot be booked, existing shifts stay visible).
- **Meldingen**: unchanged.
- **Coach profile**: first name, functions, licences with "in orde"/"verlopen" and expiry date. Only for coaches who are or were booked at this client. No surname, birth date or BSN.

Authorization inside one sandbox: client actions check server-side that the location/request belongs to the acting client; employee actions that the shift/bag belongs to the acting employee (roles are simulated, sandbox isolation is real RLS).

## Testing

- Analysis script over original + extra data first; its output becomes the second golden test.
- Unit tests: licence rule, bag rule, bag auto-pick, new-location travel time, suggestions with licences.
- RLS check for new tables with two simulated visitors.
- Second Playwright test: client requests zwembad shift, planner approves, suggestion only shows coaches with EHBO, planner assigns, client sees coach + licences; employee sees bag, reports missing item, planner sees it.

## Delivery impact

- Video script tightened to stay under 10 minutes with about 1.5 minutes for the new parts.
- A4 gains a line about the self-made extra data and why.
- If time slips, drop the missing-material workflow first.

## Out of scope

Favourites pool, bag drop-off/pick-up routes, weekly mail/Excel, inventory stock levels, document upload/download, real accounts per role.
