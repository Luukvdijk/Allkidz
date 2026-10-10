# AI-log

Running notes on how AI (Claude Code) was used, what was decided, and what had to be corrected. Raw material for the A4.

## 2026-10-10: analysis and design

- Fed the assignment, feature list and test data to Claude Code. Asked it to summarise the core requirements and the evaluation criteria before designing anything.
- Did not trust the "conflicts" in the data blindly: had Claude write a throwaway analysis script over the test data to count real conflicts and look for look-alikes. Result: 15 real conflicts (5 overlap, 4 travel, 4 unavailable, 2 wrong function) and several traps (gap exactly equal to travel time, back-to-back at the same location, shift ending exactly when unavailability starts, 22 open shifts). These became the fixed test cases.
- Design choices made by me (Claude proposed options, I picked):
  - Supabase instead of browser-only storage (more realistic; shared change log).
  - One demo login, but a fresh sandbox per login so reviewers do not break each other's demo; role switcher "Bekijk als" instead of separate accounts.
  - Extras: employee mobile screen + automatic client message (cover Sanne's problems 3 and 4). Automation as stretch.
  - Client message only for short-notice changes, threshold configurable (default 7 days), because AllKidz left it open.
  - Added Day / Week / Month views on top of the proposed design (from feature list items 6, 21, 29).
- Verified recurrence example dates (third Friday Nov 2026 = 20 Nov) with a script instead of trusting the model.

## 2026-10-10: pure logic first (conflicts, recurrence, filters)

- Order chosen: all domain logic as pure TypeScript with tests before any UI or database. Reason: "werkt de kern zonder valse meldingen" is the main criterion, and pure functions are easy to verify.
- Golden test: the engine runs over all 293 shifts and must find exactly the 15 known conflicts (ids listed in the test) and none of the traps. Passed on the first run because the expected list came from the independent analysis script, not from the engine itself.
- Boundary rules made explicit in code comments and tests: touching shifts do not overlap, a gap equal to the travel time is fine (shown as "krap"), unavailability touching a shift edge is fine, 23:59 means end of day, open and cancelled shifts never conflict.
- Corrections I made to AI output:
  - Next.js 16.4 scaffolds with Cache Components on by default; the model's default patterns (revalidatePath, plain cookie reads in layouts) do not fit. Read the bundled Next docs first and switched to Suspense around request data and `refresh()` in actions.
  - npm peer conflict (vitest 5 needs @types/node 22+); fixed by aligning @types/node with the installed Node 22 instead of using --legacy-peer-deps.
  - shadcn now installs a package called `cn` instead of clsx + tailwind-merge; checked it is shadcn's own package (repo shadcn-ui/cn) before accepting it.
  - A recurrence test had a confused comment written mid-reasoning; rewrote it to state the anchoring rule ("the week of the start date is week 0").

## 2026-10-10: database, screens and verification

- Supabase: schema with RLS per workspace, append-only change log (no UPDATE/DELETE grant), seed function, cleanup cron.
- Verified instead of assumed:
  - Seed data copied into the database: compared an md5 checksum over all 293 shifts in Postgres with the same checksum over the local JSON. Identical.
  - Isolation: simulated two anonymous users in one SQL transaction. User 2 sees only their own 293 shifts and not user 1's change; reset restores. Tried to UPDATE the change log as a user: "permission denied".
  - Supabase security advisor flagged the two RPCs as callable by signed-in users. That is intended (they only touch the caller's own workspace), but it made me spot a real risk: calling create_workspace in a loop could fill the database. Made it idempotent (one workspace per visitor, unique constraint).
- Corrections I made to AI output:
  - Next 16 Cache Components threw "Date.now() during prerender" (inside supabase-js). Fix from the bundled docs: `await connection()` before request-time data.
  - Pages looked stuck on the loading skeleton in the in-app browser. Instead of changing code, inspected the DOM: the content had arrived in hidden Suspense containers and `document.hidden` was true. React waits for an animation frame to reveal streamed content, and hidden panes pause those. Not an app bug; nothing changed.
  - ESLint (React compiler rules) caught a component defined inside render (ListView table header) and unescaped quotes. Fixed.
  - The employee "Aannemen" toast promised that the client would see the change, even when no message is sent (change outside the notice period). Made it depend on whether a message was actually created.
- Tests: 64 unit tests (golden test included) and one Playwright end-to-end test (login, conflicts, krap, remove with reason, log, outbox). Production build green.

## 2026-10-11: licences, client portal, sport bags (branch dev)

- Scope decision with Claude: four pieces (licences, clients with locations, requests + coach profile, bags). Main stays the delivered version; this goes to dev so I can choose what to show.
- The supplied test data has none of this. Chose a transparent, self-made addition in a separate file, with a generator script and an independent analysis script, instead of editing their data. Asked Jesse whether that is OK.
- Picked the deliberate cases after looking at real shift counts: a "missing VOG" case would flood the board (everyone has 4+ shifts), so I replaced it with an extra BHV requirement on one busy shift.
- Verified instead of assumed:
  - Analysis script first (4 licence conflicts, 1 bag double, traps clean), then the second golden test. The original golden test still gives exactly 15.
  - Database checksum style check by counts, plus the two-visitor isolation test again for the new tables.
- Corrections I made to AI output:
  - Activities were first assigned to 07:30 morning shifts; nobody plays Jachtseizoen before school. Limited them to afternoon shifts.
  - The live check (`conflictsIfAssigned`) only looked at the employee's own day, so it would have missed a bag held by another coach. Wrote a failing test first, then included same-bag shifts.
  - A shared insert helper was first exported from a "use server" file, which would have made it a callable endpoint. Moved it to a server-only module.
  - New locations would have silently skipped the travel-time check (no data means no conflict). Added an explicit "reistijd onbekend" status with a test.
  - Supabase's advisor reported "anonymous access" on every table and policies on seed tables that have none. Checked: by design (anonymous demo logins, own-workspace policies) and a linter mix-up between same-named tables; only two missing seed indexes were real.
- Tests: 85 unit tests (two golden tests), three Playwright end-to-end tests (core flow; client request to planned coach with licences and new location; bag report). Lint clean, build green.
