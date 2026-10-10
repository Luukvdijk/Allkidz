# AllKidz Planning Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed web demo where planner Sanne plans shifts on the AllKidz test data and immediately sees overlap, travel-time, availability and function conflicts, with recurrence, filters, Dag/Week/Maand views, an append-only change log, automatic client messages and a mobile employee screen.

**Architecture:** Next.js 16 App Router on Vercel, Supabase Postgres with RLS. A shared demo login (checked server-side) signs the visitor in anonymously, so every login gets its own auth user and its own seeded workspace. All domain logic (conflicts, recurrence, notice rule, messages, filters) lives in pure TypeScript modules under `src/lib/` with Vitest tests, including a golden test over the full dataset. Pages load the whole workspace once (about 300 shifts) and compute conflicts and filters client-side in memory; writes go through server actions that also write the change log and client messages.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, shadcn/ui, @supabase/ssr + supabase-js, Resend, Vitest, Playwright, Vercel. Package manager: npm. UI copy in Dutch, no em-dashes anywhere.

**Spec:** `docs/superpowers/specs/2026-10-10-planning-demo-design.md`

**Deviation from spec (deliberate, simpler):** employee functions are stored as a `text[]` column on `employees` instead of a separate `employee_functions` table. A workspace also stores a `today` date (default `2026-10-16`) so the short-notice rule behaves the same whenever reviewers open the demo; it is editable on the settings page.

---

## File structure

```
allkidz-planning/
  scripts/import_testdata.py            xlsx -> testdata.json + seed SQL (stdlib python, run once)
  data/source/Testdata-planning-app.xlsx
  supabase/migrations/
    20261010120000_schema.sql           tables, RLS, grants, functions, cron
    20261010120100_seed_data.sql        generated: seed.* rows
  src/
    lib/
      types.ts                          domain types shared by everything
      time.ts                           HH:MM <-> minutes, ISO date helpers
      conflicts/travel.ts               symmetric travel-time lookup
      conflicts/detect.ts               detectConflicts()
      conflicts/timeline.ts             buildDayTimeline() (gaps, "krap")
      conflicts/candidate.ts            conflictsIfAssigned() for open shifts / form preview
      conflicts/index.ts                re-exports
      recurrence.ts                     RecurrenceRule, expandRule(), describeRule()
      notice.ts                         isShortNotice()
      messages.ts                       buildClientMessage()
      filters.ts                        Filters, parseFilters(), toQuery(), applyFilters()
      hours.ts                          shift duration and hour totals
      suggest.ts                        (stretch) rankCandidates()
      testdata/testdata.json            generated fixture (also used by tests)
      testdata/load.ts                  fixture -> PlanData (ids = names/codes)
      supabase/server.ts, client.ts     @supabase/ssr clients
      data/load.ts                      DB rows -> PlanData + Workspace
      data/actor.ts                     Actor type + labels
    app/
      login/page.tsx, login/actions.ts
      (app)/layout.tsx                  header: nav, RoleSwitcher, reset
      (app)/planbord/page.tsx
      (app)/log/page.tsx
      (app)/berichten/page.tsx
      (app)/instellingen/page.tsx
      (app)/medewerker/[id]/page.tsx
      (app)/opdrachtgever/[id]/page.tsx
      actions/shifts.ts, availability.ts, settings.ts, messages.ts, demo.ts
      actions/_log.ts                   shared: write log + client message
    components/
      ui/*                              shadcn
      RoleSwitcher.tsx, AppHeader.tsx
      planbord/Planbord.tsx, Toolbar.tsx, DayView.tsx, ListView.tsx, WeekView.tsx, MonthView.tsx, ShiftChip.tsx, ConflictBadge.tsx
      shift/ShiftSheet.tsx, RecurrenceInput.tsx, MiniCalendar.tsx, RemoveDialog.tsx
      log/LogTimeline.tsx
      berichten/Outbox.tsx
      medewerker/EmployeeApp.tsx
      opdrachtgever/ClientView.tsx
    proxy.ts                            session refresh + auth gate (Next 16 name for middleware)
  tests/
    time.test.ts, conflicts.test.ts, golden.test.ts, timeline.test.ts, candidate.test.ts,
    recurrence.test.ts, notice.test.ts, messages.test.ts, filters.test.ts, hours.test.ts
  e2e/happy-path.spec.ts
  docs/ai-log.md, docs/video-script.md, docs/toelichting.md
```

---

### Task 1: Scaffold

**Files:** project root

- [ ] **Step 1: Create Next app in the existing repo folder**

```bash
cd C:/Users/luukv/Documents/code/allkidz-planning
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack --yes
```
If it refuses because the folder is not empty, scaffold in `../allkidz-tmp` and move everything except `.git` into this folder.

- [ ] **Step 2: Dependencies**

```bash
npm i @supabase/ssr @supabase/supabase-js resend lucide-react
npm i -D vitest @vitest/coverage-v8 @playwright/test
npx shadcn@latest init -d
npx shadcn@latest add button input label select dialog sheet badge tabs textarea checkbox separator tooltip dropdown-menu sonner
```

- [ ] **Step 3: Vitest config** `vitest.config.ts`

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```
Add scripts to package.json: `"test": "vitest run"`, `"test:watch": "vitest"`, `"e2e": "playwright test"`, `"typecheck": "tsc --noEmit"`.

- [ ] **Step 4: Set `<html lang="nl">`, title "AllKidz Planning (demo)" in `src/app/layout.tsx`; replace `src/app/page.tsx` with `redirect("/planbord")`.**

- [ ] **Step 5: Verify** `npm run build` succeeds, `npm test` reports "No test files found" (exit code ok with `--passWithNoTests`; add that flag to the script).

- [ ] **Step 6: Commit** `chore: scaffold Next.js 16 + shadcn + vitest`

---

### Task 2: Test data import

**Files:** Create `scripts/import_testdata.py`, generated `src/lib/testdata/testdata.json`, generated `supabase/migrations/20261010120100_seed_data.sql`

- [ ] **Step 1: Write the script** (stdlib only, reads xlsx zip XML; run with `python -I`)

```python
"""Convert data/source/Testdata-planning-app.xlsx into
src/lib/testdata/testdata.json and a seed SQL migration. Stdlib only."""
import json, re, sys, zipfile
from pathlib import Path

ROOT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
XLSX = ROOT / "data/source/Testdata-planning-app.xlsx"
OUT_JSON = ROOT / "src/lib/testdata/testdata.json"
OUT_SQL = ROOT / "supabase/migrations/20261010120100_seed_data.sql"

def col(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n

def sheets(path):
    z = zipfile.ZipFile(path)
    ss = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in re.findall(r"<si>(.*?)</si>", z.read("xl/sharedStrings.xml").decode("utf8"), re.S):
            ss.append("".join(re.findall(r"<t[^>]*>([^<]*)</t>", si)))
    wb = z.read("xl/workbook.xml").decode("utf8")
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf8")
    target = {}
    for rel in re.findall(r"<Relationship [^>]*/>", rels):
        target[re.search(r'Id="([^"]+)"', rel).group(1)] = re.search(r'Target="([^"]+)"', rel).group(1)
    out = {}
    for name, rid in re.findall(r'<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"', wb):
        t = target[rid].lstrip("/")
        t = t if t.startswith("xl/") else "xl/" + t
        rows = []
        for row in re.findall(r"<row[^>]*>(.*?)</row>", z.read(t).decode("utf8"), re.S):
            cells = {}
            for attrs, body in re.findall(r"<c ([^>]*?)(?:/>|>(.*?)</c>)", row, re.S):
                ref = re.search(r'r="([A-Z]+\d+)"', attrs).group(1)
                typ = re.search(r't="(\w+)"', attrs)
                v = re.search(r"<v>(.*?)</v>", body or "")
                inline = re.findall(r"<t[^>]*>([^<]*)</t>", body or "")
                if typ and typ.group(1) == "s" and v:
                    val = ss[int(v.group(1))]
                elif inline:
                    val = "".join(inline)
                else:
                    val = v.group(1) if v else ""
                cells[col(ref)] = unescape(val).strip()
            if any(cells.values()):
                rows.append([cells.get(i, "") for i in range(1, max(cells) + 1)])
        out[name] = rows
    return out

def unescape(s):
    import html
    return html.unescape(s)

def table(rows):
    head, *body = rows
    return [dict(zip(head, r + [""] * (len(head) - len(r)))) for r in body]

S = sheets(XLSX)
employees = [{"name": r["medewerker"], "functions": [f.strip() for f in r["functies"].split(",")]} for r in table(S["Medewerkers"])]
locations = [{"name": r["locatie"], "type": r["type"], "city": r["plaats"]} for r in table(S["Locaties"])]
travel = [{"a": r["locatie_a"], "b": r["locatie_b"], "minutes": int(r["minuten"])} for r in table(S["Reistijden"])]
unavailability = [{"employee": r["medewerker"], "date": r["datum"], "from": r["van"], "to": r["tot"], "reason": r["reden"]} for r in table(S["Beschikbaarheid"])]
shifts = [{"code": r["dienst_id"], "date": r["datum"], "employee": r["medewerker"] or None, "location": r["locatie"],
           "start": r["start"], "end": r["eind"], "function": r["functie"], "note": r.get("opmerking") or None}
          for r in table(S["Diensten"])]
rules = [dict(r) for r in table(S["Vaste inzet"])]

assert len(shifts) == 293 and len(employees) == 40 and len(locations) == 28, (len(shifts), len(employees), len(locations))
data = {"employees": employees, "locations": locations, "travel": travel,
        "unavailability": unavailability, "shifts": shifts, "recurringRules": rules}
OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf8")

def q(v):
    return "null" if v is None else "'" + str(v).replace("'", "''") + "'"

lines = ["-- GENERATED by scripts/import_testdata.py. Do not edit by hand.",
         "truncate seed.employees, seed.locations, seed.travel, seed.unavailability, seed.shifts;"]
lines.append("insert into seed.employees (name, functions) values\n" + ",\n".join(
    f"({q(e['name'])}, array[{', '.join(q(f) for f in e['functions'])}]::text[])" for e in employees) + ";")
lines.append("insert into seed.locations (name, type, city) values\n" + ",\n".join(
    f"({q(l['name'])}, {q(l['type'])}, {q(l['city'])})" for l in locations) + ";")
lines.append("insert into seed.travel (a, b, minutes) values\n" + ",\n".join(
    f"({q(t['a'])}, {q(t['b'])}, {t['minutes']})" for t in travel) + ";")
lines.append("insert into seed.unavailability (employee, date, start_time, end_time, reason) values\n" + ",\n".join(
    f"({q(u['employee'])}, {q(u['date'])}, {q(u['from'])}, {q(u['to'])}, {q(u['reason'])})" for u in unavailability) + ";")
lines.append("insert into seed.shifts (code, date, employee, location, start_time, end_time, function, note) values\n" + ",\n".join(
    f"({q(s['code'])}, {q(s['date'])}, {q(s['employee'])}, {q(s['location'])}, {q(s['start'])}, {q(s['end'])}, {q(s['function'])}, {q(s['note'])})" for s in shifts) + ";")
OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
OUT_SQL.write_text("\n\n".join(lines) + "\n", encoding="utf8")
print("ok", len(shifts), "shifts")
```

- [ ] **Step 2: Run it**

```bash
python -I scripts/import_testdata.py "$(pwd)"
```
Expected: `ok 293 shifts`. Check `testdata.json` contains `"School Het Mozaïek"` (correct ï, not a replacement char).

- [ ] **Step 3: Commit** `feat: import fictional test data to json fixture and seed SQL`

---

### Task 3: Domain types and time helpers (TDD)

**Files:** Create `src/lib/types.ts`, `src/lib/time.ts`, Test `tests/time.test.ts`

- [ ] **Step 1: Types** `src/lib/types.ts`

```ts
export type FunctionName = string;

export interface Employee { id: string; name: string; functions: FunctionName[] }
export interface Location { id: string; name: string; type: string; city: string }
export interface TravelTime { a: string; b: string; minutes: number } // location ids
export interface Unavailability { id: string; employeeId: string; date: string; from: string; to: string; reason: string }
export type ShiftStatus = "active" | "cancelled";
export interface Shift {
  id: string; code: string; date: string; start: string; end: string;
  locationId: string; fn: FunctionName; employeeId: string | null;
  status: ShiftStatus; note: string | null; seriesId: string | null;
}
export interface PlanData {
  employees: Employee[]; locations: Location[]; travel: TravelTime[];
  unavailability: Unavailability[]; shifts: Shift[];
}
export type ConflictType = "overlap" | "travel" | "unavailable" | "function";
export interface Conflict {
  type: ConflictType; employeeId: string; date: string;
  shiftIds: string[];        // shifts involved (1 or 2)
  message: string;           // Dutch, human readable
}
```

- [ ] **Step 2: Failing tests** `tests/time.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { toMin, fromMin, addDays, weekday, mondayOf, daysBetween, monthGrid } from "@/lib/time";

describe("time", () => {
  it("parses HH:MM and treats 23:59 as end of day", () => {
    expect(toMin("07:30")).toBe(450);
    expect(toMin("23:59")).toBe(1440);
    expect(fromMin(450)).toBe("07:30");
  });
  it("date math on ISO dates without timezone drift", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(weekday("2026-10-19")).toBe(1); // Monday
    expect(weekday("2026-10-25")).toBe(7); // Sunday
    expect(mondayOf("2026-10-23")).toBe("2026-10-19");
    expect(daysBetween("2026-10-16", "2026-10-19")).toBe(3);
  });
  it("month grid starts on Monday and covers whole weeks", () => {
    const g = monthGrid("2026-11-15");
    expect(g[0]).toBe("2026-10-26");
    expect(g.length % 7).toBe(0);
    expect(g).toContain("2026-11-30");
  });
});
```

- [ ] **Step 3: Run** `npx vitest run tests/time.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement** `src/lib/time.ts`

