# AllKidz Planning (demo)

Demo of a planning app for AllKidz: a planner (Sanne) plans shifts and immediately sees problems. Built on the supplied fictional test data (293 shifts in the week of 19 to 23 October 2026, 40 employees, 28 locations).

## What it does

- **Planbord** with Dag / Lijst / Week / Maand views. The day view shows each employee's whole day in time order, with the transfer between shifts ("10 min, reistijd 25 min").
- **Conflict detection**: overlap, too little travel time, unavailable, wrong function. Every conflict is explained in plain Dutch. A gap exactly equal to the travel time is shown as "krap" (tight), not as a conflict.
- **Search and filters** (employee, location, function, only conflicts, only open), kept in the URL.
- **New shift with recurrence**: one date, loose dates (calendar), or a pattern (weekly, every other week, every third Friday of the month). Every generated date is checked for conflicts before saving.
- **Change log**: who, when, what (before and after) and why. A reason is required for every removal. The log is append-only, enforced in the database.
- **Automatic client message** for changes within the notice period (default 7 days, configurable), with an optional real email.
- **Employee app** (phone layout): own shifts per day / week / month, report unavailability, accept open shifts that match the employee's function and schedule, cancel with a reason.
- **Client view** (read-only): the location's shifts and the notifications it received.
- **Suggest an employee** for an open shift: right function, available, no overlap, enough travel time, fewest hours that week first.

## Demo login

One shared login (sent separately). Each login gets its own fresh copy of the test data (anonymous Supabase user + its own workspace, isolated with row level security), so reviewers never see each other's changes. "Reset demo" restores the test data. Use "Bekijk als" in the header to switch between planner, an employee and a client.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + publishable key, demo login, optional Resend key
npm run dev
```

The database schema and seed are in `supabase/migrations/` (apply in order to a Supabase project with anonymous sign-ins enabled).

## Tests

```bash
npm test          # Vitest: conflict engine incl. a golden test over all 293 shifts, recurrence, filters, messages
npm run e2e       # Playwright happy path against the dev server
```

The golden test asserts that the engine finds exactly the 15 known conflicts in the test data and none of the look-alikes (gap equal to travel time, back to back at the same location, shift ending exactly when unavailability starts, open shifts).

## Architecture

- Next.js 16 (App Router, Cache Components), React 19, Tailwind v4, shadcn/ui (Base UI).
- Supabase Postgres with RLS per workspace; `change_log` has insert and select only.
- All planning logic is pure TypeScript in `src/lib/` (no React, no database), so it is fast and fully unit-tested: `conflicts/`, `recurrence.ts`, `filters.ts`, `notice.ts`, `messages.ts`, `suggest.ts`.
- Pages load the whole workspace once (about 300 shifts) and filter and detect conflicts in memory. Writes go through server actions that also write the change log and client messages.
- Test data import: `scripts/import_testdata.py` turns the Excel file into a JSON fixture (used by the tests) and the seed SQL.

## Known limitations

- Roles are switched inside the app ("Bekijk als"); there are no separate accounts per role.
- Conflicts are computed in the browser for the whole dataset. Fine for hundreds of shifts; for a real year of data this would move to the server per week.
- No push notifications, shift swapping, hours registration or invoicing.
