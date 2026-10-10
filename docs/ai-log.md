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