```ts
export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  const v = h * 60 + m;
  return v === 1439 ? 1440 : v; // 23:59 means "until end of day"
}
export function fromMin(v: number): string {
  const h = Math.floor(v / 60), m = v % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
const toDate = (iso: string) => new Date(iso + "T00:00:00Z");
const toIso = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(iso: string, n: number): string {
  const d = toDate(iso); d.setUTCDate(d.getUTCDate() + n); return toIso(d);
}
/** 1 = Monday ... 7 = Sunday */
export function weekday(iso: string): number { const w = toDate(iso).getUTCDay(); return w === 0 ? 7 : w; }
export function mondayOf(iso: string): string { return addDays(iso, 1 - weekday(iso)); }
export function daysBetween(from: string, to: string): number {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86400000);
}
export function monthGrid(iso: string): string[] {
  const first = iso.slice(0, 8) + "01";
  const start = mondayOf(first);
  const d = toDate(first); d.setUTCMonth(d.getUTCMonth() + 1, 0);
  const last = toIso(d);
  const end = addDays(mondayOf(last), 6);
  const out: string[] = [];
  for (let x = start; x <= end; x = addDays(x, 1)) out.push(x);
  return out;
}
const DAYS = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const MONTHS = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
export function shortDate(iso: string): string {
  return `${DAYS[weekday(iso) - 1]} ${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}
