"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, CircleDashed, Plus, Search, X } from "lucide-react";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import { hasActiveFilters, type Filters, type View } from "@/lib/filters";
import { addDays, addMonths, longDate, mondayOf, monthLabel, shortDate } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { usePlan } from "./PlanContext";

const VIEWS: { v: View; label: string }[] = [
  { v: "dag", label: "Dag" },
  { v: "lijst", label: "Lijst" },
  { v: "week", label: "Week" },
  { v: "maand", label: "Maand" },
];
const FUNCTIONS = ["KidzCoach", "Toezichthouder", "Aqualessen", "Zwemonderwijzer", "Gymdocent"];

interface Props {
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  /** visible shifts ignoring the conflicts/open toggles, for honest counts on those toggles */
  scoped: Shift[];
  visible: Shift[];
}

export function Toolbar({ filters, set, scoped, visible }: Props) {
  const { data, byShift, create } = usePlan();
  const [q, setQ] = useState(filters.q);

  // Debounced search into the URL.
  useEffect(() => {
    if (q === filters.q) return;
    const t = setTimeout(() => set({ q }), 150);
    return () => clearTimeout(t);
  }, [q, filters.q, set]);

  const step = (dir: 1 | -1) => {
    const d = filters.date;
    if (filters.view === "dag") return set({ date: addDays(d, dir) });
    if (filters.view === "maand") return set({ date: addMonths(d, dir) });
    return set({ date: addDays(d, 7 * dir) });
  };

  const monday = mondayOf(filters.date);
  const week = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const title =
    filters.view === "dag" ? longDate(filters.date)
    : filters.view === "maand" ? monthLabel(filters.date)
    : `Week van ${shortDate(monday)}`;

  const conflictCount = scoped.filter((s) => byShift.has(s.id)).length;
  const openCount = scoped.filter((s) => !s.employeeId).length;

  // Hours for the selected employee: day, week, month (feature list: uren per dag, week en maand).
  const emp = filters.employeeId;
  const empMinutes = (pred: (s: Shift) => boolean) =>
    data.shifts.filter((s) => s.status === "active" && s.employeeId === emp && pred(s)).reduce((t, s) => t + durationMin(s), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Weergave" className="inline-flex rounded-lg border bg-muted p-0.5">
          {VIEWS.map(({ v, label }) => (
            <button
              key={v}
              role="tab"
              aria-selected={filters.view === v}
              onClick={() => set({ view: v })}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                filters.view === v ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" aria-label="Vorige" onClick={() => step(-1)}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Volgende" onClick={() => step(1)}>
            <ChevronRight />
          </Button>
        </div>
        <h1 className="text-lg font-semibold tracking-tight first-letter:uppercase">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant={filters.onlyConflicts ? "destructive" : "outline"}
            size="sm"
            aria-pressed={filters.onlyConflicts}
            onClick={() => set({ onlyConflicts: !filters.onlyConflicts })}
          >
            <AlertTriangle /> Alleen conflicten ({conflictCount})
          </Button>
          <Button
            variant={filters.onlyOpen ? "secondary" : "outline"}
            size="sm"
            aria-pressed={filters.onlyOpen}
            onClick={() => set({ onlyOpen: !filters.onlyOpen })}
            className={cn(filters.onlyOpen && "bg-open/15 text-open-foreground")}
          >
            <CircleDashed /> Alleen open ({openCount})
          </Button>
          <Button size="sm" onClick={() => create({ date: filters.date })}>
            <Plus /> Nieuwe dienst
          </Button>
        </div>
      </div>

      {(filters.view === "dag" || filters.view === "lijst") && (
        <div className="flex gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Dag van de week">
          {week.map((d) => {
            const day = visible.filter((s) => s.date === d);
            const c = day.filter((s) => byShift.has(s.id)).length;
            const o = day.filter((s) => !s.employeeId).length;
            const active = filters.view === "dag" && d === filters.date;
            return (
              <button
                key={d}
                role="tab"
                aria-selected={active}
                onClick={() => set({ date: d, view: "dag" })}
                className={cn(
                  "min-w-28 flex-1 rounded-lg border px-3 py-1.5 text-left transition-colors",
                  active ? "border-primary bg-accent" : "bg-card hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium first-letter:uppercase">{shortDate(d)}</span>
                <span className="flex gap-2 text-xs text-muted-foreground tabular-nums">
                  <span>{day.length} dnst</span>
                  {o > 0 && <span className="text-open-foreground">{o} open</span>}
                  {c > 0 && <span className="font-medium text-destructive">{c} confl</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek medewerker, locatie, code"
            aria-label="Zoeken"
            className="pl-8"
          />
        </div>
        <NativeSelect aria-label="Medewerker" value={filters.employeeId ?? ""} onChange={(e) => set({ employeeId: e.target.value || undefined })} className="w-40">
          <option value="">Alle medewerkers</option>
          {data.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Locatie" value={filters.locationId ?? ""} onChange={(e) => set({ locationId: e.target.value || undefined })} className="w-48">
          <option value="">Alle locaties</option>
          {data.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Functie" value={filters.fn ?? ""} onChange={(e) => set({ fn: e.target.value || undefined })} className="w-40">
          <option value="">Alle functies</option>
          {FUNCTIONS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </NativeSelect>
        {hasActiveFilters(filters) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              set({ q: "", employeeId: undefined, locationId: undefined, fn: undefined, onlyConflicts: false, onlyOpen: false });
            }}
          >
            <X /> Wis filters
          </Button>
        )}
        {emp && (
          <p className="ml-auto text-sm text-muted-foreground tabular-nums">
            Uren: dag <b className="text-foreground">{hoursLabel(empMinutes((s) => s.date === filters.date))}</b> · week{" "}
            <b className="text-foreground">{hoursLabel(empMinutes((s) => mondayOf(s.date) === monday))}</b> · maand{" "}
            <b className="text-foreground">{hoursLabel(empMinutes((s) => s.date.startsWith(filters.date.slice(0, 7))))}</b>
          </p>
        )}
      </div>
    </div>
  );
}
