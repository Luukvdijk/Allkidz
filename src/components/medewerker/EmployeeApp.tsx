"use client";

import { useMemo, useState, useTransition } from "react";
import { Backpack, CalendarDays, CalendarOff, ChevronDown, ChevronLeft, ChevronRight, Inbox, MapPin, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Employee, PlanData, Shift } from "@/lib/types";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { addDays, addMonths, DAY_SHORT, longDate, mondayOf, monthGrid, monthLabel, shortDate, toMin } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import type { Actor } from "@/lib/data/actor";
import { assignEmployee } from "@/app/actions/shifts";
import { addUnavailability, removeUnavailability } from "@/app/actions/availability";
import { reportMissing } from "@/app/actions/materials";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { LicenceList } from "@/components/profile/LicenceList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ConflictLine } from "@/components/planbord/ConflictBadge";
import { PlanProvider, usePlan, type Workspace } from "@/components/planbord/PlanContext";
import { RemoveDialog, type RemoveState } from "@/components/shift/RemoveDialog";

type Tab = "diensten" | "beschikbaar" | "open" | "profiel";
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

  // Below md this is the phone app (full screen, tab bar at the bottom); from md up it is a normal web page with tabs on top.
  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-background md:mx-auto md:h-auto md:max-w-5xl md:overflow-visible md:px-4 md:py-6">
      <header className="bg-primary px-4 pt-4 pb-3 text-primary-foreground md:rounded-xl md:px-6 md:py-5">
        <p className="text-xs opacity-80">AllKidz voor medewerkers</p>
        <h1 className="text-lg font-semibold md:text-2xl">Hoi {employee.name}</h1>
        <p className="text-xs opacity-80 md:text-sm">{employee.functions.join(", ")}</p>
        {conflicts > 0 && <p className="mt-2 rounded-md bg-white/15 px-2 py-1 text-xs md:inline-block md:text-sm">Let op: {conflicts} van je diensten {conflicts === 1 ? "heeft" : "hebben"} een probleem. De planner kijkt ernaar.</p>}
      </header>
      <nav className="order-last grid grid-cols-4 border-t bg-card md:order-none md:my-4 md:flex md:gap-1 md:border-t-0 md:border-b md:bg-transparent" aria-label="Medewerker">
        {([
          ["diensten", "Diensten", "Diensten", CalendarDays],
          ["beschikbaar", "Beschikbaar", "Beschikbaarheid", CalendarOff],
          ["open", "Open", "Open diensten", Inbox],
          ["profiel", "Profiel", "Profiel", UserRound],
        ] as const).map(([t, short, long, Icon]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 text-xs md:-mb-px md:flex-row md:gap-2 md:border-b-2 md:px-3 md:text-sm",
              tab === t ? "font-medium text-primary md:border-primary" : "text-muted-foreground md:border-transparent md:hover:text-foreground",
            )}
          >
            <Icon className="size-5 md:size-4" aria-hidden />
            <span className="md:hidden">{short}</span>
            <span className="max-md:hidden">{long}</span>
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3 md:overflow-visible md:p-0">
        {tab === "diensten" && <MyShifts mine={mine} actor={actor} />}
        {tab === "beschikbaar" && <Availability employee={employee} actor={actor} />}
        {tab === "open" && <OpenShifts employee={employee} actor={actor} />}
        {tab === "profiel" && <Profile employee={employee} />}
      </div>
    </div>
  );
}

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

function MyShifts({ mine, actor }: { mine: Shift[]; actor: Actor }) {
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
          <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("rounded-md py-1 capitalize", range === r ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}>
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
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Geen diensten in deze periode.</p>
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
    <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
      <form
        className="space-y-3 rounded-xl border bg-card p-3 md:p-4"
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
      else toast.success(`Je staat op ${s.code}`, { description: r.notified ? "De planner ziet het direct en de opdrachtgever krijgt bericht." : "De planner ziet het direct." });
    });

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground md:text-sm">
        Alleen open diensten voor jouw functie ({employee.functions.join(", ")}) die passen in je rooster: geen overlap, genoeg reistijd en je bent beschikbaar.
      </p>
      {fit.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Er zijn nu geen open diensten die bij je passen.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
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
            <ul className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
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

const storageKey = (shiftId: string) => `paklijst:${shiftId}`;

/** "Neem mee": the bag for this shift, its packing list as a checklist (ticks only on this device) and a missing-items report. */
function BagPanel({ s, actor }: { s: Shift; actor: Actor }) {
  const { data } = usePlan();
  const bag = data.bags?.find((b) => b.id === s.bagId);
  const activity = data.activities?.find((a) => a.id === bag?.activityId);
  const [open, setOpen] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  if (!bag || !activity) return null;

  const toggleOpen = () => {
    if (!open) {
      try {
        setTicked(JSON.parse(localStorage.getItem(storageKey(s.id)) ?? "[]"));
      } catch {
        setTicked([]);
      }
    }
    setOpen(!open);
  };
  const tick = (item: string, on: boolean) => {
    const next = on ? [...ticked, item] : ticked.filter((x) => x !== item);
    setTicked(next);
    try {
      localStorage.setItem(storageKey(s.id), JSON.stringify(next));
    } catch {
      // storage unavailable (private mode): the checklist still works for this visit
    }
  };
  const send = () =>
    start(async () => {
      const r = await reportMissing(s.id, actor, text);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Gemeld", { description: "De planner ziet het op het tassenoverzicht." });
      setText("");
      setReporting(false);
    });

  return (
    <div className="mt-2 rounded-lg bg-accent/60 p-2 text-sm">
      <button type="button" onClick={toggleOpen} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <Backpack className="size-4 text-accent-foreground" aria-hidden />
        <span className="flex-1">
          Neem mee: <span className="font-medium">{bag.label}</span>
        </span>
        {open && <span className="text-xs text-muted-foreground tabular-nums">{ticked.length}/{activity.packingList.length}</span>}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          <ul className="space-y-1">
            {activity.packingList.map((p) => (
              <li key={p.item}>
                <label className="flex items-center gap-2">
                  <Checkbox checked={ticked.includes(p.item)} onCheckedChange={(on) => tick(p.item, Boolean(on))} />
                  <span className={cn(ticked.includes(p.item) && "text-muted-foreground line-through")}>
                    {p.qty}x {p.item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {reporting ? (
            <div className="space-y-1.5">
              <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Bijv. 2 walkietalkies missen" aria-label="Wat mist er?" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setReporting(false)}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={send} disabled={pending || !text.trim()}>
                  Meld aan planner
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="w-full" onClick={() => setReporting(true)}>
              Er mist iets
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Profile({ employee }: { employee: Employee }) {
  const { data, ws } = usePlan();
  const licences = (data.licences ?? []).filter((l) => l.employeeId === employee.id);
  return (
    <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
      <section className="rounded-xl border bg-card p-3 md:p-4">
        <h2 className="text-sm font-semibold">{employee.name}</h2>
        <p className="text-sm text-muted-foreground">{employee.functions.join(", ")}</p>
      </section>
      <section className="rounded-xl border bg-card p-3 md:p-4">
        <h2 className="mb-2 text-sm font-semibold">Mijn licenties</h2>
        <LicenceList licences={licences} today={ws.today} />
        <p className="mt-3 text-xs text-muted-foreground">
          Opdrachtgevers zien alleen je voornaam, functies en of je licenties in orde zijn. Nooit je achternaam, geboortedatum of BSN.
        </p>
      </section>
    </div>
  );
}