export function monthLabel(iso: string): string {
  const full = ["januari","februari","maart","april","mei","juni","juli","augustus","september","oktober","november","december"];
  return `${full[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
}
```

- [ ] **Step 5: Run** → PASS. **Commit** `feat: domain types and time helpers`

---

### Task 4: Fixture loader + conflict engine (TDD)

**Files:** Create `src/lib/testdata/load.ts`, `src/lib/conflicts/travel.ts`, `src/lib/conflicts/detect.ts`, `src/lib/conflicts/index.ts`; Test `tests/conflicts.test.ts`, `tests/golden.test.ts`

- [ ] **Step 1: Fixture loader** `src/lib/testdata/load.ts` (ids are names / codes so tests read naturally)

```ts
import raw from "./testdata.json";
import type { PlanData } from "@/lib/types";

export function loadFixture(): PlanData {
  return {
    employees: raw.employees.map((e) => ({ id: e.name, name: e.name, functions: e.functions })),
    locations: raw.locations.map((l) => ({ id: l.name, name: l.name, type: l.type, city: l.city })),
    travel: raw.travel.map((t) => ({ a: t.a, b: t.b, minutes: t.minutes })),
    unavailability: raw.unavailability.map((u, i) => ({
      id: `U${i + 1}`, employeeId: u.employee, date: u.date, from: u.from, to: u.to, reason: u.reason,
    })),
    shifts: raw.shifts.map((s) => ({
      id: s.code, code: s.code, date: s.date, start: s.start, end: s.end, locationId: s.location,
      fn: s.function, employeeId: s.employee, status: "active" as const, note: s.note, seriesId: null,
    })),
  };
}
```
Add `"resolveJsonModule": true` to tsconfig if missing.

- [ ] **Step 2: Unit tests with small hand-made data** `tests/conflicts.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { detectConflicts } from "@/lib/conflicts";
import type { PlanData, Shift } from "@/lib/types";

const base: PlanData = {
  employees: [{ id: "noor", name: "Noor", functions: ["KidzCoach"] }],
  locations: [
    { id: "A", name: "BSO A", type: "BSO", city: "Leiden" },
    { id: "B", name: "TSO B", type: "TSO", city: "Katwijk" },
  ],
  travel: [{ a: "A", b: "B", minutes: 25 }],
  unavailability: [],
  shifts: [],
};
let n = 0;
const s = (p: Partial<Shift>): Shift => ({
  id: `S${++n}`, code: `S${n}`, date: "2026-10-19", start: "08:00", end: "10:00", locationId: "A",
  fn: "KidzCoach", employeeId: "noor", status: "active", note: null, seriesId: null, ...p,
});
const run = (shifts: Shift[], extra: Partial<PlanData> = {}) => detectConflicts({ ...base, ...extra, shifts });

describe("overlap", () => {
  it("flags overlapping shifts", () => {
    const c = run([s({ id: "a" }), s({ id: "b", start: "09:00", end: "11:00" })]);
    expect(c.map((x) => x.type)).toEqual(["overlap"]);
    expect(c[0].shiftIds.sort()).toEqual(["a", "b"]);
  });
  it("does not flag touching shifts on the same location", () => {
    expect(run([s({}), s({ start: "10:00", end: "12:00" })])).toEqual([]);
  });
  it("ignores open and cancelled shifts and other days", () => {
    expect(run([s({}), s({ employeeId: null })])).toEqual([]);
    expect(run([s({}), s({ status: "cancelled" })])).toEqual([]);
    expect(run([s({}), s({ date: "2026-10-20" })])).toEqual([]);
  });
});

describe("travel", () => {
  it("flags a gap shorter than travel time", () => {
    const c = run([s({}), s({ locationId: "B", start: "10:10", end: "12:00" })]);
    expect(c).toHaveLength(1);
    expect(c[0].type).toBe("travel");
    expect(c[0].message).toContain("10 min");
    expect(c[0].message).toContain("25 min");
  });
  it("accepts a gap exactly equal to travel time", () => {
    expect(run([s({}), s({ locationId: "B", start: "10:25", end: "12:00" })])).toEqual([]);
  });
  it("is symmetric in direction", () => {
    expect(run([s({ locationId: "B" }), s({ locationId: "A", start: "10:10", end: "12:00" })])).toHaveLength(1);
  });
});

describe("unavailable", () => {
  const un = (from: string, to: string) => ({ unavailability: [{ id: "u", employeeId: "noor", date: "2026-10-19", from, to, reason: "Tandarts" }] });
  it("flags a partial overlap with unavailability", () => {
    const c = run([s({})], un("09:30", "13:00"));
    expect(c[0].type).toBe("unavailable");
    expect(c[0].message).toContain("Tandarts");
  });
  it("does not flag when unavailability starts exactly at shift end", () => {
    expect(run([s({})], un("10:00", "23:59"))).toEqual([]);
  });
  it("whole day 00:00-23:59 flags any shift", () => {
    expect(run([s({ start: "18:00", end: "20:00" })], un("00:00", "23:59"))).toHaveLength(1);
  });
});

describe("function", () => {
  it("flags a shift whose function the employee does not have", () => {
    const c = run([s({ fn: "Gymdocent" })]);
    expect(c[0].type).toBe("function");
  });
});
```

- [ ] **Step 3: Golden test** `tests/golden.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { detectConflicts } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const key = (c: { type: string; shiftIds: string[] }) => `${c.type}:${[...c.shiftIds].sort().join("+")}`;

describe("golden: full test dataset", () => {
  const conflicts = detectConflicts(loadFixture());
  it("finds exactly the 15 known conflicts and nothing else", () => {
    expect(conflicts.map(key).sort()).toEqual([
      "function:D082", "function:D141",
      "overlap:D003+D132", "overlap:D008+D281", "overlap:D076+D083", "overlap:D105+D176", "overlap:D126+D193",
      "travel:D034+D254", "travel:D053+D121", "travel:D113+D263", "travel:D191+D198",
      "unavailable:D086", "unavailable:D135", "unavailable:D182", "unavailable:D274",
    ].sort());
  });
  it("does not flag the look-alike traps", () => {
    const flagged = new Set(conflicts.flatMap((c) => c.shiftIds));
    for (const id of ["D270", "D020", "D271", "D123", "D242", "D245", "D055"]) expect(flagged.has(id)).toBe(false);
  });
  it("never flags an open shift", () => {
    const open = loadFixture().shifts.filter((s) => !s.employeeId).map((s) => s.id);
    expect(open).toHaveLength(22);
    const flagged = new Set(conflicts.flatMap((c) => c.shiftIds));
    expect(open.some((id) => flagged.has(id))).toBe(false);
  });
});
```

- [ ] **Step 4: Run** `npx vitest run tests/conflicts.test.ts tests/golden.test.ts` → FAIL (module not found).

- [ ] **Step 5: Implement** `src/lib/conflicts/travel.ts`

```ts
import type { TravelTime } from "@/lib/types";
export type TravelLookup = (a: string, b: string) => number | null;
export function travelLookup(travel: TravelTime[]): TravelLookup {
  const m = new Map<string, number>();
  for (const t of travel) { m.set(`${t.a}|${t.b}`, t.minutes); m.set(`${t.b}|${t.a}`, t.minutes); }
  return (a, b) => (a === b ? 0 : m.get(`${a}|${b}`) ?? null);
}
```

`src/lib/conflicts/detect.ts`

```ts
import type { Conflict, PlanData, Shift } from "@/lib/types";
import { toMin } from "@/lib/time";
import { travelLookup } from "./travel";

export function groupByEmployeeDay(shifts: Shift[]): Map<string, Shift[]> {
  const g = new Map<string, Shift[]>();
  for (const s of shifts) {
    if (!s.employeeId || s.status !== "active") continue;
    const k = `${s.employeeId}|${s.date}`;
    (g.get(k) ?? g.set(k, []).get(k)!).push(s);
  }
  for (const list of g.values()) list.sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
  return g;
}

export function detectConflicts(data: PlanData): Conflict[] {
  const out: Conflict[] = [];
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const emp = new Map(data.employees.map((e) => [e.id, e]));
  const travel = travelLookup(data.travel);
  const unav = new Map<string, PlanData["unavailability"]>();
  for (const u of data.unavailability) {
    const k = `${u.employeeId}|${u.date}`;
    (unav.get(k) ?? unav.set(k, []).get(k)!).push(u);
  }

  for (const [key, list] of groupByEmployeeDay(data.shifts)) {
    const [employeeId, date] = key.split("|");
    // overlap: every pair
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (toMin(b.start) < toMin(a.end) && toMin(a.start) < toMin(b.end))
          out.push({ type: "overlap", employeeId, date, shiftIds: [a.id, b.id],
            message: `${a.code} (${a.start}-${a.end}) overlapt met ${b.code} (${b.start}-${b.end})` });
      }
    // travel: consecutive non-overlapping pairs
    for (let i = 0; i + 1 < list.length; i++) {
      const a = list[i], b = list[i + 1];
      const gap = toMin(b.start) - toMin(a.end);
      if (gap < 0) continue;
      const need = travel(a.locationId, b.locationId);
      if (need !== null && gap < need)
        out.push({ type: "travel", employeeId, date, shiftIds: [a.id, b.id],
          message: `Te weinig reistijd: ${gap} min tussen ${loc.get(a.locationId)} en ${loc.get(b.locationId)}, nodig ${need} min` });
    }
    // unavailable + function: per shift
    for (const s of list) {
      for (const u of unav.get(key) ?? [])
        if (toMin(s.start) < toMin(u.to) && toMin(u.from) < toMin(s.end))
          out.push({ type: "unavailable", employeeId, date, shiftIds: [s.id],
            message: u.from === "00:00" && u.to === "23:59"
              ? `Niet beschikbaar (hele dag): ${u.reason}`
              : `Niet beschikbaar ${u.from}-${u.to}: ${u.reason}` });
      const e = emp.get(employeeId);
      if (e && !e.functions.includes(s.fn))
        out.push({ type: "function", employeeId, date, shiftIds: [s.id],
          message: `${e.name} heeft geen functie ${s.fn} (wel: ${e.functions.join(", ")})` });
    }
  }
  return out;
}

export function conflictsByShift(conflicts: Conflict[]): Map<string, Conflict[]> {
  const m = new Map<string, Conflict[]>();
  for (const c of conflicts) for (const id of c.shiftIds) (m.get(id) ?? m.set(id, []).get(id)!).push(c);
  return m;
}
```

`src/lib/conflicts/index.ts`

```ts
export * from "./detect";
export * from "./travel";
export * from "./timeline";
export * from "./candidate";
```
(Create `timeline.ts` and `candidate.ts` as empty `export {};` for now so the barrel compiles.)

- [ ] **Step 6: Run** → all PASS. If the golden test fails, print the diff and inspect the data before changing the rule; never adjust expected values to make it pass without checking the source row.

- [ ] **Step 7: Commit** `feat: conflict engine with golden test over full dataset`

---

### Task 5: Day timeline ("krap") and candidate check (TDD)

**Files:** Modify `src/lib/conflicts/timeline.ts`, `src/lib/conflicts/candidate.ts`; Test `tests/timeline.test.ts`, `tests/candidate.test.ts`

- [ ] **Step 1: Failing tests** `tests/timeline.test.ts`

```ts
import { it, expect } from "vitest";
import { buildDayTimeline } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const data = loadFixture();
it("Gijs on Friday has a tight but valid transfer", () => {
  const t = buildDayTimeline(data, "Gijs", "2026-10-23");
  const gap = t.gaps.find((g) => g.fromShiftId === "D270")!;
  expect(gap).toMatchObject({ toShiftId: "D020", gap: 20, need: 20, status: "krap" });
});
it("Niels back-to-back at the same location is ok", () => {
  const t = buildDayTimeline(data, "Niels", "2026-10-21");
  expect(t.gaps.find((g) => g.fromShiftId === "D242")?.status).toBe("ok");
});
it("Mila has a travel problem and shifts are sorted by time", () => {
  const t = buildDayTimeline(data, "Mila", "2026-10-21");
  expect(t.shifts.map((s) => s.start)).toEqual([...t.shifts.map((s) => s.start)].sort());
  expect(t.gaps.find((g) => g.fromShiftId === "D254")?.status).toBe("te-krap");
});
```

`tests/candidate.test.ts`

```ts
import { it, expect } from "vitest";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { loadFixture } from "@/lib/testdata/load";

const data = loadFixture();
it("reports conflicts for a hypothetical assignment without mutating data", () => {
  const open = data.shifts.find((s) => s.id === "D010")!; // Fri TSO Het Kompas 12:00-13:15
  const before = JSON.stringify(data);
  const c = conflictsIfAssigned(data, open, "Hana"); // Hana works TSO De Brug Fri 12:00
  expect(c.some((x) => x.type === "overlap")).toBe(true);
  expect(JSON.stringify(data)).toBe(before);
});
it("returns no conflicts for a free employee with the right function", () => {
  const open = data.shifts.find((s) => s.id === "D010")!;
  const free = data.employees.find((e) => e.functions.includes("KidzCoach") &&
    !data.shifts.some((s) => s.employeeId === e.id && s.date === open.date && s.start < "13:45" && s.end > "11:30"))!;
  expect(conflictsIfAssigned(data, open, free.id).filter((c) => c.shiftIds.includes(open.id))).toEqual([]);
});
```
Before relying on D010/Hana: verify in testdata.json that D041 is Hana, Fri, TSO De Brug 12:00-13:15 and D010 is open Fri TSO Het Kompas 12:00-13:15 (both true per the analysis on 2026-10-10).

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `src/lib/conflicts/timeline.ts`

```ts
import type { PlanData, Shift } from "@/lib/types";
import { toMin } from "@/lib/time";
import { travelLookup } from "./travel";

export type GapStatus = "ok" | "krap" | "te-krap" | "overlap";
export interface Gap { fromShiftId: string; toShiftId: string; gap: number; need: number | null; status: GapStatus }
export interface DayTimeline { shifts: Shift[]; gaps: Gap[] }

export function buildDayTimeline(data: PlanData, employeeId: string, date: string): DayTimeline {
  const shifts = data.shifts
    .filter((s) => s.employeeId === employeeId && s.date === date && s.status === "active")
    .sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(a.end) - toMin(b.end));
  const travel = travelLookup(data.travel);
  const gaps: Gap[] = [];
  for (let i = 0; i + 1 < shifts.length; i++) {
    const a = shifts[i], b = shifts[i + 1];
    const gap = toMin(b.start) - toMin(a.end);
    const need = travel(a.locationId, b.locationId);
    let status: GapStatus = "ok";
    if (gap < 0) status = "overlap";
    else if (need !== null && gap < need) status = "te-krap";
    else if (need !== null && need > 0 && gap === need) status = "krap";
    gaps.push({ fromShiftId: a.id, toShiftId: b.id, gap, need, status });
  }
  return { shifts, gaps };
}
```

`src/lib/conflicts/candidate.ts`

```ts
import type { Conflict, PlanData, Shift } from "@/lib/types";
import { detectConflicts } from "./detect";

/** Conflicts that would involve `shift` if it were assigned to employeeId. Pure. */
export function conflictsIfAssigned(data: PlanData, shift: Shift, employeeId: string): Conflict[] {
  const probe = { ...shift, employeeId, status: "active" as const };
  const sameDay = data.shifts.filter((s) => s.id !== shift.id && s.employeeId === employeeId && s.date === shift.date);
  const subset: PlanData = { ...data, shifts: [...sameDay, probe] };
  return detectConflicts(subset).filter((c) => c.shiftIds.includes(probe.id));
}
```

- [ ] **Step 4: Run** → PASS. **Commit** `feat: day timeline with tight-transfer signal and candidate conflict check`

---

### Task 6: Recurrence (TDD)

**Files:** Create `src/lib/recurrence.ts`; Test `tests/recurrence.test.ts`

- [ ] **Step 1: Failing tests** (all 9 vaste-inzet rules)

```ts
import { describe, it, expect } from "vitest";
import { expandRule, describeRule, type RecurrenceRule } from "@/lib/recurrence";

const cases: [string, RecurrenceRule, string[] | ((d: string[]) => void)][] = [
  ["V1 ma+wo", { kind: "weekly", weekdays: [1, 3], interval: 1, from: "2026-11-02", to: "2026-11-25" },
    ["2026-11-02","2026-11-04","2026-11-09","2026-11-11","2026-11-16","2026-11-18","2026-11-23","2026-11-25"]],
  ["V2 wo", { kind: "weekly", weekdays: [3], interval: 1, from: "2026-11-04", to: "2026-11-25" },
    ["2026-11-04","2026-11-11","2026-11-18","2026-11-25"]],
  ["V3 derde vrijdag", { kind: "monthly", weekday: 5, nth: 3, from: "2026-11-01", to: "2026-12-31" },
    ["2026-11-20","2026-12-18"]],
  ["V4 di+do", { kind: "weekly", weekdays: [2, 4], interval: 1, from: "2026-11-03", to: "2026-12-17" },
    (d) => { expect(d).toHaveLength(14); expect(d[0]).toBe("2026-11-03"); expect(d.at(-1)).toBe("2026-12-17"); }],
  ["V5 ma t/m vr", { kind: "weekly", weekdays: [1,2,3,4,5], interval: 1, from: "2026-11-02", to: "2026-12-04" },
    (d) => { expect(d).toHaveLength(25); expect(d.every((x) => x >= "2026-11-02" && x <= "2026-12-04")).toBe(true); }],
  ["V6 wo om de week", { kind: "weekly", weekdays: [3], interval: 2, from: "2026-11-04", to: "2026-12-16" },
    ["2026-11-04","2026-11-18","2026-12-02","2026-12-16"]],
  ["V7 vr", { kind: "weekly", weekdays: [5], interval: 1, from: "2026-11-06", to: "2026-12-18" },
    (d) => expect(d).toHaveLength(7)],
  ["V8 di+do", { kind: "weekly", weekdays: [2, 4], interval: 1, from: "2026-11-03", to: "2026-11-26" },
    (d) => expect(d).toHaveLength(8)],
  ["V9 do", { kind: "weekly", weekdays: [4], interval: 1, from: "2026-11-05", to: "2026-11-26" },
    ["2026-11-05","2026-11-12","2026-11-19","2026-11-26"]],
];

describe("expandRule: vaste-inzet rules", () => {
  for (const [name, rule, expected] of cases)
    it(name, () => {
      const d = expandRule(rule);
      if (typeof expected === "function") expected(d); else expect(d).toEqual(expected);
    });
});

describe("other modes", () => {
  it("once and loose dates are sorted and deduplicated", () => {
    expect(expandRule({ kind: "once", date: "2026-10-20" })).toEqual(["2026-10-20"]);
    expect(expandRule({ kind: "dates", dates: ["2026-10-23", "2026-10-19", "2026-10-23"] })).toEqual(["2026-10-19", "2026-10-23"]);
  });
  it("last weekday of month (nth = -1)", () => {
    expect(expandRule({ kind: "monthly", weekday: 5, nth: -1, from: "2026-11-01", to: "2026-11-30" })).toEqual(["2026-11-27"]);
  });
  it("caps runaway ranges at 366 dates", () => {
    expect(expandRule({ kind: "weekly", weekdays: [1,2,3,4,5,6,7], interval: 1, from: "2026-01-01", to: "2030-01-01" })).toHaveLength(366);
  });
  it("describes rules in Dutch", () => {
    expect(describeRule({ kind: "monthly", weekday: 5, nth: 3, from: "2026-11-01", to: "2026-12-31" })).toBe("Elke derde vrijdag van de maand");
    expect(describeRule({ kind: "weekly", weekdays: [3], interval: 2, from: "2026-11-04", to: "2026-12-16" })).toBe("Elke woensdag, om de week");
  });
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `src/lib/recurrence.ts`

```ts
import { addDays, mondayOf, weekday, daysBetween } from "@/lib/time";

export type RecurrenceRule =
  | { kind: "once"; date: string }
  | { kind: "dates"; dates: string[] }
  | { kind: "weekly"; weekdays: number[]; interval: number; from: string; to: string }
  | { kind: "monthly"; weekday: number; nth: number; from: string; to: string }; // nth 1..4 or -1 = last

const MAX = 366;

export function expandRule(rule: RecurrenceRule): string[] {
  switch (rule.kind) {
    case "once": return [rule.date];
    case "dates": return [...new Set(rule.dates)].sort();
    case "weekly": {
      const out: string[] = [];
      const anchor = mondayOf(rule.from);
      for (let d = rule.from; d <= rule.to && out.length < MAX; d = addDays(d, 1)) {
        const week = Math.floor(daysBetween(anchor, mondayOf(d)) / 7);
        if (week % Math.max(1, rule.interval) === 0 && rule.weekdays.includes(weekday(d))) out.push(d);
      }
      return out;
    }
    case "monthly": {
      const out: string[] = [];
      for (let d = rule.from; d <= rule.to && out.length < MAX; d = addDays(d, 1)) {
        if (weekday(d) !== rule.weekday) continue;
        const day = Number(d.slice(8));
        const nthOk = rule.nth === -1
          ? addDays(d, 7).slice(0, 7) !== d.slice(0, 7)
          : Math.ceil(day / 7) === rule.nth;
        if (nthOk) out.push(d);
      }
      return out;
    }
  }
}

const DAY = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const NTH: Record<number, string> = { 1: "eerste", 2: "tweede", 3: "derde", 4: "vierde", [-1]: "laatste" };

export function describeRule(rule: RecurrenceRule): string {
  switch (rule.kind) {
    case "once": return "Eenmalig";
    case "dates": return `${rule.dates.length} losse datum${rule.dates.length === 1 ? "" : "s"}`;
    case "weekly": {
      const sorted = [...rule.weekdays].sort();
      const days = sorted.join() === "1,2,3,4,5" ? "dag van maandag t/m vrijdag"
        : sorted.map((d) => DAY[d - 1]).join(sorted.length === 2 ? " en " : ", ");
      return `Elke ${days}${rule.interval === 2 ? ", om de week" : rule.interval > 2 ? `, elke ${rule.interval} weken` : ""}`;
    }
    case "monthly": return `Elke ${NTH[rule.nth]} ${DAY[rule.weekday - 1]} van de maand`;
  }
}
```

- [ ] **Step 4: Run** → PASS. **Commit** `feat: recurrence (loose dates, weekly/biweekly, nth weekday of month)`

---

### Task 7: Notice rule, client messages, hours (TDD)

**Files:** Create `src/lib/notice.ts`, `src/lib/messages.ts`, `src/lib/hours.ts`; Tests `tests/notice.test.ts`, `tests/messages.test.ts`, `tests/hours.test.ts`

- [ ] **Step 1: Failing tests**

`tests/notice.test.ts`
```ts
import { it, expect } from "vitest";
import { isShortNotice } from "@/lib/notice";
it("short notice when the shift is within noticeDays of today (inclusive)", () => {
  expect(isShortNotice("2026-10-19", "2026-10-16", 7)).toBe(true);
  expect(isShortNotice("2026-10-23", "2026-10-16", 7)).toBe(true);
  expect(isShortNotice("2026-10-24", "2026-10-16", 7)).toBe(false);
  expect(isShortNotice("2026-11-20", "2026-10-16", 7)).toBe(false);
});
it("past shifts are not notified", () => {
  expect(isShortNotice("2026-10-15", "2026-10-16", 7)).toBe(false);
});
```

`tests/messages.test.ts`
```ts
import { it, expect } from "vitest";
import { buildClientMessage } from "@/lib/messages";
const shift = { code: "D041", date: "2026-10-23", start: "12:00", end: "13:15", fn: "KidzCoach" };
it("employee removed: names the shift, the change and that it is now open", () => {
  const m = buildClientMessage({ action: "employee_removed", shift, locationName: "TSO De Brug", employeeName: "Hana" });
  expect(m.subject).toBe("Wijziging dienst vr 23 okt 12:00-13:15 (TSO De Brug)");
  expect(m.body).toContain("Hana");
  expect(m.body).toContain("zoeken een vervanger");
  expect(m.body).not.toContain("—");
});
it("cancelled shift", () => {
  const m = buildClientMessage({ action: "shift_cancelled", shift, locationName: "TSO De Brug", employeeName: null });
  expect(m.body).toContain("geannuleerd");
});
it("does not leak the internal reason to the client", () => {
  const m = buildClientMessage({ action: "employee_cancelled_self", shift, locationName: "TSO De Brug", employeeName: "Hana" });
  expect(m.body).not.toMatch(/ziek|tentamen/i);
});
```

`tests/hours.test.ts`
```ts
import { it, expect } from "vitest";
import { durationMin, hoursLabel } from "@/lib/hours";
it("duration and label", () => {
  expect(durationMin({ start: "14:45", end: "18:00" })).toBe(195);
  expect(hoursLabel(195)).toBe("3u15");
  expect(hoursLabel(120)).toBe("2u");
});
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement**

`src/lib/notice.ts`
```ts
import { daysBetween } from "@/lib/time";
/** Client is notified for changes to shifts from today up to and including today + noticeDays. */
export function isShortNotice(shiftDate: string, today: string, noticeDays: number): boolean {
  const d = daysBetween(today, shiftDate);
  return d >= 0 && d <= noticeDays;
}
```

`src/lib/messages.ts`
```ts
import { shortDate } from "@/lib/time";

export type ClientAction =
  | "employee_removed" | "employee_cancelled_self" | "shift_cancelled" | "shift_updated" | "employee_assigned";

interface Input {
  action: ClientAction;
  shift: { code: string; date: string; start: string; end: string; fn: string };
  locationName: string;
  employeeName: string | null;
  changes?: string; // for shift_updated, e.g. "Tijd: 12:00-13:15 wordt 12:30-13:45"
}

/** Message to the client (opdrachtgever). Never includes the internal reason (privacy). */
export function buildClientMessage({ action, shift, locationName, employeeName, changes }: Input) {
  const when = `${shortDate(shift.date)} ${shift.start}-${shift.end}`;
  const subject = `Wijziging dienst ${when} (${locationName})`;
  const intro = `Beste opdrachtgever,\n\nEr is een wijziging in de dienst ${shift.fn} op ${when} bij ${locationName} (${shift.code}).`;
  const line = {
    employee_removed: `${employeeName} komt niet meer naar deze dienst. We zoeken een vervanger en laten het je weten zodra die bekend is.`,
    employee_cancelled_self: `${employeeName} heeft zich afgemeld voor deze dienst. We zoeken een vervanger en laten het je weten zodra die bekend is.`,
    shift_cancelled: `Deze dienst is geannuleerd.`,
    shift_updated: `De dienst is aangepast. ${changes ?? ""}`.trim(),
    employee_assigned: `${employeeName} is ingepland op deze dienst.`,
  }[action];
  return { subject, body: `${intro}\n\n${line}\n\nMet vriendelijke groet,\nPlanning AllKidz` };
}
```

`src/lib/hours.ts`
```ts
import { toMin } from "@/lib/time";
export const durationMin = (s: { start: string; end: string }) => toMin(s.end) - toMin(s.start);
export function hoursLabel(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}u${String(m).padStart(2, "0")}` : `${h}u`;
}
```

- [ ] **Step 4: Run** → PASS. **Commit** `feat: short-notice rule, client message builder, hours`

---

### Task 8: Filters (TDD)

**Files:** Create `src/lib/filters.ts`; Test `tests/filters.test.ts`

- [ ] **Step 1: Failing tests**

```ts
import { it, expect } from "vitest";
import { parseFilters, toQuery, applyFilters } from "@/lib/filters";
import { loadFixture } from "@/lib/testdata/load";
import { detectConflicts } from "@/lib/conflicts";

