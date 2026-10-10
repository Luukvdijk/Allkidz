"use client";

import { useMemo, useState, useTransition } from "react";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Inbox, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Employee, PlanData, Shift } from "@/lib/types";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { addDays, addMonths, DAY_SHORT, longDate, mondayOf, monthGrid, monthLabel, shortDate, toMin } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import type { Actor } from "@/lib/data/actor";
import { assignEmployee } from "@/app/actions/shifts";
import { addUnavailability, removeUnavailability } from "@/app/actions/availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConflictLine } from "@/components/planbord/ConflictBadge";
import { PlanProvider, usePlan, type Workspace } from "@/components/planbord/PlanContext";
import { RemoveDialog, type RemoveState } from "@/components/shift/RemoveDialog";

type Tab = "diensten" | "beschikbaar" | "open";
type Range = "dag" | "week" | "maand";
const byStart = (a: Shift, b: Shift) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start);

export function EmployeeApp({ data, ws, employee }: { data: PlanData; ws: Workspace; employee: Employee }) {
  const [removing, setRemoving] = useState<RemoveState>(null);
  const actions = useMemo(() => ({ edit: () => {}, create: () => {}, remove: (shift: Shift) => setRemoving({ shift, mode: "employee" as const }) }), []);
  const actor: Actor = { role: "medewerker", name: employee.name, employeeId: employee.id };
  return (
    <PlanProvider data={data} ws={ws} actions={actions}>
      <Phone employee={employee} actor={actor} />
      <RemoveDialog state={removing} onClose={() => setRemoving(null)} actor={actor} />
    </PlanProvider>
  );
}

