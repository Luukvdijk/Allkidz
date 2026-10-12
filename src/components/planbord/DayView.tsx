"use client";

import { Fragment, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { ArrowDown, CalendarOff, ChevronDown, Plus } from "lucide-react";
import { cn } from "cn";
import type { Shift, Unavailability } from "@/lib/types";
import { buildDayTimeline, type Gap } from "@/lib/conflicts";
import { toMin, longDate } from "@/lib/time";
import { hoursLabel, totalMinutes } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { ShiftChip } from "./ShiftChip";
import { useStoredFlag } from "./useStoredFlag";
import { usePlan } from "./PlanContext";
import { EmptyState } from "@/components/EmptyState";
import { SearchX } from "lucide-react";

function GapStrip({ gap }: { gap: Gap }) {
  const need = gap.need ?? 0;
  const text =
    gap.status === "overlap"
      ? "Overlapt met de volgende dienst"
      : gap.status === "onbekend"
        ? `${gap.gap} min tussen de diensten, reistijd onbekend (nieuwe locatie)`
        : gap.status === "te-krap"
        ? `${gap.gap} min tussen de diensten, reistijd ${need} min`
        : gap.status === "krap"
          ? `Precies genoeg reistijd (${need} min)`
          : need === 0
            ? `${gap.gap} min, zelfde locatie`
            : `${gap.gap} min, reistijd ${need} min`;
  return (
    <div
      className={cn(
        "ml-3 flex items-center gap-1.5 border-l-2 py-1 pl-3 text-xs",
        gap.status === "ok" && "border-border text-muted-foreground",
        (gap.status === "krap" || gap.status === "onbekend") && "border-warn font-medium text-warn-foreground",
        (gap.status === "te-krap" || gap.status === "overlap") && "border-destructive font-medium text-destructive",
      )}
    >
      <ArrowDown className="size-3" aria-hidden />
      {text}
      {gap.status === "krap" && <span className="rounded bg-warn/20 px-1 text-[10px] uppercase tracking-wide">krap</span>}
    </div>
  );
}

/** A titled block on the day view that the planner can fold away; the choice is remembered in this browser. */
function DaySection({ id, title, tone, summary, children }: { id: string; title: string; tone?: "open" | "bad"; summary?: string; children: ReactNode }) {
  const [expanded, setExpanded] = useStoredFlag(`planbord.dag.${id}`, true);
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="mb-2 text-sm font-semibold">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={`${id}-body`}
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "press -mx-1.5 inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 hover:bg-muted",
            tone === "open" && "text-open-foreground",
            tone === "bad" && "text-destructive",
          )}
        >
          <ChevronDown className={cn("size-4 transition-transform", !expanded && "-rotate-90")} aria-hidden />
          {title}
        </button>
        {!expanded && summary && <span className="ml-2 text-xs font-normal text-muted-foreground">{summary}</span>}
      </h2>
      <div id={`${id}-body`} hidden={!expanded}>
        {children}
      </div>
    </section>
  );
}

type DayRow = { id: string; timeline: ReturnType<typeof buildDayTimeline>; conflicted: boolean; unavailable: Unavailability[]; visibleIds: Set<string> };