const data = loadFixture();
const conflictIds = new Set(detectConflicts(data).flatMap((c) => c.shiftIds));

it("round-trips through the URL with defaults omitted", () => {
  const f = parseFilters(new URLSearchParams("view=week&d=2026-10-21&conflicts=1&loc=TSO%20De%20Brug"));
  expect(f).toMatchObject({ view: "week", date: "2026-10-21", onlyConflicts: true, onlyOpen: false, locationId: "TSO De Brug" });
  expect(toQuery(f)).toBe("view=week&d=2026-10-21&loc=TSO+De+Brug&conflicts=1");
});
it("defaults to day view on the first data day", () => {
  expect(parseFilters(new URLSearchParams())).toMatchObject({ view: "dag", date: "2026-10-19" });
});
it("only conflicts gives exactly the shifts involved in a conflict", () => {
  const f = parseFilters(new URLSearchParams("conflicts=1"));
  expect(applyFilters(data, f, conflictIds).length).toBe(conflictIds.size);
});
it("only open gives 22", () => {
  expect(applyFilters(data, parseFilters(new URLSearchParams("open=1")), conflictIds)).toHaveLength(22);
});
it("search matches employee, location and code, case-insensitive", () => {
  const r = applyFilters(data, parseFilters(new URLSearchParams("q=kompas")), conflictIds);
  expect(r.length).toBeGreaterThan(0);
  expect(r.every((s) => s.locationId.includes("Kompas"))).toBe(true);
  expect(applyFilters(data, parseFilters(new URLSearchParams("q=d041")), conflictIds).map((s) => s.code)).toEqual(["D041"]);
});
it("hides cancelled shifts", () => {
  const d2 = { ...data, shifts: data.shifts.map((s) => (s.code === "D001" ? { ...s, status: "cancelled" as const } : s)) };
  expect(applyFilters(d2, parseFilters(new URLSearchParams("q=D001")), conflictIds)).toEqual([]);
});
```
Expected `conflictIds.size` is 24 (5 overlap pairs + 4 travel pairs + 4 + 2, no shift in two conflicts); the assertion uses the set size so it stays correct either way.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Implement** `src/lib/filters.ts`

```ts
import type { PlanData, Shift } from "@/lib/types";

export type View = "dag" | "lijst" | "week" | "maand";
export interface Filters {
  view: View; date: string; q: string;
  employeeId?: string; locationId?: string; fn?: string;
  onlyConflicts: boolean; onlyOpen: boolean;
}
export const DEFAULT_DATE = "2026-10-19";
const VIEWS: View[] = ["dag", "lijst", "week", "maand"];

export function parseFilters(sp: URLSearchParams): Filters {
  const v = sp.get("view") as View;
  return {
    view: VIEWS.includes(v) ? v : "dag",
    date: /^\d{4}-\d{2}-\d{2}$/.test(sp.get("d") ?? "") ? sp.get("d")! : DEFAULT_DATE,
    q: sp.get("q") ?? "",
    employeeId: sp.get("emp") ?? undefined,
    locationId: sp.get("loc") ?? undefined,
    fn: sp.get("fn") ?? undefined,
    onlyConflicts: sp.get("conflicts") === "1",
    onlyOpen: sp.get("open") === "1",
  };
}

export function toQuery(f: Filters): string {
  const p = new URLSearchParams();
  if (f.view !== "dag") p.set("view", f.view);
  if (f.date !== DEFAULT_DATE) p.set("d", f.date);
  if (f.q) p.set("q", f.q);
  if (f.employeeId) p.set("emp", f.employeeId);
  if (f.locationId) p.set("loc", f.locationId);
  if (f.fn) p.set("fn", f.fn);
  if (f.onlyConflicts) p.set("conflicts", "1");
  if (f.onlyOpen) p.set("open", "1");
  return p.toString();
}

