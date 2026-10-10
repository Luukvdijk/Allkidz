# AllKidz planning demo: design

Date: 2026-10-10. Deadline: Friday 2026-10-16 (demo link + video max 10 min + one A4 on AI use).

## Goal

A working web demo in which a planner (Sanne) plans shifts and sees problems immediately, built on the supplied fictional test data (293 shifts, week Mon 19 to Fri 23 Oct 2026, 40 employees, 28 locations, unavailability, travel times, 9 recurring rules). "Small and working beats big and half-working."

Sanne's four problems and how the demo answers them:

| Problem | Answer |
|---|---|
| Double booking and travel time seen too late | Pure conflict engine, shown in every view and live in the shift form |
| Recurring shifts on loose days, copied by hand | Recurrence: loose dates + patterns, with preview before saving |
| Removals not communicated, not traceable | Required reason, append-only change log, automatic client message (short notice) |
| Employees want their own phone view | Mobile employee screen: own shifts, availability, matching open shifts, cancel |

Chosen extras: (1) employee mobile screen, (2) automatic message to the client. Stretch goal: "suggest suitable employee" for open shifts (reuses the conflict engine).

## Stack

Next.js 16 (App Router), TypeScript, Tailwind v4, shadcn/ui, Supabase (Postgres, auth, RLS), Resend (email), Vitest, Playwright, Vercel. UI language Dutch. No em-dashes in copy or docs.

## Access model

- One demo login (email + password sent to the reviewers).
- Every successful login creates a fresh **workspace** (sandbox) seeded with the test data. Concurrent reviewers on the same login never see each other's changes. RLS restricts every table to workspaces owned by the current session.
- In-app role switcher "Bekijk als": Planner (Sanne, default), Medewerker (pick one of 40), Opdrachtgever (pick a location). Role switching is app-level impersonation inside one sandbox; data isolation between sandboxes is real (RLS). This trade-off is stated openly in the video.
- "Reset demo" reseeds the current workspace.
- Workspaces older than 7 days are deleted by a daily cron.

## Data model

All tables carry `workspace_id` (FK, cascade delete) and are covered by RLS.

- `workspaces`: id, owner (auth user / session), created_at, `notice_days` (int, default 7).
- `functions`: name (KidzCoach, Toezichthouder, Aqualessen, Zwemonderwijzer, Gymdocent).
- `employees`: name. `employee_functions`: employee_id, function.
- `locations`: name, type (BSO, KDV, TSO, Zwembad, School), city, `client_name` (derived: the location itself acts as client in the demo).
- `travel_times`: location_a, location_b, minutes (stored once, looked up symmetrically; same location = 0).
- `unavailability`: employee_id, date, from, to, reason. Source: planner seed or employee app.
- `shifts`: id (keeps source IDs D001..D293; new ones get D294+), date, start, end, location_id, function, employee_id (nullable = open), status (`active` | `cancelled`), note, series_id (nullable), created_at, updated_at.
- `shift_series`: id, rule (JSON: loose dates or pattern), created_by.
- `change_log` (append-only: insert-only RLS, no update/delete): id, at, actor_role (planner | employee | system), actor_name, acting_as, action (`shift_created`, `shift_updated`, `shift_cancelled`, `employee_removed`, `employee_assigned`, `employee_cancelled_self`, `availability_changed`, `open_shift_accepted`), shift_id, before (JSON), after (JSON), reason (required for removals/cancellations).
- `client_messages`: id, at, location_id, shift_id, change_log_id, subject, body, short_notice (bool), email_sent_to (nullable, not stored in the log), sent_at.

Removing never hard-deletes: cancelling sets `status = cancelled`; removing an employee sets `employee_id = null` (shift becomes open). Both write a log entry with reason.

Seed: SQL function `seed_workspace(workspace_id)` copies canonical seed tables (imported once from the xlsx/CSV) into the workspace.

## Conflict engine (`lib/conflicts/`)

Pure TypeScript, no DB or React imports. Input: shifts, unavailability, travel times, employee functions. Output: `Conflict[]` with type, shift ids, and a Dutch human-readable message.

Rules (only active shifts with an employee; open shifts are never conflicts):

1. **Overlap**: same employee, same date, `a.start < b.end && b.start < a.end`. Touching (end == start) is not overlap.
2. **Travel time**: consecutive (sorted by start) non-overlapping shifts of one employee on one date at different locations where `gap < travel`. `gap == travel` is OK. Same location: travel 0.
3. **Unavailable**: shift interval intersects an unavailability interval (strict; touching at the boundary is OK). 23:59 treated as end of day.
4. **Wrong function**: shift function not among the employee's functions.

Non-conflict signal: **"krap"** (neutral, not red) when `gap == travel` and travel > 0.

