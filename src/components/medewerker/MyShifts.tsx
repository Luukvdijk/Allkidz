"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import { addDays, addMonths, DAY_SHORT, longDate, mondayOf, monthGrid, monthLabel, shortDate } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import type { Actor } from "@/lib/data/actor";
import { Button } from "@/components/ui/button";
import { ConflictLine } from "@/components/planbord/ConflictBadge";
import { usePlan } from "@/components/planbord/PlanContext";
import { EmptyState } from "@/components/EmptyState";
import { BagPanel } from "./BagPanel";
import { Range } from "./shared";

function ShiftCard({ s, actor }: { s: Shift; actor: Actor }) {
  const { locations, byShift, remove, ws } = usePlan();
  const loc = locations.get(s.locationId)!;
  const conflicts = byShift.get(s.id) ?? [];
  const past = s.date < ws.today;
  return (
    <li className={cn("rounded-xl border bg-card p-3", conflicts.length > 0 && "border-destructive/40")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold tabular-nums">{s.start}-{s.end}</p>
          <p className="text-sm">{loc.name}</p>
          <p className="text-xs text-muted-foreground">
            {loc.city} · {s.fn} · {s.code}
          </p>
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.name} ${loc.city}`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted"
        >
          <MapPin className="size-3.5" aria-hidden /> Route
        </a>
      </div>
      {conflicts.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {conflicts.map((c, i) => (
            <ConflictLine key={i} conflict={c} compact />
          ))}
        </div>
      )}
      {s.bagId && <BagPanel s={s} actor={actor} />}
      {!past && (
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => remove(s, "employee")}>
          Afmelden
        </Button>
      )}
    </li>
  );
}

export function MyShifts({ mine, actor }: { mine: Shift[]; actor: Actor }) {
  const [range, setRange] = useState<Range>("week");
  const [date, setDate] = useState(() => mine[0]?.date ?? "2026-10-19");
  const monday = mondayOf(date);

  const step = (dir: 1 | -1) => setDate(range === "dag" ? addDays(date, dir) : range === "week" ? addDays(date, 7 * dir) : addMonths(date, dir));
  const title = range === "dag" ? longDate(date) : range === "week" ? `Week van ${shortDate(monday)}` : monthLabel(date);
  const inRange = mine.filter((s) =>
    range === "dag" ? s.date === date : range === "week" ? s.date >= monday && s.date <= addDays(monday, 6) : s.date.startsWith(date.slice(0, 7)),
  );
  const minutes = inRange.reduce((t, s) => t + durationMin(s), 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 rounded-lg border bg-muted p-0.5 text-sm md:w-72" role="tablist">
        {(["dag", "week", "maand"] as const).map((r) => (
          <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("press rounded-md py-1 capitalize", range === r ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}>
            {r}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between md:justify-start md:gap-2">
        <Button variant="ghost" size="icon-sm" aria-label="Vorige" onClick={() => step(-1)}>
          <ChevronLeft />
        </Button>
        <div className="text-center md:min-w-56">
          <p className="text-sm font-semibold first-letter:uppercase md:text-base">{title}</p>
          <p className="text-xs text-muted-foreground">
            {inRange.length} {inRange.length === 1 ? "dienst" : "diensten"} · {hoursLabel(minutes)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Volgende" onClick={() => step(1)}>
          <ChevronRight />
        </Button>
      </div>

      {range === "maand" ? (
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs md:max-w-2xl md:text-sm">
          {DAY_SHORT.map((d) => (
            <span key={d} className="py-1 text-muted-foreground">
              {d}
            </span>
          ))}
          {monthGrid(date).map((d) => {
            const has = mine.some((s) => s.date === d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => { setDate(d); setRange("dag"); }}
                className={cn("relative rounded-md py-2 tabular-nums hover:bg-muted md:py-5", !d.startsWith(date.slice(0, 7)) && "text-muted-foreground/50", has && "font-semibold")}
              >
                {Number(d.slice(8))}
                {has && <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      ) : inRange.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Geen diensten in deze periode" />
      ) : range === "dag" ? (
        <ul className="grid gap-2 md:grid-cols-2">
          {inRange.map((s) => <ShiftCard key={s.id} s={s} actor={actor} />)}
        </ul>
      ) : (
        <div className="space-y-3">
          {[...new Set(inRange.map((s) => s.date))].map((d) => (
            <section key={d}>
              <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{shortDate(d)}</h3>
              <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {inRange.filter((s) => s.date === d).map((s) => <ShiftCard key={s.id} s={s} actor={actor} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