/** All filters except the date scope (each view scopes dates itself). */
export function applyFilters(data: PlanData, f: Filters, conflictIds: Set<string>): Shift[] {
  const emp = new Map(data.employees.map((e) => [e.id, e.name.toLowerCase()]));
  const loc = new Map(data.locations.map((l) => [l.id, l.name.toLowerCase()]));
  const q = f.q.trim().toLowerCase();
  return data.shifts.filter((s) => {
    if (s.status !== "active") return false;
    if (f.employeeId && s.employeeId !== f.employeeId) return false;
    if (f.locationId && s.locationId !== f.locationId) return false;
    if (f.fn && s.fn !== f.fn) return false;
    if (f.onlyConflicts && !conflictIds.has(s.id)) return false;
    if (f.onlyOpen && s.employeeId) return false;
    if (q) {
      const hay = `${s.code} ${s.employeeId ? emp.get(s.employeeId) : "open"} ${loc.get(s.locationId)} ${s.fn}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
```

- [ ] **Step 4: Run** → PASS. **Commit** `feat: URL-backed filters`

- [ ] **Step 5: Append to `docs/ai-log.md`** a short entry: pure modules first, golden test, anything the model got wrong and how you caught it.

---

### Task 9: Supabase project, schema, RLS, seed

**Files:** Create `supabase/migrations/20261010120000_schema.sql`; apply both migrations via Supabase MCP.

- [ ] **Step 1: Create project** (ask Luuk to confirm cost first: org "free projects" `jjriccdhlmkmznegagle`, region `eu-central-1`, name `allkidz-planning-demo`). Then in the dashboard: Authentication > Sign In / Providers > enable **Anonymous sign-ins** (manual step for Luuk; MCP cannot toggle it).

- [ ] **Step 2: Schema migration** `supabase/migrations/20261010120000_schema.sql`

```sql
create extension if not exists pg_cron;
create schema if not exists seed;
create schema if not exists private;
revoke all on schema seed, private from public, anon, authenticated;

-- canonical seed (not exposed through the API)
create table seed.employees (name text primary key, functions text[] not null);
create table seed.locations (name text primary key, type text not null, city text not null);
create table seed.travel (a text not null, b text not null, minutes int not null, primary key (a, b));
create table seed.unavailability (employee text not null, date date not null, start_time time not null, end_time time not null, reason text not null);
create table seed.shifts (code text primary key, date date not null, employee text, location text not null,
  start_time time not null, end_time time not null, function text not null, note text);

-- workspace-scoped tables
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  notice_days int not null default 7 check (notice_days between 0 and 60),
  today date not null default '2026-10-16',
  emails_sent int not null default 0
);
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null, functions text[] not null default '{}',
  unique (workspace_id, name)
);
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null, type text not null, city text not null,
  unique (workspace_id, name)
);
create table public.travel_times (
  workspace_id uuid not null references public.workspaces on delete cascade,
  location_a uuid not null references public.locations on delete cascade,
  location_b uuid not null references public.locations on delete cascade,
  minutes int not null check (minutes >= 0),
  primary key (workspace_id, location_a, location_b)
);
create table public.unavailability (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  employee_id uuid not null references public.employees on delete cascade,
  date date not null, start_time time not null, end_time time not null,
  reason text not null, source text not null default 'planner' check (source in ('planner','medewerker')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create table public.shift_series (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  rule jsonb not null, description text not null,
  created_at timestamptz not null default now()
);
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  code text not null,
  date date not null, start_time time not null, end_time time not null,
  location_id uuid not null references public.locations on delete restrict,
  function text not null,
  employee_id uuid references public.employees on delete set null,
  status text not null default 'active' check (status in ('active','cancelled')),
  note text,
  series_id uuid references public.shift_series on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code),
  check (end_time > start_time)
);
create index shifts_ws_date_emp on public.shifts (workspace_id, date, employee_id);
create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  at timestamptz not null default now(),
  actor_role text not null check (actor_role in ('planner','medewerker','systeem')),
  actor_name text not null,
  acting_as text,
  action text not null check (action in ('shift_created','shift_updated','shift_cancelled','employee_removed',
    'employee_assigned','employee_cancelled_self','availability_changed','open_shift_accepted')),
  shift_id uuid references public.shifts on delete set null,
  shift_code text,
  before jsonb, after jsonb,
  reason text,
  check (action not in ('shift_cancelled','employee_removed','employee_cancelled_self') or length(trim(coalesce(reason,''))) > 0)
);
create index change_log_ws_at on public.change_log (workspace_id, at desc);
create table public.client_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  at timestamptz not null default now(),
  location_id uuid not null references public.locations on delete cascade,
  shift_id uuid references public.shifts on delete set null,
  change_log_id uuid references public.change_log on delete set null,
  subject text not null, body text not null,
  short_notice boolean not null,
  emailed_at timestamptz
);
create index client_messages_ws_at on public.client_messages (workspace_id, at desc);

-- RLS
create or replace function private.my_workspace() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.workspaces where owner = (select auth.uid()) order by created_at desc limit 1
$$;
grant usage on schema private to authenticated;
grant execute on function private.my_workspace() to authenticated;

alter table public.workspaces enable row level security;
create policy ws_select on public.workspaces for select to authenticated using (owner = (select auth.uid()));
create policy ws_update on public.workspaces for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

do $$ declare t text; begin
  foreach t in array array['employees','locations','travel_times','unavailability','shift_series','shifts','client_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (workspace_id = (select private.my_workspace())) with check (workspace_id = (select private.my_workspace()))', t || '_own', t);
  end loop;
end $$;

-- change_log: append-only
alter table public.change_log enable row level security;
create policy change_log_select on public.change_log for select to authenticated using (workspace_id = (select private.my_workspace()));
create policy change_log_insert on public.change_log for insert to authenticated with check (workspace_id = (select private.my_workspace()));
revoke update, delete, truncate on public.change_log from anon, authenticated;
revoke all on all tables in schema public from anon;

-- seeding
create or replace function private.seed_workspace(ws uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.client_messages where workspace_id = ws;
  delete from public.change_log where workspace_id = ws;
  delete from public.shifts where workspace_id = ws;
  delete from public.shift_series where workspace_id = ws;
  delete from public.unavailability where workspace_id = ws;
  delete from public.travel_times where workspace_id = ws;
  delete from public.employees where workspace_id = ws;
  delete from public.locations where workspace_id = ws;
  update public.workspaces set notice_days = 7, today = '2026-10-16', emails_sent = emails_sent where id = ws;

  insert into public.employees (workspace_id, name, functions) select ws, name, functions from seed.employees;
  insert into public.locations (workspace_id, name, type, city) select ws, name, type, city from seed.locations;
  insert into public.travel_times (workspace_id, location_a, location_b, minutes)
    select ws, la.id, lb.id, t.minutes from seed.travel t
    join public.locations la on la.workspace_id = ws and la.name = t.a
    join public.locations lb on lb.workspace_id = ws and lb.name = t.b;
  insert into public.unavailability (workspace_id, employee_id, date, start_time, end_time, reason)
    select ws, e.id, u.date, u.start_time, u.end_time, u.reason from seed.unavailability u
    join public.employees e on e.workspace_id = ws and e.name = u.employee;
  insert into public.shifts (workspace_id, code, date, start_time, end_time, location_id, function, employee_id, note)
    select ws, s.code, s.date, s.start_time, s.end_time, l.id, s.function, e.id, s.note from seed.shifts s
    join public.locations l on l.workspace_id = ws and l.name = s.location
    left join public.employees e on e.workspace_id = ws and e.name = s.employee;
end $$;
revoke all on function private.seed_workspace(uuid) from public, anon, authenticated;

create or replace function public.create_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (owner) values (auth.uid()) returning id into ws;
  perform private.seed_workspace(ws);
  return ws;
end $$;
create or replace function public.reset_workspace() returns void
language plpgsql security definer set search_path = '' as $$
declare ws uuid := private.my_workspace();
begin
  if ws is null then raise exception 'no workspace'; end if;
  perform private.seed_workspace(ws);
end $$;
revoke all on function public.create_workspace(), public.reset_workspace() from public, anon;
grant execute on function public.create_workspace(), public.reset_workspace() to authenticated;

-- cleanup: sandboxes and anonymous users older than 7 days
select cron.schedule('cleanup-demo-sandboxes', '17 3 * * *', $$
  delete from public.workspaces where created_at < now() - interval '7 days';
  delete from auth.users where is_anonymous and created_at < now() - interval '7 days';
$$);
```

- [ ] **Step 3: Apply** both migrations with `apply_migration` (schema first, then the generated seed file). Verify:

```sql
select (select count(*) from seed.shifts) shifts, (select count(*) from seed.employees) emps,
       (select count(*) from seed.locations) locs, (select count(*) from seed.travel) travel;
```
Expected: 293, 40, 28, 378.

- [ ] **Step 4: Advisors** `get_advisors` security + performance. Fix every security warning (unindexed FK warnings: add indexes on `shifts(location_id)`, `shifts(employee_id)`, `shifts(series_id)`, `unavailability(employee_id)`, `client_messages(location_id)`, `client_messages(shift_id)`, `client_messages(change_log_id)`, `change_log(shift_id)`, `travel_times(location_a)`, `travel_times(location_b)` in a follow-up migration file committed to the repo).

- [ ] **Step 5: Commit** `feat: supabase schema, RLS, append-only log, seed and cleanup cron`

---

### Task 10: Auth, demo login, Supabase clients, proxy

**Files:** Create `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/proxy.ts`, `src/app/login/page.tsx`, `src/app/login/actions.ts`, `src/app/actions/demo.ts`, `.env.example`

- [ ] **Step 1: Env** `.env.example` (and `.env.local` with real values, never committed)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
DEMO_EMAIL=demo@allkidz.test
DEMO_PASSWORD=
RESEND_API_KEY=
RESEND_FROM="AllKidz Planning demo <demo@luukvandijk.com>"
```

- [ ] **Step 2: Clients** `src/lib/supabase/server.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* RSC: ignore */ } },
    },
  });
}
```

`src/proxy.ts`

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !req.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"] };
```

- [ ] **Step 3: Demo login action** `src/app/login/actions.ts`

```ts
"use server";
import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function demoLogin(_: unknown, form: FormData): Promise<{ error?: string }> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!same(email, process.env.DEMO_EMAIL!.toLowerCase()) || !same(password, process.env.DEMO_PASSWORD!))
    return { error: "Onjuiste inloggegevens." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return { error: "Inloggen lukt nu niet, probeer het zo opnieuw." };
  const { error: wsErr } = await supabase.rpc("create_workspace");
  if (wsErr) return { error: "Demo-omgeving aanmaken mislukt." };
  redirect("/planbord");
}
```

`src/app/actions/demo.ts`

```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function resetDemo() {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("reset_workspace");
  if (error) throw new Error("Reset mislukt");
  revalidatePath("/", "layout");
}
export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 4: Login page** `src/app/login/page.tsx`: client form with `useActionState(demoLogin, {})`, fields e-mail + wachtwoord, error text, short explanation: "Elke keer dat je inlogt krijg je een eigen, schone kopie van de testdata. Wat je wijzigt ziet niemand anders." Prefill nothing.

- [ ] **Step 5: Verify manually**: `npm run dev`, open `/planbord` → redirected to `/login`; wrong password → error; right password → lands on `/planbord` (404 is fine for now); in SQL, `select count(*) from public.shifts` grows by 293 per login.

- [ ] **Step 6: Commit** `feat: demo login with anonymous per-login sandbox`

---

### Task 11: Data loading and server actions

**Files:** Create `src/lib/data/load.ts`, `src/lib/data/actor.ts`, `src/app/actions/_log.ts`, `src/app/actions/shifts.ts`, `src/app/actions/availability.ts`, `src/app/actions/settings.ts`

- [ ] **Step 1: Loader** `src/lib/data/load.ts`

```ts
import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type { PlanData } from "@/lib/types";

const hhmm = (t: string) => t.slice(0, 5);
export interface Workspace { id: string; noticeDays: number; today: string }

export const loadWorkspace = cache(async (): Promise<{ ws: Workspace; data: PlanData }> => {
  const sb = await supabaseServer();
  const [w, e, l, t, u, s] = await Promise.all([
    sb.from("workspaces").select("id, notice_days, today").order("created_at", { ascending: false }).limit(1).single(),
    sb.from("employees").select("id, name, functions").order("name"),
    sb.from("locations").select("id, name, type, city").order("name"),
    sb.from("travel_times").select("location_a, location_b, minutes"),
    sb.from("unavailability").select("id, employee_id, date, start_time, end_time, reason"),
    sb.from("shifts").select("id, code, date, start_time, end_time, location_id, function, employee_id, status, note, series_id").limit(5000),
  ]);
  for (const r of [w, e, l, t, u, s]) if (r.error) throw r.error;
  return {
    ws: { id: w.data!.id, noticeDays: w.data!.notice_days, today: w.data!.today },
    data: {
      employees: e.data!.map((x) => ({ id: x.id, name: x.name, functions: x.functions })),
      locations: l.data!,
      travel: t.data!.map((x) => ({ a: x.location_a, b: x.location_b, minutes: x.minutes })),
      unavailability: u.data!.map((x) => ({ id: x.id, employeeId: x.employee_id, date: x.date, from: hhmm(x.start_time), to: hhmm(x.end_time), reason: x.reason })),
      shifts: s.data!.map((x) => ({ id: x.id, code: x.code, date: x.date, start: hhmm(x.start_time), end: hhmm(x.end_time),
        locationId: x.location_id, fn: x.function, employeeId: x.employee_id, status: x.status as "active" | "cancelled",
        note: x.note, seriesId: x.series_id })),
    },
  };
});
```
Note: PostgREST default max rows is 1000; 5000 needs `max_rows` raised in API settings or paginate. For the demo, keep total shifts under 1000 or page in chunks of 1000 with `.range()`; implement paging helper `fetchAll(query)` if a workspace exceeds 1000 rows (recurrence can add many).

- [ ] **Step 2: Actor** `src/lib/data/actor.ts`

```ts
export type Actor = { role: "planner"; name: "Sanne" } | { role: "medewerker"; name: string; employeeId: string };
export const PLANNER: Actor = { role: "planner", name: "Sanne" };
export const actingAs = (a: Actor) => (a.role === "medewerker" ? "via medewerker-app (demo: bekeken als)" : null);
```

- [ ] **Step 3: Log + message helper** `src/app/actions/_log.ts`

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildClientMessage, type ClientAction } from "@/lib/messages";
import { isShortNotice } from "@/lib/notice";
import { actingAs, type Actor } from "@/lib/data/actor";

export interface ShiftRow { id: string; code: string; date: string; start_time: string; end_time: string; function: string;
  location_id: string; employee_id: string | null; status: string; note: string | null }

export async function logChange(sb: SupabaseClient, p: {
  wsId: string; actor: Actor; action: string; shift?: ShiftRow | null; before?: unknown; after?: unknown; reason?: string | null;
}) {
  const { data, error } = await sb.from("change_log").insert({
    workspace_id: p.wsId, actor_role: p.actor.role, actor_name: p.actor.name, acting_as: actingAs(p.actor),
    action: p.action, shift_id: p.shift?.id ?? null, shift_code: p.shift?.code ?? null,
    before: p.before ?? null, after: p.after ?? null, reason: p.reason ?? null,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function maybeNotifyClient(sb: SupabaseClient, p: {
  ws: { id: string; today: string; noticeDays: number }; logId: string; action: ClientAction; shift: ShiftRow;
  employeeName: string | null; changes?: string;
}) {
  const short = isShortNotice(p.shift.date, p.ws.today, p.ws.noticeDays);
  if (!short) return null;
  const { data: loc } = await sb.from("locations").select("name").eq("id", p.shift.location_id).single();
  const msg = buildClientMessage({
    action: p.action,
    shift: { code: p.shift.code, date: p.shift.date, start: p.shift.start_time.slice(0, 5), end: p.shift.end_time.slice(0, 5), fn: p.shift.function },
    locationName: loc?.name ?? "", employeeName: p.employeeName, changes: p.changes,
  });
  const { error } = await sb.from("client_messages").insert({
    workspace_id: p.ws.id, location_id: p.shift.location_id, shift_id: p.shift.id, change_log_id: p.logId,
    subject: msg.subject, body: msg.body, short_notice: true,
  });
  if (error) throw error;
  return msg;
}
```

