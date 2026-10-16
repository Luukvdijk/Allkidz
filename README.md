# AllKidz Planning (demo)

A planning app for AllKidz, built as a candidate assignment. A planner plans shifts for KidzCoaches at childcare locations, schools and pools, and immediately sees what goes wrong: someone planned in two places at once, too little travel time between locations, or a shift while unavailable.

**Live demo:** https://allkidz.luukvandijk.com (login details are sent separately). Every login gets its own fresh copy of the fictional test data, so nothing you change is visible to anyone else.

## What it does

The four parts of the assignment:

- **Create and repeat shifts:** employee, location, times and function; once, on loose dates (calendar) or as a pattern (every week, every other week, the third Friday of the month). Every generated date is checked for conflicts before saving, and dates in the past cannot be picked.
- **Day overview per employee:** the whole day in time order with the transfer between shifts ("10 min, travel time 25 min"). Conflicts: overlap, too little travel time, unavailable and wrong function, each explained in plain Dutch. A gap exactly equal to the travel time is shown as "krap" (tight), not as a conflict.
- **Search and filter** over all 293 shifts: by day, employee, location, function, only conflicts or only open shifts. Filtering runs in the browser on data that is already loaded, so it is instant; the filters live in the URL.
- **Change log:** who, when, what (before and after) and why. A reason is required for every removal. The log is append-only, enforced in the database.

On top of that:

- **Dashboard** for this week and the next: shifts and fill rate, open shifts, conflicts, requests, licences and bags, with every number linking to the place where it can be acted on.
- **Planbord** with day, list, week and month views. On the day view, employees with a conflict get their own section, and "Iemand anders" suggests who can take a shift over without a new conflict.
- **Suggest an employee** for an open shift: right function, valid licences, available, no overlap, enough travel time, fewest hours that week first.
- **Automatic client message** for changes within the notice period (7 days by default, configurable), without the private reason.
- **Employee web app** (app layout on a phone, a normal page on a laptop): own shifts, report unavailability, accept matching open shifts, cancel with a reason.
- **Employee page for the planner:** hours per week, conflicts, upcoming shifts, licences and recent changes.
- **From the AllKidz feature list:** licences with expiry dates (required per location type), a client portal (planning per location, shift requests, locations, coach profiles without surname or BSN) and sport bags (a bag stays with one coach for the day; two coaches with the same bag is a conflict; missing items are reported from the employee app).

Roles are switched with "Bekijk als" in the header (planner, an employee or a client).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components), React 19, TypeScript
- Tailwind CSS v4 and shadcn/ui on Base UI
- [Supabase](https://supabase.com): Postgres with Row Level Security, anonymous sign-in per demo login
- Resend for the optional real email of a client message
- Vitest for unit tests, Playwright for end-to-end tests

## How it is built

- **Planning logic is plain TypeScript in `src/lib/`**, without React or database, so it is fast and fully unit-tested. The conflict engine is in `src/lib/conflicts/`.
- **Pages load the whole workspace once** (about 300 shifts) and filter and detect conflicts in memory.
- **Writes go through server actions** in `src/app/actions/`. They validate the input again on the server, write the change log, and send the client message when a change falls within the notice period.
- **Each demo login is an anonymous Supabase user with its own workspace.** Row Level Security limits every table to that workspace. The function that creates a workspace returns the existing one when it is called again, so the database cannot be filled by calling it in a loop. Workspaces are removed after 7 days by a scheduled job.

```
src/
  app/              routes (planbord, dashboard, aanvragen, tassen, medewerkers, log, ...) and server actions
  components/       screens per area (planbord, shift form, employee app, client portal, bags, dashboard)
  lib/
    conflicts/      conflict engine: overlap, travel time, unavailable, function, licence, bag
    recurrence.ts   loose dates and patterns
    filters.ts      filters kept in the URL
    suggest.ts      ranking of suitable employees
    dashboard.ts    numbers for the dashboard
    data/           loading from Supabase
supabase/migrations/  schema, Row Level Security, seed data
scripts/            test data import and the self-made extra data
tests/              unit tests (Vitest)
e2e/                end-to-end tests (Playwright)
```

## Test data

- `data/source/Testdata-planning-app.xlsx` is the supplied fictional test data (293 shifts in the week of 19 to 23 October 2026, 40 employees, 28 locations). `scripts/import_testdata.py` turns it into the JSON fixture used by the tests and into the seed SQL.
- The supplied data has no licences, clients or bags. `data/aanvullende-testdata.json` is a **self-made, fictional** addition, generated by `scripts/make_extra_testdata.py`, checked independently by `scripts/analyze_extra.py` and turned into SQL by `scripts/seed_extra_sql.py`.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key, the demo login and optionally a Resend key
npm run dev
```

Apply the migrations in `supabase/migrations/` in order to a Supabase project with anonymous sign-ins enabled.

## Tests

```bash
npm test            # unit tests
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm run e2e         # end-to-end tests against the dev server
```

The unit tests include two golden tests over the full dataset. The first asserts that the engine finds exactly the 15 known conflicts in the supplied data and none of the look-alikes: a gap equal to the travel time, back to back at the same location, a shift ending exactly when unavailability starts, and open shifts. The second adds the self-made data: 15 + 4 licence conflicts + 1 bag double, with its own traps, such as a licence expiring on the shift date or the same coach using one bag twice.

The end-to-end tests are most reliable one at a time (`npm run e2e -- --workers=1`) or against a production build, because a first-time page compile on the dev server can reload a page in a parallel test.

## Known limitations

- Roles are switched inside the demo ("Bekijk als"); there are no separate accounts per role yet.
- Conflicts are computed in the browser for the loaded data. That is fine for hundreds of shifts; for a full year of data this would move to the server per week.
- Not included: push notifications, swapping shifts, hours registration and invoicing.
