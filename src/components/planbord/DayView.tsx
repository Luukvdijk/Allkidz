"use client";

import { Fragment, useMemo } from "react";
import { ArrowDown, CalendarOff, Plus } from "lucide-react";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import { buildDayTimeline, type Gap } from "@/lib/conflicts";
import { toMin, longDate } from "@/lib/time";
import { hoursLabel, totalMinutes } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { ShiftChip } from "./ShiftChip";
import { usePlan } from "./PlanContext";

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

export function DayView({ visible, date }: { visible: Shift[]; date: string }) {
  const { data, employees, byShift, create } = usePlan();

  const { open, rows } = useMemo(() => {
    const today = visible.filter((s) => s.date === date);
    const open = today.filter((s) => !s.employeeId).sort((a, b) => toMin(a.start) - toMin(b.start));
    const ids = [...new Set(today.filter((s) => s.employeeId).map((s) => s.employeeId!))];
    const visibleIds = new Set(today.map((s) => s.id));
    const rows = ids.map((id) => {
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

  if (open.length === 0 && rows.length === 0)
    return <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Geen diensten op {longDate(date)} met deze filters.</p>;

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <section aria-labelledby="open-heading">
          <h2 id="open-heading" className="mb-2 text-sm font-semibold text-open-foreground">
            Open diensten ({open.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {open.map((s) => (
              <ShiftChip key={s.id} shift={s} />
            ))}
          </div>
        </section>
      )}

      {rows.length > 0 && (
        <section aria-labelledby="emp-heading">
          <h2 id="emp-heading" className="mb-2 text-sm font-semibold">
            Per medewerker ({rows.length})
          </h2>
          <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {rows.map(({ id, timeline, conflicted, unavailable, visibleIds }) => {
              const emp = employees.get(id)!;
              return (
                <article
                  key={id}
                  className={cn("rounded-xl border bg-card p-3", conflicted && "border-destructive/40")}
                  aria-label={`Dag van ${emp.name}`}
                >
                  <header className="mb-2 flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                      {emp.name.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="leading-tight font-semibold">{emp.name}</h3>
                      <p className="text-xs text-muted-foreground">{emp.functions.join(", ")}</p>
                    </div>
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
            })}
          </div>
        </section>
      )}
    </div>
  );
}