- [ ] **Step 4: Shift actions** `src/app/actions/shifts.ts`. Every action: get workspace via `loadWorkspace()`-like light query (`workspaces` select id,today,notice_days), validate input (times `^\d{2}:\d{2}$`, end > start, location/employee belong to workspace via RLS select), mutate, log, maybe notify, `revalidatePath("/", "layout")`, return `{ ok: true } | { error: string }`.

```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { expandRule, describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { logChange, maybeNotifyClient, type ShiftRow } from "./_log";
import type { Actor } from "@/lib/data/actor";

const TIME = /^\d{2}:\d{2}$/;
const SHIFT_COLS = "id, code, date, start_time, end_time, function, location_id, employee_id, status, note";
type Result = { ok: true } | { error: string };

async function ctx() {
  const sb = await supabaseServer();
  const { data: ws, error } = await sb.from("workspaces").select("id, today, notice_days").order("created_at", { ascending: false }).limit(1).single();
  if (error || !ws) throw new Error("Geen demo-omgeving");
  return { sb, ws: { id: ws.id as string, today: ws.today as string, noticeDays: ws.notice_days as number } };
}
async function employeeName(sb: Awaited<ReturnType<typeof supabaseServer>>, id: string | null) {
  if (!id) return null;
  const { data } = await sb.from("employees").select("name").eq("id", id).single();
  return data?.name ?? null;
}
async function nextCodes(sb: Awaited<ReturnType<typeof supabaseServer>>, n: number) {
  const { data } = await sb.from("shifts").select("code").order("code", { ascending: false }).limit(1);
  let max = Number(data?.[0]?.code?.slice(1) ?? 0);
  return Array.from({ length: n }, () => `D${String(++max).padStart(3, "0")}`);
}

export async function createShifts(input: {
  employeeId: string | null; locationId: string; fn: string; start: string; end: string; note: string | null; rule: RecurrenceRule; actor: Actor;
}): Promise<Result> {
  if (!TIME.test(input.start) || !TIME.test(input.end) || input.end <= input.start) return { error: "Eindtijd moet na de begintijd liggen." };
  const dates = expandRule(input.rule);
  if (dates.length === 0) return { error: "Kies minstens één datum." };
  if (dates.length > 200) return { error: "Maximaal 200 diensten tegelijk." };
  const { sb, ws } = await ctx();
  let seriesId: string | null = null;
  if (dates.length > 1) {
    const { data, error } = await sb.from("shift_series").insert({ workspace_id: ws.id, rule: input.rule, description: describeRule(input.rule) }).select("id").single();
    if (error) return { error: "Opslaan mislukt." };
    seriesId = data.id;
  }
  const codes = await nextCodes(sb, dates.length);
  const rows = dates.map((date, i) => ({ workspace_id: ws.id, code: codes[i], date, start_time: input.start, end_time: input.end,
    location_id: input.locationId, function: input.fn, employee_id: input.employeeId, note: input.note, series_id: seriesId }));
  const { data: created, error } = await sb.from("shifts").insert(rows).select(SHIFT_COLS);
  if (error) return { error: "Opslaan mislukt." };
  await sb.from("change_log").insert((created as ShiftRow[]).map((s) => ({
    workspace_id: ws.id, actor_role: input.actor.role, actor_name: input.actor.name, action: "shift_created",
    shift_id: s.id, shift_code: s.code, after: s, reason: seriesId ? describeRule(input.rule) : null,
  })));
  revalidatePath("/", "layout");
  return { ok: true };
}

async function getShift(sb: Awaited<ReturnType<typeof supabaseServer>>, id: string) {
  const { data } = await sb.from("shifts").select(SHIFT_COLS).eq("id", id).single();
  return data as ShiftRow | null;
}

export async function updateShift(id: string, patch: { employeeId: string | null; locationId: string; fn: string; date: string; start: string; end: string; note: string | null }, actor: Actor): Promise<Result> {
  if (!TIME.test(patch.start) || !TIME.test(patch.end) || patch.end <= patch.start) return { error: "Eindtijd moet na de begintijd liggen." };
  const { sb, ws } = await ctx();
  const before = await getShift(sb, id);
  if (!before) return { error: "Dienst niet gevonden." };
  const { data: after, error } = await sb.from("shifts").update({
    employee_id: patch.employeeId, location_id: patch.locationId, function: patch.fn, date: patch.date,
    start_time: patch.start, end_time: patch.end, note: patch.note, updated_at: new Date().toISOString(),
  }).eq("id", id).select(SHIFT_COLS).single();
  if (error) return { error: "Opslaan mislukt." };
  const logId = await logChange(sb, { wsId: ws.id, actor, action: "shift_updated", shift: after as ShiftRow, before, after });
  const changes = describeChanges(before, after as ShiftRow);
  if (changes) await maybeNotifyClient(sb, { ws, logId, action: "shift_updated", shift: after as ShiftRow, employeeName: await employeeName(sb, (after as ShiftRow).employee_id), changes });
  revalidatePath("/", "layout");
  return { ok: true };
}

function describeChanges(a: ShiftRow, b: ShiftRow): string {
  const parts: string[] = [];
  const t = (s: ShiftRow) => `${s.start_time.slice(0, 5)}-${s.end_time.slice(0, 5)}`;
  if (a.date !== b.date) parts.push(`Datum: ${a.date} wordt ${b.date}.`);
  if (t(a) !== t(b)) parts.push(`Tijd: ${t(a)} wordt ${t(b)}.`);
  if (a.location_id !== b.location_id) parts.push(`Andere locatie.`);
  if (a.employee_id !== b.employee_id) parts.push(b.employee_id ? `Er is een andere medewerker ingepland.` : `De medewerker is van de dienst gehaald.`);
  return parts.join(" ");
}

export async function cancelShift(id: string, reason: string, actor: Actor): Promise<Result> {
  if (!reason.trim()) return { error: "Geef een reden op." };
  const { sb, ws } = await ctx();
  const before = await getShift(sb, id);
  if (!before || before.status === "cancelled") return { error: "Dienst niet gevonden." };
  const { data: after, error } = await sb.from("shifts").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id).select(SHIFT_COLS).single();
  if (error) return { error: "Annuleren mislukt." };
  const logId = await logChange(sb, { wsId: ws.id, actor, action: "shift_cancelled", shift: after as ShiftRow, before, after, reason });
  await maybeNotifyClient(sb, { ws, logId, action: "shift_cancelled", shift: before, employeeName: null });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeEmployee(id: string, reason: string, actor: Actor, self = false): Promise<Result> {
  if (!reason.trim()) return { error: "Geef een reden op." };
  const { sb, ws } = await ctx();
  const before = await getShift(sb, id);
  if (!before?.employee_id) return { error: "Er staat niemand op deze dienst." };
  if (self && actor.role === "medewerker" && actor.employeeId !== before.employee_id) return { error: "Dit is niet jouw dienst." };
  const name = await employeeName(sb, before.employee_id);
  const { data: after, error } = await sb.from("shifts").update({ employee_id: null, updated_at: new Date().toISOString() }).eq("id", id).select(SHIFT_COLS).single();
  if (error) return { error: "Opslaan mislukt." };
  const action = self ? "employee_cancelled_self" : "employee_removed";
  const logId = await logChange(sb, { wsId: ws.id, actor, action, shift: after as ShiftRow, before, after, reason });
  await maybeNotifyClient(sb, { ws, logId, action, shift: before, employeeName: name });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function assignEmployee(id: string, employeeId: string, actor: Actor): Promise<Result> {
  const { sb, ws } = await ctx();
  const before = await getShift(sb, id);
  if (!before || before.status !== "active") return { error: "Dienst niet gevonden." };
  if (before.employee_id) return { error: "Deze dienst is al ingevuld." };
  const { data: emp } = await sb.from("employees").select("name, functions").eq("id", employeeId).single();
  if (!emp) return { error: "Medewerker niet gevonden." };
  if (actor.role === "medewerker" && !emp.functions.includes(before.function)) return { error: "Deze dienst past niet bij je functie." };
  const { data: after, error } = await sb.from("shifts").update({ employee_id: employeeId, updated_at: new Date().toISOString() })
    .eq("id", id).is("employee_id", null).select(SHIFT_COLS).single();
  if (error || !after) return { error: "Iemand anders was je net voor." };
  const action = actor.role === "medewerker" ? "open_shift_accepted" : "employee_assigned";
  const logId = await logChange(sb, { wsId: ws.id, actor, action, shift: after as ShiftRow, before, after });
  await maybeNotifyClient(sb, { ws, logId, action: "employee_assigned", shift: after as ShiftRow, employeeName: emp.name });
  revalidatePath("/", "layout");
  return { ok: true };
}
```

- [ ] **Step 5: Availability + settings actions**

`src/app/actions/availability.ts`
```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { logChange } from "./_log";
import type { Actor } from "@/lib/data/actor";

export async function addUnavailability(p: { employeeId: string; date: string; from: string; to: string; reason: string }, actor: Actor) {
  if (!p.reason.trim()) return { error: "Geef een reden op." };
  if (p.to <= p.from) return { error: "Eindtijd moet na de begintijd liggen." };
  const sb = await supabaseServer();
  const { data: ws } = await sb.from("workspaces").select("id").order("created_at", { ascending: false }).limit(1).single();
  const { data, error } = await sb.from("unavailability").insert({ workspace_id: ws!.id, employee_id: p.employeeId, date: p.date,
    start_time: p.from, end_time: p.to, reason: p.reason, source: actor.role === "medewerker" ? "medewerker" : "planner" }).select().single();
  if (error) return { error: "Opslaan mislukt." };
  await logChange(sb, { wsId: ws!.id, actor, action: "availability_changed", after: data, reason: p.reason });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function removeUnavailability(id: string, actor: Actor) {
  const sb = await supabaseServer();
  const { data: ws } = await sb.from("workspaces").select("id").order("created_at", { ascending: false }).limit(1).single();
  const { data: before } = await sb.from("unavailability").select().eq("id", id).single();
  const { error } = await sb.from("unavailability").delete().eq("id", id);
  if (error) return { error: "Verwijderen mislukt." };
  await logChange(sb, { wsId: ws!.id, actor, action: "availability_changed", before });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
```

`src/app/actions/settings.ts`
```ts
"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
export async function updateSettings(p: { noticeDays: number; today: string }) {
  if (!Number.isInteger(p.noticeDays) || p.noticeDays < 0 || p.noticeDays > 60) return { error: "Kies 0 t/m 60 dagen." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.today)) return { error: "Ongeldige datum." };
  const sb = await supabaseServer();
  const { data: ws } = await sb.from("workspaces").select("id").order("created_at", { ascending: false }).limit(1).single();
  const { error } = await sb.from("workspaces").update({ notice_days: p.noticeDays, today: p.today }).eq("id", ws!.id);
  if (error) return { error: "Opslaan mislukt." };
  revalidatePath("/", "layout");
  return { ok: true as const };
}
```