function Phone({ employee, actor }: { employee: Employee; actor: Actor }) {
  const [tab, setTab] = useState<Tab>("diensten");
  const { data, byShift } = usePlan();
  const mine = useMemo(() => data.shifts.filter((s) => s.employeeId === employee.id && s.status === "active").sort(byStart), [data.shifts, employee.id]);
  const conflicts = mine.filter((s) => byShift.has(s.id)).length;

  return (
    <div className="mx-auto flex h-[min(820px,calc(100dvh-96px))] w-full max-w-[420px] flex-col overflow-hidden rounded-[2rem] border-[6px] border-foreground/85 bg-background shadow-xl max-sm:h-[calc(100dvh-64px)] max-sm:rounded-none max-sm:border-0">
      <header className="bg-primary px-4 pt-4 pb-3 text-primary-foreground">
        <p className="text-xs opacity-80">AllKidz medewerker-app</p>
        <h1 className="text-lg font-semibold">Hoi {employee.name}</h1>
        <p className="text-xs opacity-80">{employee.functions.join(", ")}</p>
        {conflicts > 0 && <p className="mt-2 rounded-md bg-white/15 px-2 py-1 text-xs">Let op: {conflicts} van je diensten {conflicts === 1 ? "heeft" : "hebben"} een probleem. De planner kijkt ernaar.</p>}
      </header>
      <div className="flex-1 overflow-y-auto p-3">
        {tab === "diensten" && <MyShifts mine={mine} />}
        {tab === "beschikbaar" && <Availability employee={employee} actor={actor} />}
        {tab === "open" && <OpenShifts employee={employee} actor={actor} />}
      </div>
      <nav className="grid grid-cols-3 border-t bg-card" aria-label="Medewerker-app">
        {([
          ["diensten", "Diensten", CalendarDays],
          ["beschikbaar", "Beschikbaar", CalendarOff],
          ["open", "Open diensten", Inbox],
        ] as const).map(([t, label, Icon]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-xs", tab === t ? "font-medium text-primary" : "text-muted-foreground")}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

function ShiftCard({ s }: { s: Shift }) {
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
      {!past && (
        <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => remove(s, "employee")}>
          Afmelden
        </Button>
      )}
    </li>
  );
}

function MyShifts({ mine }: { mine: Shift[] }) {
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
      <div className="grid grid-cols-3 rounded-lg border bg-muted p-0.5 text-sm" role="tablist">
        {(["dag", "week", "maand"] as const).map((r) => (
          <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("rounded-md py-1 capitalize", range === r ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}>
            {r}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon-sm" aria-label="Vorige" onClick={() => step(-1)}>
          <ChevronLeft />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold first-letter:uppercase">{title}</p>
          <p className="text-xs text-muted-foreground">
            {inRange.length} {inRange.length === 1 ? "dienst" : "diensten"} · {hoursLabel(minutes)}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Volgende" onClick={() => step(1)}>
          <ChevronRight />
        </Button>
      </div>

      {range === "maand" ? (
        <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
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
                className={cn("relative rounded-md py-2 tabular-nums hover:bg-muted", !d.startsWith(date.slice(0, 7)) && "text-muted-foreground/50", has && "font-semibold")}
              >
                {Number(d.slice(8))}
                {has && <span className="absolute bottom-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      ) : inRange.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Geen diensten in deze periode.</p>
      ) : range === "dag" ? (
        <ul className="space-y-2">
          {inRange.map((s) => <ShiftCard key={s.id} s={s} />)}
        </ul>
      ) : (
        <div className="space-y-3">
          {[...new Set(inRange.map((s) => s.date))].map((d) => (
            <section key={d}>
              <h3 className="mb-1 text-xs font-semibold text-muted-foreground uppercase">{shortDate(d)}</h3>
              <ul className="space-y-2">
                {inRange.filter((s) => s.date === d).map((s) => <ShiftCard key={s.id} s={s} />)}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Availability({ employee, actor }: { employee: Employee; actor: Actor }) {
  const { data, ws } = usePlan();
  const [date, setDate] = useState("2026-10-21");
  const [wholeDay, setWholeDay] = useState(true);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("17:00");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const mine = data.unavailability.filter((u) => u.employeeId === employee.id).sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
  const f = wholeDay ? "00:00" : from;
  const t = wholeDay ? "23:59" : to;
  const clashes = data.shifts.filter(
    (s) => s.employeeId === employee.id && s.status === "active" && s.date === date && toMin(s.start) < toMin(t) && toMin(f) < toMin(s.end),
  );

  const save = () =>
    start(async () => {
      const r = await addUnavailability({ employeeId: employee.id, date, from: f, to: t, reason }, actor);
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Doorgegeven", { description: "De planner ziet dit direct." });
        setReason("");
      }
    });

  return (
    <div className="space-y-4">
      <form
        className="space-y-3 rounded-xl border bg-card p-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h2 className="text-sm font-semibold">Ik kan niet op</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="u-date">Datum</Label>
          <Input id="u-date" type="date" min={ws.today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <label className="flex items-center justify-between text-sm">
          Hele dag
          <Switch checked={wholeDay} onCheckedChange={setWholeDay} />
        </label>
        {!wholeDay && (
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="u-from">Van</Label>
              <Input id="u-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-to">Tot</Label>
              <Input id="u-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="u-reason">Reden</Label>
          <Input id="u-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bijv. tentamen, tandarts" />
        </div>
        {clashes.length > 0 && (
          <p className="rounded-md bg-warn/15 p-2 text-xs text-warn-foreground">
            Let op: je staat dan ingepland op {clashes.map((s) => `${s.code} (${s.start}-${s.end})`).join(", ")}. Meld je bij Diensten ook af als je niet kunt.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Bezig..." : "Doorgeven"}
        </Button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Al doorgegeven</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog niets doorgegeven.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {mine.map((u) => (
              <li key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium first-letter:uppercase">{shortDate(u.date)}</span>{" "}
                  {u.from === "00:00" && u.to === "23:59" ? "hele dag" : `${u.from}-${u.to}`}
                  <span className="block text-xs text-muted-foreground">{u.reason}</span>
                </span>
                <RemoveUnavailability id={u.id} actor={actor} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RemoveUnavailability({ id, actor }: { id: string; actor: Actor }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Verwijderen"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await removeUnavailability(id, actor);
          if ("error" in r) toast.error(r.error);
        })
      }
    >
      <Trash2 />
    </Button>
  );
}

function OpenShifts({ employee, actor }: { employee: Employee; actor: Actor }) {
  const { data, ws, locations } = usePlan();
  const [pending, start] = useTransition();
  const [showHidden, setShowHidden] = useState(false);

  const { fit, blocked } = useMemo(() => {
    const open = data.shifts
      .filter((s) => !s.employeeId && s.status === "active" && s.date >= ws.today && employee.functions.includes(s.fn))
      .sort(byStart);
    const withConflicts = open.map((s) => ({ s, c: conflictsIfAssigned(data, s, employee.id) }));
    return { fit: withConflicts.filter((x) => x.c.length === 0).map((x) => x.s), blocked: withConflicts.filter((x) => x.c.length > 0) };
  }, [data, ws.today, employee]);

  const accept = (s: Shift) =>
    start(async () => {
      const r = await assignEmployee(s.id, employee.id, actor);
      if ("error" in r) toast.error(r.error);
      else toast.success(`Je staat op ${s.code}`, { description: "De planner en de opdrachtgever zien het direct." });
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Alleen open diensten voor jouw functie ({employee.functions.join(", ")}) die passen in je rooster: geen overlap, genoeg reistijd en je bent beschikbaar.
      </p>
      {fit.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Er zijn nu geen open diensten die bij je passen.</p>
      ) : (
        <ul className="space-y-2">
          {fit.map((s) => {
            const loc = locations.get(s.locationId)!;
            return (
              <li key={s.id} className="rounded-xl border border-dashed border-open/60 bg-card p-3">
                <p className="text-xs font-medium text-open-foreground uppercase first-letter:uppercase">{shortDate(s.date)}</p>
                <p className="font-semibold tabular-nums">{s.start}-{s.end}</p>
                <p className="text-sm">{loc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {loc.city} · {s.fn} · {hoursLabel(durationMin(s))}
                  {s.note && ` · "${s.note}"`}
                </p>
                <Button size="sm" className="mt-2 w-full" disabled={pending} onClick={() => accept(s)}>
                  Aannemen
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {blocked.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowHidden(!showHidden)} className="text-xs text-muted-foreground underline" aria-expanded={showHidden}>
            {showHidden ? "Verberg" : "Toon"} {blocked.length} open {blocked.length === 1 ? "dienst" : "diensten"} die niet passen
          </button>
          {showHidden && (
            <ul className="mt-2 space-y-2">
              {blocked.map(({ s, c }) => (
                <li key={s.id} className="rounded-xl border bg-muted/40 p-3 text-sm opacity-80">
                  <p className="font-medium first-letter:uppercase">
                    {shortDate(s.date)} {s.start}-{s.end}, {locations.get(s.locationId)!.name}
                  </p>
                  {c.map((x, i) => (
                    <ConflictLine key={i} conflict={x} compact />
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