Expected result on the original data (golden test): 15 conflicts.
- Overlap (5): Emma D132/D003 (Tue), Sophie D008/D281 (Fri), Fleur D083/D076 (Thu), Tom D105/D176 (Mon), Milan D126/D193 (Wed).
- Travel (4): Mila D254->D034 (5 of 45 min), Thijs D053->D121 (10 of 35), Finn D263->D113 (15 of 30), Noor D198->D191 (10 of 25).
- Unavailable (4): Daan D086, Sem D135, Anouk D182, Julia D274.
- Wrong function (2): Lars D082 (Zwemonderwijzer), Iris D141 (Gymdocent).

Must-not-flag traps (explicit tests): Gijs D270->D020 (20/20, "krap"), Yara D271->D123 (25/25, "krap"), Niels D242->D245 (same location, gap 0), Amber D055 (ends 20:00, unavailable from 20:00), all 22 open shifts, plus the other near-miss unavailability cases.

Performance: the full workspace (~300 shifts) is loaded once; filtering and conflict computation run client-side in memory (memoised per data version). Video explains how this would scale (server-side per week, indexes on `(workspace_id, date, employee_id)`).

## Recurrence (`lib/recurrence/`)

Pure TypeScript. Modes:
- **Eenmalig**: one date.
- **Losse datums**: multi-select in a mini calendar.
- **Patroon**: weekdays + frequency (every week / every N weeks from start / Nth weekday of month) + date range.

Always shows a preview list of generated dates with per-date conflict status before saving. Saving creates one shift per date linked by `series_id`. Tests cover all 9 vaste-inzet rules (e.g. V3 third Friday Nov 2026 = 20 Nov, Dec = 18 Dec; V6 every other Wednesday from 4 Nov: 4, 18 Nov, 2, 16 Dec).

## Screens

### Planner: Planbord
- Header: role switcher, Reset demo, conflict counter (click = conflicts-only filter).
- **View toggle Dag / Week / Maand** (in URL):
  - **Dag**: per-employee blocks, shifts sorted by start, gap strip between shifts ("10 min, nodig 25 min"), red badge with Dutch explanation per conflict, neutral "krap" label. Alternative **Lijst** sub-view: sortable compact table.
  - **Week**: grid employees x Mon-Fri, compact shift chips with conflict dot, total hours column; click a cell to open Dag.
  - **Maand**: calendar with per-day counts (shifts / open / conflicts), click a day to open Dag.
  - **Medewerkerweergave**: pick one employee; Week/Maand show only that person with hours per day/week/month.
- Filters (all views, in URL): search (employee, location, shift id), location, function, client, only conflicts, only open.
- Open shifts styled distinct (dashed, "Open").

### Shift form (side panel)
Employee (optional), location, date(s), start, end, function (suggested from location type), recurrence, note. Live conflict check per generated date. Saving with conflicts requires explicit "Toch opslaan".

### Remove dialog
Cancel shift or remove employee. Required reason (ziek, op verzoek opdrachtgever, dubbel gepland, anders + free text). If shift date is within `notice_days`, shows "De opdrachtgever krijgt automatisch bericht" with message preview.

### Wijzigingslog
Timeline, filterable by shift, employee, action, actor. Shows who, when, what (before/after diff), why. Cancelled shifts listed and traceable.

### Outbox
List of client messages (short-notice flag, sent state). Optional "Stuur ook naar mij" email field: sends the real email via Resend; address used once, rate-limited, not stored in the log.

### Medewerker (mobile-first)
- Mijn diensten with Dag / Week / Maand tabs, Maps link per location.
- Beschikbaarheid: set unavailable windows with reason (immediately visible to planner as conflicts).
- Open diensten: only shifts matching the employee's functions and not causing a conflict for them; accept with one tap.
- Afmelden: required reason; shift becomes open, log entry, client message if short notice.

### Opdrachtgever (read-only)
Pick a location: its shifts (Week / Maand, filled/open) and an inbox of automatic notifications.

### Settings
`notice_days` (default 7): changes to shifts within this many days trigger a client message; later changes only go to the log. The client left this threshold open; the demo makes it configurable.

## Testing

- Vitest: conflict engine (each conflict + each trap as named case, plus golden test over the full dataset asserting exactly the 15 above), recurrence (all 9 rules), message rules (notice threshold).
- Playwright happy path: login, create shift with conflict, see warning, remove with reason, verify log + outbox.

## Privacy and security

Fictional data only. RLS per workspace; change log insert-only. First names only; BSN, documents and other sensitive profile data deliberately out of scope (A4 notes role-based access as next step). Reviewer email used once, rate-limited. Sandbox cleanup after 7 days. Secrets only in Vercel env.

## Deliverables

- Vercel deployment + demo login.
- `docs/ai-log.md`: running log of prompts, decisions and corrections (raw material for the A4).
- Video script (~9 min, Dutch) and A4 draft (Dutch).

## Out of scope

Real per-role accounts, push notifications, shift swapping, hours/invoicing, document management, client portal beyond read-only, multi-week source data beyond what recurrence generates.

## Stretch

"Stel geschikte medewerker voor" on open shifts: ranks employees by matching function, availability, no overlap/travel conflict, current hours that week.
