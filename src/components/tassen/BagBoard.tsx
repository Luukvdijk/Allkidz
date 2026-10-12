"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { PlanData, Shift } from "@/lib/types";
import { bagDay, bagDoubles, bagMonth, missingFor } from "@/lib/bags";
import { assignLanes, hourRange } from "@/lib/lanes";
import { addDays, addMonths, DAY_SHORT, longDate, mondayOf, monthGrid, monthLabel, shortDate, toMin } from "@/lib/time";
import type { MaterialReport } from "@/lib/data/requests";
import { resolveReport } from "@/app/actions/materials";
import { Button } from "@/components/ui/button";
import { DateStepper } from "@/components/DateStepper";

type Range = "dag" | "week" | "maand";

const when = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/** Per bag: who has it when. A bag goes home with the coach, so two coaches on one day is a double booking. */
export function BagBoard({ data, reports, today, start: startDate }: { data: PlanData; reports: MaterialReport[]; today: string; start?: string }) {
  const [range, setRange] = useState<Range>("dag");
  // Start on the first day from today on which a bag is used, so the day view never opens empty.
  const [date, setDate] = useState(() => startDate ?? data.shifts.filter((s) => s.bagId && s.status === "active" && s.date >= today).map((s) => s.date).sort()[0] ?? today);
  const [pending, start] = useTransition();
  const emp = useMemo(() => new Map(data.employees.map((e) => [e.id, e.name])), [data.employees]);
  const bagLabel = new Map((data.bags ?? []).map((b) => [b.id, b.label]));

  const open = reports.filter((r) => !r.resolvedAt);
  const resolve = (id: string) =>
    start(async () => {
      const r = await resolveReport(id);
      if ("error" in r) toast.error(r.error);
      else toast.success("Gemarkeerd als opgelost");
    });

  const step = (dir: 1 | -1) => setDate(range === "dag" ? addDays(date, dir) : range === "week" ? addDays(date, 7 * dir) : addMonths(date, dir));
  const openDay = (d: string) => {
    setDate(d);
    setRange("dag");
  };
  const title = range === "dag" ? longDate(date) : range === "week" ? `Week van ${shortDate(mondayOf(date))}` : monthLabel(date);

  return (
    <div className="space-y-6">
      <section aria-labelledby="missing">
        <h2 id="missing" className="mb-2 text-sm font-semibold">
          Missende materialen ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Niets gemeld.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {open.map((r) => {
              const shift = data.shifts.find((s) => s.id === r.shiftId);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  <AlertTriangle className="size-4 text-warn-foreground" aria-hidden />
                  <span className="font-medium">{bagLabel.get(r.bagId)}</span>
                  <span>&ldquo;{r.text}&rdquo;</span>
                  <span className="text-xs text-muted-foreground">
                    {r.employeeId && emp.get(r.employeeId)}
                    {shift && `, ${shift.code}`} · {when(r.createdAt)}
                  </span>
                  <Button size="sm" variant="outline" className="ml-auto" disabled={pending} onClick={() => resolve(r.id)}>
                    <Check /> Opgelost
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="usage" className="space-y-3">
        <h2 id="usage" className="text-sm font-semibold">
          Gebruik van de tassen
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-muted p-0.5" role="tablist" aria-label="Weergave">
            {(["dag", "week", "maand"] as const).map((r) => (
              <button
                key={r}
                role="tab"
                aria-selected={range === r}
                onClick={() => setRange(r)}
                className={cn("press rounded-md px-3 py-1 text-sm capitalize", range === r ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground")}
              >
                {r}
              </button>
            ))}
          </div>
          <DateStepper unit={range} onStep={step} titleClassName="sm:min-w-52">
            <span className="font-semibold first-letter:uppercase">{title}</span>
          </DateStepper>
        </div>
        {range === "dag" && <BagTimeline data={data} date={date} emp={emp} />}
        {range === "week" && <BagWeek data={data} monday={mondayOf(date)} emp={emp} onOpenDay={openDay} />}
        {range === "maand" && <BagMonth data={data} date={date} onOpenDay={openDay} />}
      </section>
    </div>
  );
}

/** Day: one row per bag on an hour axis. The faint band is the time the bag is with a coach, the bars are the shifts. */
function BagTimeline({ data, date, emp }: { data: PlanData; date: string; emp: Map<string, string> }) {
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const uses = bagDay(data, date);
  const byBag = new Map(uses.map((u) => [u.bagId, u]));
  const { from, to } = hourRange(uses.flatMap((u) => u.shifts));
  const pct = (t: string) => ((toMin(t) - from * 60) / ((to - from) * 60)) * 100;
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const inUse = uses.filter((u) => u.shifts.length > 0).length;
  const doubles = uses.filter((u) => u.double).length;

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {inUse} van {uses.length} tassen in gebruik
        {doubles > 0 && <span className="font-medium text-destructive">, {doubles} dubbel geboekt</span>}
      </p>
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="grid border-b bg-muted/60 sm:grid-cols-[12rem_1fr]">
          <span className="hidden px-3 py-1.5 text-xs font-medium text-muted-foreground sm:block">Tas</span>
          <div className="relative mx-3 h-7 sm:mx-0" aria-hidden>
            {hours.map((h) => (
              <span
                key={h}
                className="absolute top-1.5 -translate-x-1/2 text-[11px] text-muted-foreground tabular-nums first:translate-x-0 last:-translate-x-full"
                style={{ left: `${((h - from) / (to - from)) * 100}%` }}
              >
                {String(h).padStart(2, "0")}
                <span className="max-sm:hidden">:00</span>
              </span>
            ))}
          </div>
        </div>
        {(data.activities ?? []).map((a) => {
          const bags = (data.bags ?? []).filter((b) => b.activityId === a.id);
          if (bags.length === 0) return null;
          return (
            <div key={a.id}>
              <p className="border-b bg-muted/30 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {a.name} · {bags.filter((b) => (byBag.get(b.id)?.shifts.length ?? 0) > 0).length} van {bags.length} in gebruik
              </p>
              <ul className="divide-y">
                {bags.map((b) => {
                  const u = byBag.get(b.id)!;
                  const coaches = u.spans.map((s) => s.employeeId);
                  // A lane per coach; open shifts with this bag go below, in as few lanes as fit.
                  const openShifts = u.shifts.filter((s) => !s.employeeId);
                  const openLanes = assignLanes(openShifts);
                  const laneOf = (s: Shift) => (s.employeeId ? coaches.indexOf(s.employeeId) : coaches.length + openLanes.lanes[openShifts.indexOf(s)]);
                  const laneCount = Math.max(coaches.length + openLanes.count, 1);
                  const missing = missingFor(b.id, data);
                  return (
                    <li key={b.id} className="grid sm:grid-cols-[12rem_1fr]" aria-label={`${b.label}: ${u.shifts.length === 0 ? "vrij" : coaches.map((c) => emp.get(c)).join(", ") || "open dienst"}${u.double ? ", dubbel geboekt" : ""}`}>
                      <div className={cn("flex flex-wrap items-center gap-x-2 px-3 pt-2 sm:block sm:py-2.5", u.shifts.length === 0 && "max-sm:pb-2")}>
                        <p className="text-sm font-medium">{b.label.replace(`${a.name} `, "")}</p>
                        <p className={cn("text-xs", u.double ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {u.shifts.length === 0 ? "Vrij" : u.double ? "Dubbel: twee coaches" : coaches.length ? `Bij ${emp.get(coaches[0])}` : "Open dienst"}
                          {missing.length > 0 && <span className="ml-1.5 font-medium text-warn-foreground">· mist iets</span>}
                        </p>
                      </div>
                      <div className={cn("relative mx-3 mb-2 sm:mx-0 sm:mb-0 sm:border-l", u.shifts.length === 0 && "max-sm:hidden")} style={{ height: `${laneCount * 2.5 + 1}rem` }}>
                        {hours.map((h) => (
                          <span key={h} className="absolute inset-y-0 border-l border-dashed border-border/70" style={{ left: `${((h - from) / (to - from)) * 100}%` }} aria-hidden />
                        ))}
                        {u.spans.map((sp, i) => (
                          <span
                            key={sp.employeeId}
                            aria-hidden
                            className={cn("absolute h-8 rounded-md", u.double ? "bg-destructive/10" : "bg-primary/10")}
                            style={{ left: `${pct(sp.from)}%`, width: `${pct(sp.to) - pct(sp.from)}%`, top: `${i * 2.5 + 0.5}rem` }}
                          />
                        ))}
                        {u.shifts.map((s) => {
                          const who = s.employeeId ? emp.get(s.employeeId) : "Open dienst";
                          const label = `${who} · ${s.start}-${s.end}`;
                          return (
                            <Link
                              key={s.id}
                              href={`/planbord?d=${s.date}&q=${s.code}`}
                              title={`${label} · ${s.code} · ${loc.get(s.locationId) ?? ""}`}
                              className={cn(
                                "press absolute flex h-8 items-center overflow-hidden rounded-md border px-2 text-xs font-medium whitespace-nowrap",
                                !s.employeeId
                                  ? "border-dashed border-open/60 bg-open/15 text-open-foreground"
                                  : u.double
                                    ? "border-destructive/50 bg-destructive/15 text-destructive hover:bg-destructive/20"
                                    : "border-primary/40 bg-primary/15 text-foreground hover:bg-primary/25",
                              )}
                              style={{ left: `${pct(s.start)}%`, width: `${pct(s.end) - pct(s.start)}%`, top: `${laneOf(s) * 2.5 + 0.5}rem` }}
                            >
                              <span className="truncate">{label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Week: who has which bag on which day (the original table). Day headers open that day. */
function BagWeek({ data, monday, emp, onOpenDay }: { data: PlanData; monday: string; emp: Map<string, string>; onOpenDay: (d: string) => void }) {
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const { cells, doubles } = useMemo(() => {
    const cells = new Map<string, Shift[]>();
    for (const s of data.shifts) {
      if (s.status !== "active" || !s.bagId) continue;
      const k = `${s.bagId}|${s.date}`;
      (cells.get(k) ?? cells.set(k, []).get(k)!).push(s);
    }
    const doubles = new Set(bagDoubles(data.shifts).map((d) => `${d.bagId}|${d.date}`));
    return { cells, doubles };
  }, [data.shifts]);

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Tas</th>
            {days.map((d) => (
              <th key={d} className="border-l px-3 py-1.5 text-left font-medium">
                <button type="button" onClick={() => onOpenDay(d)} className="press -mx-1.5 rounded px-1.5 py-0.5 first-letter:uppercase hover:bg-muted hover:text-foreground">
                  {shortDate(d)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data.bags ?? []).map((b) => (
            <tr key={b.id} className="border-t align-top">
              <th scope="row" className="px-3 py-2 text-left font-medium">
                {b.label}
              </th>
              {days.map((d) => {
                const list = cells.get(`${b.id}|${d}`) ?? [];
                const dbl = doubles.has(`${b.id}|${d}`);
                return (
                  <td key={d} className={cn("border-l px-3 py-2", dbl && "bg-destructive/[0.06]")}>
                    {list.length === 0 ? (
                      <span className="text-xs text-muted-foreground">vrij</span>
                    ) : (
                      <ul className="space-y-0.5 text-xs">
                        {list.map((s) => (
                          <li key={s.id} className={cn(dbl && "font-medium text-destructive")}>
                            {s.employeeId ? emp.get(s.employeeId) : "open"} · {s.code}
                            <span className="block text-muted-foreground">{loc.get(s.locationId)}</span>
                          </li>
                        ))}
                        {dbl && <li className="font-medium text-destructive">Dubbel: twee coaches</li>}
                      </ul>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Month: per day how many bags are out and how many are double booked. A day opens the timeline. */
function BagMonth({ data, date, onOpenDay }: { data: PlanData; date: string; onOpenDay: (d: string) => void }) {
  const usage = useMemo(() => bagMonth(data.shifts), [data.shifts]);
  const total = data.bags?.length ?? 0;
  const month = date.slice(0, 7);
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid grid-cols-7 border-b bg-muted/60 text-center text-xs font-medium text-muted-foreground">
        {DAY_SHORT.map((d) => (
          <span key={d} className="py-1.5">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(date).map((d, i) => {
          const u = usage.get(d);
          const inMonth = d.startsWith(month);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onOpenDay(d)}
              aria-label={`${longDate(d)}: ${u ? `${u.inUse} van ${total} tassen in gebruik${u.doubles ? `, ${u.doubles} dubbel` : ""}` : "geen tassen in gebruik"}`}
              className={cn(
                "flex min-h-16 flex-col items-start gap-0.5 border-b p-1.5 text-left hover:bg-muted/50 sm:min-h-20 sm:p-2",
                i % 7 !== 0 && "border-l",
                !inMonth && "bg-muted/20 text-muted-foreground/60",
                u?.doubles && "bg-destructive/[0.05]",
              )}
            >
              <span className="text-xs font-medium tabular-nums">{Number(d.slice(8))}</span>
              {u && (
                <>
                  <span className="text-xs tabular-nums">
                    {u.inUse}
                    <span className="max-sm:hidden"> van {total} tassen</span>
                  </span>
                  {u.doubles > 0 && <span className="text-[11px] font-medium text-destructive">{u.doubles} dubbel</span>}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
