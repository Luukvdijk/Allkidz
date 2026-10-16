"use client";

import { useState } from "react";
import { DateStepper } from "@/components/DateStepper";
import { cn } from "cn";
import type { Employee, PlanData, Shift } from "@/lib/types";
import { addDays, addMonths, DAY_SHORT, longDate, mondayOf, monthGrid, monthLabel, shortDate, toMin, weekday } from "@/lib/time";
import { assignLanes, hourRange } from "@/lib/lanes";
import { NativeSelect } from "@/components/ui/native-select";

type Range = "dag" | "week" | "maand";
type Loc = PlanData["locations"][number];

interface PlanningProps {
  data: PlanData;
  today: string;
  shifts: Shift[];
  locations: Loc[];
  onCoach: (e: Employee) => void;
}

export function Planning({ data, today, shifts, locations, onCoach }: PlanningProps) {
  const [range, setRange] = useState<Range>("dag");
  // Start on the first day from today that has shifts, so the day view never opens empty.
  const [date, setDate] = useState(() => shifts.map((s) => s.date).filter((d) => d >= today).sort()[0] ?? today);
  const [locFilter, setLocFilter] = useState("");
  const emp = new Map(data.employees.map((e) => [e.id, e]));
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const act = new Map((data.activities ?? []).map((a) => [a.id, a.name]));
  const visible = shifts
    .filter((s) => !locFilter || s.locationId === locFilter)
    .sort((a, b) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start));
  const monday = mondayOf(date);
  const week = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const busy = new Set(shifts.map((s) => s.date));

  // Day steps skip weekend days without shifts; week and month steps are whole periods.
  const step = (dir: 1 | -1) => {
    if (range === "week") return setDate(addDays(date, 7 * dir));
    if (range === "maand") return setDate(addMonths(date, dir));
    let d = addDays(date, dir);
    while (weekday(d) > 5 && !busy.has(d)) d = addDays(d, dir);
    setDate(d);
  };
  const openDay = (d: string) => {
    setDate(d);
    setRange("dag");
  };
  const title = range === "dag" ? longDate(date) : range === "week" ? `Week van ${shortDate(monday)}` : monthLabel(date);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted p-0.5" role="tablist" aria-label="Weergave">
          {(["dag", "week", "maand"] as const).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("press rounded-md px-3 py-1 text-sm capitalize", range === r ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}>
              {r}
            </button>
          ))}
        </div>
        <DateStepper unit={range} onStep={step}>
          <span className="font-semibold first-letter:uppercase">{title}</span>
        </DateStepper>
        <NativeSelect aria-label="Locatie" value={locFilter} onChange={(e) => setLocFilter(e.target.value)} className="w-full sm:ml-auto sm:w-56">
          <option value="">Alle locaties</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
              {l.archived ? " (gearchiveerd)" : ""}
            </option>
          ))}
        </NativeSelect>
      </div>

      {range === "dag" ? (
        <DayTimeline
          shifts={visible.filter((s) => s.date === date)}
          locations={locations.filter((l) => (!locFilter || l.id === locFilter) && (!l.archived || visible.some((s) => s.date === date && s.locationId === l.id)))}
          emp={emp}
          act={act}
          onCoach={onCoach}
        />
      ) : range === "week" ? (
        <div className="space-y-2">
          {week.map((d) => {
            const list = visible.filter((s) => s.date === d);
            return (
              <section key={d} className="rounded-xl border bg-card p-3">
                <h3 className="mb-1.5 text-sm font-semibold first-letter:uppercase">
                  <button type="button" onClick={() => openDay(d)} className="first-letter:uppercase hover:underline">
                    {shortDate(d)}
                  </button>
                </h3>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Geen diensten.</p>
                ) : (
                  <ul className="divide-y">
                    {list.map((s) => {
                      const e = s.employeeId ? emp.get(s.employeeId) : null;
                      return (
                        <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
                          <span className="font-medium tabular-nums">{s.start}-{s.end}</span>
                          <span>{locName.get(s.locationId)}</span>
                          <span className="text-muted-foreground">
                            {s.fn}
                            {s.activityId && ` · ${act.get(s.activityId)}`}
                          </span>
                          <span className="ml-auto">
                            <CoachPill coach={e ?? null} onCoach={onCoach} />
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-7 overflow-hidden rounded-xl border bg-card text-xs">
          {DAY_SHORT.map((d) => (
            <div key={d} className="border-b bg-muted/60 px-2 py-1 font-medium text-muted-foreground uppercase">
              {d}
            </div>
          ))}
          {monthGrid(date).map((d) => {
            const list = visible.filter((s) => s.date === d);
            const filled = list.filter((s) => s.employeeId).length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => openDay(d)}
                className={cn("min-h-16 border-b border-l p-1.5 text-left hover:bg-muted/50", !d.startsWith(date.slice(0, 7)) && "bg-muted/30 text-muted-foreground")}
              >
                <span className="tabular-nums">{Number(d.slice(8))}</span>
                {list.length > 0 && <p className={cn("mt-1", filled < list.length && "font-medium text-warn-foreground")}>{filled}/{list.length} gevuld</p>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CoachPill({ coach, onCoach }: { coach: Employee | null; onCoach: (e: Employee) => void }) {
  return coach ? (
    <button type="button" onClick={() => onCoach(coach)} className="rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok hover:underline">
      1/1 · {coach.name}
    </button>
  ) : (
    <span className="rounded-full bg-warn/20 px-2 py-0.5 text-xs font-medium text-warn-foreground">0/1 nog niet gevuld</span>
  );
}

interface DayProps {
  shifts: Shift[];
  locations: Loc[];
  emp: Map<string, Employee>;
  act: Map<string, string>;
  onCoach: (e: Employee) => void;
}

/** One row per location with its shifts on a time axis. On a phone the same day is a vertical calendar instead. */
function DayTimeline({ shifts, locations, emp, act, onCoach }: DayProps) {
  const { from, to } = hourRange(shifts);
  const span = (to - from) * 60;
  const pct = (t: string) => ((toMin(t) - from * 60) / span) * 100;
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const filled = shifts.filter((s) => s.employeeId).length;

  if (locations.length === 0) return <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Geen locaties.</p>;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {shifts.length === 0 ? "Geen diensten op deze dag." : `${shifts.length} ${shifts.length === 1 ? "dienst" : "diensten"}, ${filled} gevuld`}
        {shifts.length > filled && <span className="font-medium text-warn-foreground">, {shifts.length - filled} nog open</span>}
      </p>
      <VerticalDay shifts={shifts} locations={locations} emp={emp} act={act} onCoach={onCoach} />
      <div className="hidden overflow-hidden rounded-xl border bg-card sm:block">
        <div className="grid grid-cols-[13rem_1fr] border-b bg-muted/60">
          <span className="px-3 py-1.5 text-xs font-medium text-muted-foreground">Locatie</span>
          <div className="relative h-7" aria-hidden>
            {hours.map((h) => (
              <span key={h} className="absolute top-1.5 -translate-x-1/2 text-[11px] text-muted-foreground tabular-nums first:translate-x-0 last:-translate-x-full" style={{ left: `${((h - from) / (to - from)) * 100}%` }}>
                {String(h).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>
        <ul className="divide-y">
          {locations.map((l) => {
            const list = shifts.filter((s) => s.locationId === l.id).sort((a, b) => toMin(a.start) - toMin(b.start));
            const { lanes, count } = assignLanes(list);
            const open = list.filter((s) => !s.employeeId).length;
            return (
              <li key={l.id} className="grid grid-cols-[13rem_1fr]" aria-label={`${l.name}, ${list.length} ${list.length === 1 ? "dienst" : "diensten"}`}>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.type} · {l.city}
                    {open > 0 && <span className="font-medium text-warn-foreground"> · {open} open</span>}
                  </p>
                </div>

                <div className="relative border-l" style={{ height: `${Math.max(count, 1) * 2.5 + 1}rem` }}>
                  {hours.map((h) => (
                    <span key={h} className="absolute inset-y-0 border-l border-dashed border-border/70" style={{ left: `${((h - from) / (to - from)) * 100}%` }} aria-hidden />
                  ))}
                  {list.map((s, i) => {
                    const coach = s.employeeId ? emp.get(s.employeeId) : null;
                    const label = `${s.start}-${s.end} · ${coach ? coach.name : "nog niet gevuld"}`;
                    const detail = `${label} · ${s.fn}${s.activityId ? ` · ${act.get(s.activityId)}` : ""}`;
                    const style = { left: `${pct(s.start)}%`, width: `${pct(s.end) - pct(s.start)}%`, top: `${lanes[i] * 2.5 + 0.5}rem` };
                    const cls = "absolute flex h-8 items-center overflow-hidden rounded-md border px-2 text-left text-xs whitespace-nowrap";
                    return coach ? (
                      <button key={s.id} type="button" title={detail} onClick={() => onCoach(coach)} style={style} className={cn(cls, "border-ok/40 bg-ok/15 font-medium text-ok hover:bg-ok/25")}>
                        <span className="truncate">{label}</span>
                      </button>
                    ) : (
                      <div key={s.id} title={detail} style={style} className={cn(cls, "border-dashed border-warn bg-warn/20 font-medium text-warn-foreground")}>
                        <span className="truncate">{label}</span>
                      </div>
                    );
                  })}
                  {list.length === 0 && <span className="absolute top-3 left-3 text-xs text-muted-foreground">Geen diensten.</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const HOUR_PX = 56;
const LANE_PX = 68;

/**
 * Phone version of the day: hours run down the left, one column per location with shifts,
 * coaches working at the same time side by side. Wider than the screen means swipe sideways;
 * the hour column stays put.
 */
function VerticalDay({ shifts, locations, emp, act, onCoach }: DayProps) {
  const { from, to } = hourRange(shifts);
  const hours = Array.from({ length: to - from }, (_, i) => from + i);
  const top = (t: string) => ((toMin(t) - from * 60) / 60) * HOUR_PX;
  const columns = locations
    .map((l) => {
      const list = shifts.filter((s) => s.locationId === l.id).sort((a, b) => toMin(a.start) - toMin(b.start));
      return { l, list, ...assignLanes(list) };
    })
    .filter((c) => c.list.length > 0);
  const empty = locations.filter((l) => !columns.some((c) => c.l.id === l.id));
  const width = (count: number) => Math.max(count * LANE_PX, 128);

  return (
    <div className="space-y-2 sm:hidden">
      {columns.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card" role="group" aria-label="Dagkalender">
          <div className="flex w-max min-w-full">
            <div className="sticky left-0 z-10 w-11 shrink-0 border-r bg-card">
              <div className="h-12 border-b" />
              {hours.map((h) => (
                <div key={h} className="relative border-b border-dashed border-border/70 text-[11px] text-muted-foreground tabular-nums" style={{ height: HOUR_PX }}>
                  <span className="absolute top-0.5 left-1.5">{String(h).padStart(2, "0")}:00</span>
                </div>
              ))}
            </div>
            {columns.map(({ l, list, lanes, count }) => (
              <section key={l.id} className="shrink-0 border-r last:border-r-0" style={{ width: width(count) }} aria-label={`${l.name}, ${list.length} ${list.length === 1 ? "dienst" : "diensten"}`}>
                <header className="h-12 overflow-hidden border-b px-2 py-1.5">
                  <p className="truncate text-xs font-semibold">{l.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{l.city}</p>
                </header>
                <div className="relative" style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h, i) => (
                    <span key={h} className="absolute inset-x-0 border-b border-dashed border-border/70" style={{ top: (i + 1) * HOUR_PX - 1 }} aria-hidden />
                  ))}
                  {list.map((s, i) => {
                    const coach = s.employeeId ? emp.get(s.employeeId) : null;
                    const laneW = 100 / Math.max(count, 1);
                    const style = { top: top(s.start) + 1, height: top(s.end) - top(s.start) - 2, left: `calc(${lanes[i] * laneW}% + 2px)`, width: `calc(${laneW}% - 4px)` };
                    const body = (
                      <>
                        <span className="block font-semibold">{coach ? coach.name : "Nog open"}</span>
                        <span className="block text-[10px] whitespace-nowrap tabular-nums opacity-80">{s.start}-{s.end}</span>
                        <span className="block truncate opacity-80">{s.activityId ? act.get(s.activityId) : s.fn}</span>
                      </>
                    );
                    const cls = "absolute overflow-hidden rounded-md border px-1.5 py-1 text-left text-[11px] leading-tight";
                    const detail = `${s.start}-${s.end} · ${coach ? coach.name : "nog niet gevuld"} · ${s.fn}`;
                    return coach ? (
                      <button key={s.id} type="button" title={detail} onClick={() => onCoach(coach)} style={style} className={cn(cls, "border-ok/40 bg-ok/15 text-ok")}>
                        {body}
                      </button>
                    ) : (
                      <div key={s.id} title={detail} style={style} className={cn(cls, "border-dashed border-warn bg-warn/20 text-warn-foreground")}>
                        {body}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
      {empty.length > 0 && columns.length > 0 && (
        <p className="text-xs text-muted-foreground">Geen diensten bij: {empty.map((l) => l.name).join(", ")}.</p>
      )}
    </div>
  );
}
