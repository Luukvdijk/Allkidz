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