- [ ] **Step 6: Verify** `npm run typecheck` clean. **Commit** `feat: data loading and server actions with change log and client messages`

---

### Task 12: App shell and role switcher

**Files:** Create `src/app/(app)/layout.tsx`, `src/components/AppHeader.tsx`, `src/components/RoleSwitcher.tsx`

- [ ] **Step 1: Layout** loads `loadWorkspace()` once for employee/location lists and renders `<AppHeader employees locations />` + `<main>`; plus `<Toaster />` (sonner).
- [ ] **Step 2: AppHeader** (client): left "AllKidz Planning" + "demo" badge; nav links Planbord `/planbord`, Wijzigingslog `/log`, Berichten `/berichten`, Instellingen `/instellingen` (visible only when the route is a planner route); right: RoleSwitcher, "Reset demo" (confirm dialog: "Alle wijzigingen in jouw demo worden teruggezet naar de testdata.", calls `resetDemo()`, toast "Demo teruggezet"), "Uitloggen".
- [ ] **Step 3: RoleSwitcher** (client): a select with groups: "Planner: Sanne" → `/planbord`; "Medewerker" → sub-select of 40 names → `/medewerker/[id]`; "Opdrachtgever" → sub-select of 28 locations → `/opdrachtgever/[id]`. Current role derived from `usePathname()`. Label "Bekijk als".
- [ ] **Step 4: Verify in browser** (preview): header renders, switching navigates, reset works and toasts. Mobile width 375px: header collapses nav into a menu, no horizontal scroll.
- [ ] **Step 5: Commit** `feat: app shell with role switcher and demo reset`

---

### Task 13: Planbord Dag + Lijst views

**Files:** Create `src/app/(app)/planbord/page.tsx`, `src/components/planbord/Planbord.tsx`, `Toolbar.tsx`, `DayView.tsx`, `ListView.tsx`, `ShiftChip.tsx`, `ConflictBadge.tsx`