/** One employee's day: shifts in time order with the gaps between them. Used in Conflicten and Per medewerker. */
function EmployeeDayCard({ row, date }: { row: DayRow; date: string }) {
  const { employees, create } = usePlan();
  const { id, timeline, conflicted, unavailable, visibleIds } = row;
  const emp = employees.get(id)!;
  return (
    <article
      className={cn("rounded-xl border bg-card p-3", conflicted && "border-destructive/40")}
      aria-label={`Dag van ${emp.name}`}
    >
      <header className="mb-2 flex items-center gap-2">
        <Link
          href={`/medewerkers/${id}`}
          className="group/emp -m-1 flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 hover:bg-muted/60"
          aria-label={`Profiel en overzicht van ${emp.name}`}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {emp.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="leading-tight font-semibold underline-offset-2 group-hover/emp:underline">{emp.name}</h3>
            <p className="text-xs text-muted-foreground">{emp.functions.join(", ")}</p>
          </div>
        </Link>
        <span className="text-xs text-muted-foreground tabular-nums">
          {timeline.shifts.length} {timeline.shifts.length === 1 ? "dienst" : "diensten"} ·{" "}
          {hoursLabel(totalMinutes(timeline.shifts))}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Dienst toevoegen voor ${emp.name}`}
          onClick={() => create({ date, employeeId: id })}
        >
          <Plus />
        </Button>
      </header>
      {unavailable.map((u) => (
        <p
          key={u.id}
          className="mb-2 flex items-center gap-1.5 rounded-md bg-[repeating-linear-gradient(135deg,var(--muted),var(--muted)_6px,transparent_6px,transparent_12px)] px-2 py-1 text-xs text-muted-foreground"
        >
          <CalendarOff className="size-3.5" aria-hidden />
          Niet beschikbaar {u.from === "00:00" && u.to === "23:59" ? "hele dag" : `${u.from}-${u.to}`} ({u.reason})
        </p>
      ))}
      <div>
        {timeline.shifts.map((s, i) => (
          <Fragment key={s.id}>
            <ShiftChip shift={s} dimmed={!visibleIds.has(s.id)} />
            {timeline.gaps[i] && <GapStrip gap={timeline.gaps[i]} />}
          </Fragment>
        ))}
      </div>
    </article>
  );
}

export function DayView({ visible, date }: { visible: Shift[]; date: string }) {
  const { data, employees, byShift } = usePlan();

  // Shifts with a conflict on this day, the same count as the toolbar toggle and the day strip.
  const dayConflicts = useMemo(() => visible.filter((s) => s.date === date && byShift.has(s.id)).length, [visible, date, byShift]);

  const { open, rows } = useMemo(() => {
    const today = visible.filter((s) => s.date === date);
    const open = today.filter((s) => !s.employeeId).sort((a, b) => toMin(a.start) - toMin(b.start));
    const ids = [...new Set(today.filter((s) => s.employeeId).map((s) => s.employeeId!))];
    const visibleIds = new Set(today.map((s) => s.id));
    const rows: DayRow[] = ids.map((id) => {
      const timeline = buildDayTimeline(data, id, date);
      const conflicted = timeline.shifts.some((s) => byShift.has(s.id));
      const unavailable = data.unavailability.filter((u) => u.employeeId === id && u.date === date);
      return { id, timeline, conflicted, unavailable, visibleIds };
    });
    rows.sort(
      (a, b) =>
        Number(b.conflicted) - Number(a.conflicted) ||
        toMin(a.timeline.shifts[0].start) - toMin(b.timeline.shifts[0].start) ||
        employees.get(a.id)!.name.localeCompare(employees.get(b.id)!.name),
    );
    return { open, rows };
  }, [visible, date, data, byShift, employees]);
  // Employees with a conflict move to the Conflicten section, in the same card, so they are fixed in one place.
  const troubled = rows.filter((r) => r.conflicted);
  const calm = rows.filter((r) => !r.conflicted);

  if (open.length === 0 && rows.length === 0)
    return (
      <EmptyState icon={SearchX} title={`Geen diensten op ${longDate(date)}`} />
    );

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <DaySection id="open" title={`Open diensten (${open.length})`} tone="open" summary="Nog niemand ingepland">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {open.map((s) => (
              <ShiftChip key={s.id} shift={s} />
            ))}
          </div>
        </DaySection>
      )}

      {troubled.length > 0 && (
        <DaySection
          id="conflicts"
          title={`Conflicten (${dayConflicts})`}
          tone="bad"
          summary={`Bij ${troubled.map((r) => employees.get(r.id)!.name).join(", ")}`}
        >
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {troubled.map((row) => (
              <EmployeeDayCard key={row.id} row={row} date={date} />
            ))}
          </div>
        </DaySection>
      )}

      {calm.length > 0 && (
        <DaySection
          id="employees"
          title={`Per medewerker (${calm.length})`}
          summary={`${calm.length} zonder conflict, ${hoursLabel(calm.reduce((t, r) => t + totalMinutes(r.timeline.shifts), 0))} in totaal`}
        >
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {calm.map((row) => (
              <EmployeeDayCard key={row.id} row={row} date={date} />
            ))}
          </div>
        </DaySection>
      )}
    </div>
  );
}
