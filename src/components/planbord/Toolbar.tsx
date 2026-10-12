"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CircleDashed, Plus, Search, X } from "lucide-react";
import { DateStepper } from "@/components/DateStepper";
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

  // Phone: the weekday strip shows three whole days and swipes; keep the chosen day in view.
  const strip = useRef<HTMLDivElement>(null);
  const firstScroll = useRef(true);
  useEffect(() => {
    const el = strip.current;
    const active = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !active || el.scrollWidth <= el.clientWidth) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const left = active.offsetLeft - el.offsetLeft - pad;
    const right = left + active.offsetWidth;
    if (left >= el.scrollLeft && right <= el.scrollLeft + el.clientWidth - 2 * pad) return;
    const smooth = !firstScroll.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    firstScroll.current = false;
  }, [filters.date, filters.view]);
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
                "rounded-md px-3 py-1 text-sm press",
                filters.view === v ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <DateStepper unit={filters.view === "dag" ? "dag" : filters.view === "maand" ? "maand" : "week"} onStep={step} titleClassName="sm:min-w-52">
          <h1 className="text-lg font-semibold tracking-tight first-letter:uppercase">{title}</h1>
        </DateStepper>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <Button
            variant={filters.onlyConflicts ? "destructive" : "outline"}
            size="sm"
            aria-pressed={filters.onlyConflicts}
            onClick={() => set({ onlyConflicts: !filters.onlyConflicts })}
          >
            <AlertTriangle /> <span className="sm:hidden">Conflicten</span><span className="hidden sm:inline">Alleen conflicten</span> ({conflictCount})
          </Button>
          <Button
            variant={filters.onlyOpen ? "secondary" : "outline"}
            size="sm"
            aria-pressed={filters.onlyOpen}
            onClick={() => set({ onlyOpen: !filters.onlyOpen })}
            className={cn(filters.onlyOpen && "bg-open/15 text-open-foreground")}
          >
            <CircleDashed /> <span className="sm:hidden">Open</span><span className="hidden sm:inline">Alleen open</span> ({openCount})
          </Button>
          <Button size="sm" className="ml-auto sm:ml-0" onClick={() => create({ date: filters.date })}>
            <Plus /> Nieuwe dienst
          </Button>
        </div>
      </div>

      {(filters.view === "dag" || filters.view === "lijst") && (
        <div
          ref={strip}
          className="grid snap-x snap-mandatory auto-cols-[calc((100%-0.5rem)/3)] grid-flow-col gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] sm:flex sm:overflow-visible [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Dag van de week"
        >
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
                  "min-w-0 snap-start rounded-lg border px-2.5 py-1.5 text-left press sm:min-w-28 sm:flex-1 sm:px-3",
                  active ? "border-primary bg-accent" : "bg-card hover:bg-muted",
                )}
              >
                <span className="block text-sm font-medium first-letter:uppercase">{shortDate(d)}</span>
                <span className="flex gap-1.5 text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:gap-2">
                  <span className="hidden sm:inline">{day.length} dnst</span>
                  {o > 0 && <span className="text-open-foreground">{o} open</span>}
                  {c > 0 && <span className="font-medium text-destructive">{c} confl</span>}
                  {o === 0 && c === 0 && <span className="sm:hidden">{day.length} dnst</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
        <div className="relative col-span-2 sm:w-64">
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
        <NativeSelect aria-label="Medewerker" value={filters.employeeId ?? ""} onChange={(e) => set({ employeeId: e.target.value || undefined })} className="w-full sm:w-40">
          <option value="">Alle medewerkers</option>
          {data.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Locatie" value={filters.locationId ?? ""} onChange={(e) => set({ locationId: e.target.value || undefined })} className="w-full sm:w-48">
          <option value="">Alle locaties</option>
          {data.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Functie" value={filters.fn ?? ""} onChange={(e) => set({ fn: e.target.value || undefined })} className="w-full sm:w-40">
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
          <p className="col-span-2 text-sm text-muted-foreground tabular-nums sm:ml-auto">
            Uren: dag <b className="text-foreground">{hoursLabel(empMinutes((s) => s.date === filters.date))}</b> · week{" "}
            <b className="text-foreground">{hoursLabel(empMinutes((s) => mondayOf(s.date) === monday))}</b> · maand{" "}
            <b className="text-foreground">{hoursLabel(empMinutes((s) => s.date.startsWith(filters.date.slice(0, 7))))}</b>
          </p>
        )}
      </div>
    </div>
  );
}