- [ ] **Step 1: Page** (server): `const { ws, data } = await loadWorkspace(); return <Planbord data={data} ws={ws} />` wrapped in `<Suspense>` (needed for `useSearchParams`).
- [ ] **Step 2: Planbord** (client): `filters = parseFilters(useSearchParams())`; `setFilters(patch)` → `router.replace("?" + toQuery({...filters, ...patch}), { scroll: false })`. Memoised: `conflicts = useMemo(() => detectConflicts(data), [data])`, `byShift = conflictsByShift(conflicts)`, `conflictIds`, `visible = applyFilters(data, filters, conflictIds)`. Holds state for the open ShiftSheet (`{ mode: "new" } | { mode: "edit", shiftId }`) and RemoveDialog. Renders Toolbar + the view for `filters.view`.
- [ ] **Step 3: Toolbar**: view toggle (Dag | Lijst | Week | Maand) as segmented buttons; date navigation (prev/next by 1 day, 1 week or 1 month depending on view, plus "Vandaag" jumping to `ws.today`'s next data day); day tabs ma-vr of the focused week each with counts `diensten · open · conflicten` (counts computed from `visible` minus the date scope); search input (debounced 150 ms into `q`); selects: medewerker, locatie, functie; toggles "Alleen conflicten (N)" and "Alleen open (N)"; button "Nieuwe dienst". Active filters show as removable chips plus "Wis filters".
- [ ] **Step 4: ShiftChip**: compact card: time `07:30-08:45`, location name, function (muted when it is the employee's normal function), code; open shifts dashed border + "Open"; conflict → red left border + ConflictBadge list; click opens ShiftSheet in edit mode; overflow menu: "Medewerker eraf halen", "Dienst annuleren".
- [ ] **Step 5: ConflictBadge**: icon + short label per type (Overlap, Reistijd, Niet beschikbaar, Functie) with the full `message` in a tooltip and inline under the chip on the Dag view (no hover-only information).
- [ ] **Step 6: DayView**: for `filters.date`, group visible shifts by employee (employees with conflicts first, then by first start time); per employee a block: name, functions, day total hours, then `buildDayTimeline(data, emp, date)` rendered as chips with a gap strip between consecutive chips: `ok` → "15 min, reistijd 10 min" muted; `krap` → amber "Precies genoeg reistijd (20 min)"; `te-krap` → red "10 min, nodig 25 min"; `overlap` → red "Overlapt". Unavailability windows of that employee/day are shown as a grey striped row "Niet beschikbaar 11:00-13:00 (Tandarts)". Open shifts of that day in a separate "Open diensten" section at the top, each with "Inplannen" (opens ShiftSheet with employee select focused). Employees with no shifts that day are hidden unless the employee filter selects them.
- [ ] **Step 7: ListView**: a table over visible shifts within the focused week: columns Datum, Tijd, Medewerker, Locatie, Functie, Status (Open / conflict badges / OK), Code. Sorted by date, start, employee; sortable by clicking headers. Rows are lightweight (no per-row heavy components) so 293+ rows render fast.
- [ ] **Step 8: Verify in browser**: Monday shows Tom with a red overlap D105/D176, Noor with a red travel gap, Daan with "Niet beschikbaar (hele dag)"; Friday Gijs shows amber "krap", not red; "Alleen conflicten" count equals the golden total of involved shifts; filters survive refresh. Measure: switching day tabs and toggling filters feels instant (under 100 ms; check React Profiler if not).
- [ ] **Step 9: Commit** `feat: planbord day and list views with conflicts and filters`

---

### Task 14: Week + Maand views and employee focus

**Files:** Create `src/components/planbord/WeekView.tsx`, `MonthView.tsx`

- [ ] **Step 1: WeekView**: columns Mon to Sun of `mondayOf(filters.date)` (weekend columns narrow and only shown if any visible shift falls on them), rows = employees that have visible shifts that week (or the selected employee), first row "Open" for open shifts. Cell: compact chips (time + short location), red dot when conflicted, click chip = edit, click empty cell area = go to Dag view for that date and employee filter. Right column: week total hours (`hoursLabel`), highlighted when above 32u. Sticky header row and first column.
- [ ] **Step 2: MonthView**: `monthGrid(filters.date)`, 7 columns ma-zo, each day cell shows `N diensten`, `N open` (blue), `N conflicten` (red) for visible shifts; days outside the month muted; click → Dag view on that date. When an employee filter is active, the cell instead shows that employee's shift times and a month total hours line above the grid ("Noor: 42u15 in november").
- [ ] **Step 3: Employee focus**: when `emp` filter is set, the Toolbar shows "Uren: dag Xu · week Yu · maand Zu" for that employee (functielijst 3 item 5).
- [ ] **Step 4: Verify in browser**: Week view of 19 Oct renders 40 rows fast; Maand oktober shows counts only on 19-23; November empty until recurring shifts are created (Task 15).
- [ ] **Step 5: Commit** `feat: week and month views with hours per employee`

---

### Task 15: Shift sheet with recurrence and live conflicts

**Files:** Create `src/components/shift/ShiftSheet.tsx`, `RecurrenceInput.tsx`, `MiniCalendar.tsx`

- [ ] **Step 1: MiniCalendar**: month grid (uses `monthGrid`), prev/next month, click toggles a date in a `Set<string>`; selected dates filled; data-week days marked with a dot.
- [ ] **Step 2: RecurrenceInput**: radio "Eenmalig" (date input) / "Losse datums" (MiniCalendar) / "Patroon": weekday checkboxes ma-zo, select "Elke week / Om de week / Elke 3 weken / N-de weekdag van de maand" (for the monthly option: selects "eerste/tweede/derde/vierde/laatste" + weekday), van/tot dates. Emits a `RecurrenceRule`. Shows `describeRule(rule)` as a sentence.
- [ ] **Step 3: ShiftSheet** (shadcn Sheet, right side; full screen on mobile): fields Medewerker (select with "Open dienst (nog niemand)" first; options show a small warning icon if `conflictsIfAssigned` would return conflicts on the first date), Locatie, Functie (default from location type: Zwembad → Aqualessen, School → Gymdocent, else KidzCoach; any of the 5 functions selectable), Begintijd, Eindtijd, Opmerking, Herhaling (only in "new" mode; edit mode shows a single date). Below: **preview list** of every generated date: `shortDate`, and per date either "Geen conflicten" (green) or the conflict messages from `conflictsIfAssigned(data, probeShift(date), employeeId)` plus a function-mismatch check when no employee. Header line: "12 diensten, 2 met conflict". Save button: "Opslaan" when clean; when conflicts exist the button reads "Toch opslaan (2 conflicten)" and requires a second click (confirm state). Calls `createShifts` or `updateShift` with `PLANNER`, toasts the result, closes, and in "new" mode navigates the planbord to the first created date.
- [ ] **Step 4: Verify in browser**: create V3 (Fleur, KDV Kleine Kei, 07:30-17:00, KidzCoach, monthly 3rd Friday, 2026-11-01..2026-12-31) → preview shows 20 nov and 18 dec; save; Maand november shows 1 shift on 20 nov. Create a shift for Hana on Fri 23 Oct 12:00-13:15 at TSO Het Kompas → preview shows overlap with D041 before saving. Wijzigingslog contains the created shifts.
- [ ] **Step 5: Commit** `feat: shift form with recurrence preview and live conflict check`

---

### Task 16: Remove dialog and change log page

**Files:** Create `src/components/shift/RemoveDialog.tsx`, `src/app/(app)/log/page.tsx`, `src/components/log/LogTimeline.tsx`

- [ ] **Step 1: RemoveDialog**: props `{ shift, mode: "employee" | "shift" }`. Title "Noor van deze dienst halen?" or "Dienst D041 annuleren?". Reason: radio list "Ziek", "Op verzoek opdrachtgever", "Dubbel gepland", "Anders" + textarea (required when Anders; otherwise optional extra text, final reason = label + text). If `isShortNotice(shift.date, ws.today, ws.noticeDays)`: info box "Deze dienst is binnen 7 dagen. De opdrachtgever (TSO De Brug) krijgt automatisch dit bericht:" + preview from `buildClientMessage`. Else muted line "Ruim van tevoren: alleen vastgelegd in het wijzigingslog." Submit calls `removeEmployee` / `cancelShift`.
- [ ] **Step 2: Log page** (server): query `change_log` (latest 500, ordered `at desc`) joined client-side with employee/location names from `loadWorkspace()`; also query `shifts` with `status = cancelled` for a "Geannuleerde diensten" tab.
- [ ] **Step 3: LogTimeline** (client): filters (search on shift code / name, action select, actor select), grouped by day. Each entry: time, actor line ("Sanne (planner)" or "Noor, via medewerker-app"), Dutch action sentence ("haalde Noor van D041", "annuleerde D041", "maakte D294 aan (Elke derde vrijdag van de maand)"), reason in a quote block, and an expandable before/after diff that lists only changed fields with friendly labels (Medewerker, Locatie, Datum, Tijd, Functie, Status). Click shift code → `/planbord?d=<date>&q=<code>`.
- [ ] **Step 4: Verify in browser**: remove Hana from D041 with reason "Ziek" → shift becomes Open on the planbord, log shows who/when/why, Berichten has one message. Cancel a November shift → log entry, no message ("ruim van tevoren").
- [ ] **Step 5: Commit** `feat: remove dialog with required reason and change log page`

---

### Task 17: Berichten (outbox), real email, settings

**Files:** Create `src/app/(app)/berichten/page.tsx`, `src/components/berichten/Outbox.tsx`, `src/app/actions/messages.ts`, `src/app/(app)/instellingen/page.tsx`

- [ ] **Step 1: Email action** `src/app/actions/messages.ts`

```ts
"use server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMIT = 5;

export async function emailMessage(messageId: string, to: string) {
  if (!EMAIL.test(to)) return { error: "Vul een geldig e-mailadres in." };
  const sb = await supabaseServer();
  const { data: ws } = await sb.from("workspaces").select("id, emails_sent").order("created_at", { ascending: false }).limit(1).single();
  if (!ws || ws.emails_sent >= LIMIT) return { error: `Maximaal ${LIMIT} e-mails per demo.` };
  const { data: msg } = await sb.from("client_messages").select("id, subject, body").eq("id", messageId).single();
  if (!msg) return { error: "Bericht niet gevonden." };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM!, to, subject: `[Demo] ${msg.subject}`,
    text: `${msg.body}\n\n--\nDit is een demobericht uit de AllKidz planning-demo met fictieve gegevens.`,
  });
  if (error) return { error: "Versturen mislukt." };
  await sb.from("workspaces").update({ emails_sent: ws.emails_sent + 1 }).eq("id", ws.id);
  await sb.from("client_messages").update({ emailed_at: new Date().toISOString() }).eq("id", msg.id);
  revalidatePath("/berichten");
  return { ok: true as const };
}
```
The recipient address is never written to the database.

- [ ] **Step 2: Outbox**: list newest first: subject, location, time, "Kort dag" badge, expandable body, "Gemaild" badge if `emailed_at`. Per message: "Stuur ook naar mij" input + button (calls `emailMessage`, toasts). Empty state: "Nog geen berichten. Haal iemand van een dienst binnen 7 dagen om er een te zien."
- [ ] **Step 3: Instellingen page**: form with "Meldingstermijn opdrachtgever (dagen)" number input (explanation: "Wijzigingen aan diensten binnen dit aantal dagen sturen automatisch een bericht. AllKidz moet deze grens nog bepalen, daarom is hij instelbaar.") and "Demodatum (vandaag)" date input (explanation: "De testdata is van 19 t/m 23 oktober 2026. De demo doet alsof het vandaag deze datum is."). Saves via `updateSettings`.
- [ ] **Step 4: Verify**: send to Luuk's own address once, email arrives with [Demo] subject; sixth attempt returns the limit error.
- [ ] **Step 5: Commit** `feat: client message outbox with optional real email and settings`

---

### Task 18: Medewerker mobile app

**Files:** Create `src/app/(app)/medewerker/[id]/page.tsx`, `src/components/medewerker/EmployeeApp.tsx`

- [ ] **Step 1: Page** (server): `loadWorkspace()`, find employee by id (404 if missing), pass data + employee + ws to the client component. The page renders inside a centered phone-width frame (max-w 420px) on desktop and full width on mobile, with a note above it on desktop: "Zo ziet Noor dit op haar telefoon."
- [ ] **Step 2: EmployeeApp**: bottom tab bar "Diensten", "Beschikbaar", "Open diensten".
  - **Diensten**: segmented Dag / Week / Maand. Dag: shifts of the chosen day as cards (time, location, city, function, "Route" link `https://www.google.com/maps/search/?api=1&query=<location name + city>`), each with "Afmelden" → bottom sheet with required reason → `removeEmployee(id, reason, actor, true)`. Week: list grouped by day with week total hours. Maand: `monthGrid` with dots on worked days, tap → Dag. Own conflicts shown as a red note on the card (the employee sees there is an issue too).
  - **Beschikbaar**: list of own unavailability entries (with delete) + form: datum, "Hele dag" toggle or van/tot, reden → `addUnavailability`. After saving, toast "Doorgegeven. De planner ziet dit direct." If it clashes with an existing own shift, show a warning: "Let op: je staat op D041 ingepland op dat moment. Meld je af als je niet kunt."
  - **Open diensten**: open shifts with `fn` in the employee's functions, date >= ws.today, for which `conflictsIfAssigned(data, shift, emp.id)` is empty; sorted by date. Each card: "Aannemen" → `assignEmployee(id, emp.id, actor)`. Below, a muted collapsible "Niet beschikbaar voor jou (N)" with the reason per shift (conflict message), so it is clear why others are hidden.
  - Actor: `{ role: "medewerker", name: emp.name, employeeId: emp.id }`.
- [ ] **Step 3: Verify** at 375px (resize_window mobile): Noor sees her Monday travel problem, accepts an open KidzCoach shift, the planbord shows her on it, the log shows "Noor, via medewerker-app nam open dienst aan", Berichten shows a message if within 7 days. Jayden (Zwemonderwijzer only) sees no KidzCoach open shifts.
- [ ] **Step 4: Commit** `feat: mobile employee screen (shifts, availability, open shifts, cancel)`

---

### Task 19: Opdrachtgever view

**Files:** Create `src/app/(app)/opdrachtgever/[id]/page.tsx`, `src/components/opdrachtgever/ClientView.tsx`

- [ ] **Step 1**: server page loads workspace + `client_messages` for this location. ClientView: header with location name, type, city; segmented Week / Maand; Week: per day the location's shifts with "1/1 gevuld" (green) or "Open" (orange) and the employee's first name; Maand: `monthGrid` with counts. Right/below: "Meldingen" inbox (messages for this location, newest first). Read-only, no internal reasons visible.
- [ ] **Step 2: Verify**: after removing Hana from D041, TSO De Brug shows the shift as Open and the message in Meldingen.
- [ ] **Step 3: Commit** `feat: read-only client view with notifications`

---

### Task 20: E2E happy path

**Files:** Create `playwright.config.ts`, `e2e/happy-path.spec.ts`

- [ ] **Step 1: Config**: `webServer: { command: "npm run dev", port: 3000, reuseExistingServer: true }`, `use: { baseURL: "http://localhost:3000" }`, env from `.env.local`.
- [ ] **Step 2: Test**

```ts
import { test, expect } from "@playwright/test";

test("planner finds a conflict, removes an employee with a reason, sees log and message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill(process.env.DEMO_EMAIL!);
  await page.getByLabel("Wachtwoord").fill(process.env.DEMO_PASSWORD!);
  await page.getByRole("button", { name: "Inloggen" }).click();
  await expect(page).toHaveURL(/planbord/);

  await page.getByRole("button", { name: /Alleen conflicten/ }).click();
  await expect(page.getByText(/Te weinig reistijd/).first()).toBeVisible();

  await page.goto("/planbord?d=2026-10-23&q=D041");
  await page.getByRole("button", { name: "Acties D041" }).click();
  await page.getByRole("menuitem", { name: "Medewerker eraf halen" }).click();
  await page.getByLabel("Ziek").check();
  await expect(page.getByText(/krijgt automatisch dit bericht/)).toBeVisible();
  await page.getByRole("button", { name: "Bevestigen" }).click();

  await page.goto("/log");
  await expect(page.getByText(/haalde Hana van D041/)).toBeVisible();
  await expect(page.getByText("Ziek")).toBeVisible();
  await page.goto("/berichten");
  await expect(page.getByText(/Wijziging dienst vr 23 okt 12:00-13:15/)).toBeVisible();
});
```
Accessible names used here (`Acties D041`, labels `E-mail`, `Wachtwoord`, `Ziek`, button `Bevestigen`) must exist in the components from Tasks 10, 13 and 16.

- [ ] **Step 3: Run** `npx playwright install chromium && npm run e2e` → PASS.
- [ ] **Step 4: Commit** `test: e2e happy path`

---

### Task 21: Deploy

- [ ] **Step 1**: Create GitHub repo (private) and push `main` (ask Luuk first; `gh` is not installed, so either install it or create the repo in the browser).
- [ ] **Step 2**: Vercel project `allkidz-planning-demo` linked to the repo, env vars from `.env.example` for Production. Pick a strong `DEMO_PASSWORD`.
- [ ] **Step 3**: Resend: `RESEND_FROM` must use a verified domain (luukvandijk.com); verify in the Resend dashboard.
- [ ] **Step 4**: Smoke test the production URL: login, golden conflicts visible, remove + log + message, employee screen at mobile width, reset.
- [ ] **Step 5**: README with: what it is, demo login, how to run locally (`npm i`, `.env.local`, `npm run dev`), tests (`npm test`, `npm run e2e`), architecture in 10 lines, known limitations.
- [ ] **Step 6: Commit** `docs: README and deploy notes`

---

### Task 22 (stretch): Suggest a suitable employee

**Files:** Create `src/lib/suggest.ts`; Test `tests/suggest.test.ts`; Modify `DayView.tsx` ("Inplannen" opens suggestions)

- [ ] **Step 1: Failing test**

```ts
import { it, expect } from "vitest";
import { rankCandidates } from "@/lib/suggest";
import { loadFixture } from "@/lib/testdata/load";
const data = loadFixture();
it("only suggests conflict-free employees with the right function, fewest hours first", () => {
  const shift = data.shifts.find((s) => s.id === "D010")!;
  const r = rankCandidates(data, shift);
  expect(r.length).toBeGreaterThan(0);
  for (const c of r) {
    const e = data.employees.find((x) => x.id === c.employeeId)!;
    expect(e.functions).toContain("KidzCoach");
  }
  expect(r.map((c) => c.employeeId)).not.toContain("Hana");
  for (let i = 1; i < r.length; i++) expect(r[i - 1].weekMinutes).toBeLessThanOrEqual(r[i].weekMinutes);
});
```

- [ ] **Step 2: Implement**

```ts
import type { PlanData, Shift } from "@/lib/types";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { durationMin } from "@/lib/hours";
import { mondayOf } from "@/lib/time";

export interface Candidate { employeeId: string; name: string; weekMinutes: number; dayShifts: number }
export function rankCandidates(data: PlanData, shift: Shift): Candidate[] {
  const week = mondayOf(shift.date);
  return data.employees
    .filter((e) => e.functions.includes(shift.fn))
    .filter((e) => conflictsIfAssigned(data, shift, e.id).length === 0)
    .map((e) => {
      const mine = data.shifts.filter((s) => s.employeeId === e.id && s.status === "active");
      return {
        employeeId: e.id, name: e.name,
        weekMinutes: mine.filter((s) => mondayOf(s.date) === week).reduce((t, s) => t + durationMin(s), 0),
        dayShifts: mine.filter((s) => s.date === shift.date).length,
      };
    })
    .sort((a, b) => a.weekMinutes - b.weekMinutes || a.name.localeCompare(b.name));
}
```

- [ ] **Step 3: UI**: on open shifts, "Stel iemand voor" shows top 5 with week hours and "Inplannen" → `assignEmployee` with PLANNER. Mention clearly in the UI: "Op basis van functie, beschikbaarheid, overlap en reistijd; minste uren deze week eerst."
- [ ] **Step 4: Commit** `feat: suggest suitable employee for open shifts`

---

### Task 23: Video script and A4

**Files:** Create `docs/video-script.md`, `docs/toelichting.md`

- [ ] **Step 1: Video script (Dutch, max 9 minutes)**: 0:00 probleem en keuzes (Sanne's 4 problemen, wat bewust niet); 1:00 login + sandbox per bezoeker; 1:45 planbord dag: conflicten en de valkuilen (Gijs krap, Niels, Amber), golden test noemen; 3:00 zoeken/filteren, week, maand; 4:00 dienst aanmaken met herhaling (derde vrijdag) + live conflict; 5:00 medewerker eraf halen met reden → log → bericht → echte mail; 6:00 medewerker-app op telefoonformaat: afmelden, beschikbaarheid, open dienst aannemen; 7:00 opdrachtgever-weergave; 7:30 hoe ik AI inzette en waar ik bijstuurde; 8:15 wat werkt niet / met meer tijd (echte rollen en accounts, push, server-side conflicten per week, koppelingen, AVG-rollen); einde.
- [ ] **Step 2: A4 toelichting (Dutch, max one page)** from `docs/ai-log.md`: werkwijze (spec eerst, pure modules met tests, AI als pair programmer), concrete prompts, waar ik bijstuurde (with real examples from the log), hoe ik controleerde (golden test, scripts, browser), privacy-keuzes, beperkingen.
- [ ] **Step 3: Commit** `docs: video script and A4 draft`

---

## Self-review notes

- Spec coverage: create + loose-date recurrence (T6, T15); per-employee sorted day view with overlap/travel/unavailable (+function) (T4, T5, T13); search/filter incl. conflicts-only/open-only (T8, T13); change log who/when/why, append-only, cancelled traceable (T9, T11, T16); extras: employee mobile (T18) and client message with 7-day setting + real email (T11, T17); Dag/Week/Maand + employee view + hours (T13, T14, T18, T19); sandbox per login + role switcher + reset + cleanup (T9, T10, T12); tests golden + Playwright (T4, T20); privacy (T9, T7 no reason to client, T17 address not stored); deploy (T21); stretch (T22); video/A4 (T23).
- Types used across tasks: `PlanData`, `Shift`, `Conflict`, `RecurrenceRule`, `Filters`, `Actor`, `ShiftRow`, `Workspace` are each defined once (T3, T6, T8, T11).
