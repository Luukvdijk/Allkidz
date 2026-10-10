"use client";

import { useMemo, useState, useTransition } from "react";
import { Archive, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Client, Employee, PlanData, Shift } from "@/lib/types";
import { describeRule, expandRule } from "@/lib/recurrence";
import { addDays, addMonths, DAY_SHORT, mondayOf, monthGrid, monthLabel, shortDate, toMin } from "@/lib/time";
import type { ShiftRequest } from "@/lib/data/requests";
import { createRequest } from "@/app/actions/requests";
import { addLocation, archiveLocation } from "@/app/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCard, type Message } from "@/components/berichten/Outbox";
import { LicenceList } from "@/components/profile/LicenceList";
import { RecurrenceInput, initialRecurrence, toRule, type RecurrenceState } from "@/components/shift/RecurrenceInput";
import { defaultFunction } from "@/components/shift/ShiftSheet";

type Tab = "planning" | "aanvragen" | "locaties" | "meldingen";
const FUNCTIONS = ["KidzCoach", "Toezichthouder", "Aqualessen", "Zwemonderwijzer", "Gymdocent"];
const TYPES = ["BSO", "KDV", "TSO", "Zwembad", "School"];

interface Props {
  client: Client;
  data: PlanData;
  today: string;
  requests: ShiftRequest[];
  messages: Message[];
}

export function ClientPortal({ client, data, today, requests, messages }: Props) {
  const [tab, setTab] = useState<Tab>("planning");
  const [profile, setProfile] = useState<Employee | null>(null);
  const myLocations = data.locations.filter((l) => l.clientId === client.id);
  const myIds = new Set(myLocations.map((l) => l.id));
  const myShifts = data.shifts.filter((s) => s.status === "active" && myIds.has(s.locationId));
  const openRequests = requests.filter((r) => r.status === "aangevraagd").length;

  const tabs: { t: Tab; label: string; count?: number }[] = [
    { t: "planning", label: "Planning" },
    { t: "aanvragen", label: "Aanvragen", count: openRequests },
    { t: "locaties", label: "Locaties", count: myLocations.filter((l) => !l.archived).length },
    { t: "meldingen", label: "Meldingen", count: messages.length },
  ];

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-1 overflow-x-auto border-b px-4 sm:mx-0 sm:px-0" role="tablist">
        {tabs.map(({ t, label, count }) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === t ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {count ? <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{count}</span> : null}
          </button>
        ))}
      </div>

      {tab === "planning" && <Planning data={data} shifts={myShifts} locations={myLocations} onCoach={setProfile} />}
      {tab === "aanvragen" && <Requests client={client} data={data} requests={requests} onCoach={setProfile} />}
      {tab === "locaties" && <Locations client={client} data={data} today={today} />}
      {tab === "meldingen" &&
        (messages.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Geen meldingen.</p>
        ) : (
          <ul className="space-y-2">{messages.map((m, i) => <MessageCard key={m.id} m={m} defaultOpen={i === 0} />)}</ul>
        ))}

      <CoachProfile employee={profile} data={data} today={today} onClose={() => setProfile(null)} />
    </div>
  );
}

/** What a client may see of a coach: first name, functions and whether licences are in order. Nothing else. */
function CoachProfile({ employee, data, today, onClose }: { employee: Employee | null; data: PlanData; today: string; onClose: () => void }) {
  const licences = employee ? (data.licences ?? []).filter((l) => l.employeeId === employee.id) : [];
  return (
    <Dialog open={employee !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {employee && (
          <>
            <DialogHeader>
              <DialogTitle>{employee.name}</DialogTitle>
              <DialogDescription>{employee.functions.join(", ")} bij AllKidz</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Licenties en diploma&apos;s</h3>
              <LicenceList licences={licences} today={today} />
            </div>
            <p className="text-xs text-muted-foreground">
              Je ziet alleen wat nodig is voor de inzet. Achternaam, geboortedatum en BSN deelt AllKidz niet.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Planning({ data, shifts, locations, onCoach }: { data: PlanData; shifts: Shift[]; locations: PlanData["locations"]; onCoach: (e: Employee) => void }) {
  const [range, setRange] = useState<"week" | "maand">("week");
  const [date, setDate] = useState("2026-10-19");
  const [locFilter, setLocFilter] = useState("");
  const emp = new Map(data.employees.map((e) => [e.id, e]));
  const locName = new Map(locations.map((l) => [l.id, l.name]));
  const act = new Map((data.activities ?? []).map((a) => [a.id, a.name]));
  const visible = shifts
    .filter((s) => !locFilter || s.locationId === locFilter)
    .sort((a, b) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start));
  const monday = mondayOf(date);
  const week = Array.from({ length: 5 }, (_, i) => addDays(monday, i));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted p-0.5" role="tablist">
          {(["week", "maand"] as const).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => setRange(r)} className={cn("rounded-md px-3 py-1 text-sm capitalize", range === r ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}>
              {r}
            </button>
          ))}
        </div>
        <Button variant="outline" size="icon-sm" aria-label="Vorige" onClick={() => setDate(range === "week" ? addDays(date, -7) : addMonths(date, -1))}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Volgende" onClick={() => setDate(range === "week" ? addDays(date, 7) : addMonths(date, 1))}>
          <ChevronRight />
        </Button>
        <span className="font-semibold first-letter:uppercase">{range === "week" ? `Week van ${shortDate(monday)}` : monthLabel(date)}</span>
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

      {range === "week" ? (
        <div className="space-y-2">
          {week.map((d) => {
            const list = visible.filter((s) => s.date === d);
            return (
              <section key={d} className="rounded-xl border bg-card p-3">
                <h3 className="mb-1.5 text-sm font-semibold first-letter:uppercase">{shortDate(d)}</h3>
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
                          {e ? (
                            <button type="button" onClick={() => onCoach(e)} className="ml-auto rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok hover:underline">
                              1/1 · {e.name}
                            </button>
                          ) : (
                            <span className="ml-auto rounded-full bg-warn/20 px-2 py-0.5 text-xs font-medium text-warn-foreground">0/1 nog niet gevuld</span>
                          )}
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
                onClick={() => { setDate(d); setRange("week"); }}
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

function requestStatus(r: ShiftRequest, data: PlanData): { label: string; tone: "open" | "ok" | "warn" | "bad"; coaches: Employee[] } {
  if (r.status === "aangevraagd") return { label: "Aangevraagd, wacht op AllKidz", tone: "open", coaches: [] };
  if (r.status === "afgewezen") return { label: "Afgewezen", tone: "bad", coaches: [] };
  const shifts = data.shifts.filter((s) => r.shiftIds.includes(s.id) && s.status === "active");
  const ids = [...new Set(shifts.map((s) => s.employeeId).filter(Boolean))] as string[];
  const coaches = ids.map((id) => data.employees.find((e) => e.id === id)!).filter(Boolean);
  const filled = shifts.filter((s) => s.employeeId).length;
  if (shifts.length > 0 && filled === shifts.length) return { label: `Ingepland met ${coaches.map((c) => c.name).join(", ")}`, tone: "ok", coaches };
  if (filled > 0) return { label: `Deels ingepland (${filled}/${shifts.length})`, tone: "warn", coaches };
  return { label: "Goedgekeurd, coach wordt gezocht", tone: "warn", coaches };
}

function Requests({ client, data, requests, onCoach }: { client: Client; data: PlanData; requests: ShiftRequest[]; onCoach: (e: Employee) => void }) {
  const active = data.locations.filter((l) => l.clientId === client.id && !l.archived);
  const [locationId, setLocationId] = useState(active[0]?.id ?? "");
  const [fn, setFn] = useState(() => defaultFunction(active[0]));
  const [start, setStart] = useState("14:45");
  const [end, setEnd] = useState("18:00");
  const [activityId, setActivityId] = useState("");
  const [note, setNote] = useState("");
  const [rec, setRec] = useState<RecurrenceState>(() => initialRecurrence("2026-10-26"));
  const [pending, startT] = useTransition();
  const locName = new Map(data.locations.map((l) => [l.id, l.name]));
  const dates = useMemo(() => expandRule(toRule(rec)), [rec]);

  const submit = () =>
    startT(async () => {
      const r = await createRequest(client.id, { locationId, rule: toRule(rec), start, end, fn, activityId: activityId || null, note });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Aanvraag verstuurd", { description: "AllKidz plant er een coach op en je ziet hier de status." });
      setNote("");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 className="font-semibold">Nieuwe aanvraag</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Voeg eerst een locatie toe.</p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="r-loc">Locatie</Label>
              <NativeSelect id="r-loc" value={locationId} onChange={(e) => { setLocationId(e.target.value); setFn(defaultFunction(active.find((l) => l.id === e.target.value))); }}>
                {active.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 grid gap-1.5 sm:col-span-1">
                <Label htmlFor="r-fn">Functie</Label>
                <NativeSelect id="r-fn" value={fn} onChange={(e) => setFn(e.target.value)}>
                  {FUNCTIONS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="r-start">Begin</Label>
                <Input id="r-start" type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="r-end">Eind</Label>
                <Input id="r-end" type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="r-act">Activiteit (optioneel)</Label>
              <NativeSelect id="r-act" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                <option value="">Geen voorkeur</option>
                {(data.activities ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <RecurrenceInput value={rec} onChange={setRec} />
            <div className="grid gap-1.5">
              <Label htmlFor="r-note">Opmerking (optioneel)</Label>
              <Textarea id="r-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={pending || dates.length === 0}>
              {pending ? "Versturen..." : `Aanvragen (${dates.length} ${dates.length === 1 ? "dienst" : "diensten"})`}
            </Button>
          </>
        )}
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Mijn aanvragen</h2>
        {requests.length === 0 && <p className="text-sm text-muted-foreground">Nog geen aanvragen.</p>}
        <ul className="space-y-2">
          {requests.map((r) => {
            const st = requestStatus(r, data);
            const ds = expandRule(r.rule);
            return (
              <li key={r.id} className="rounded-xl border bg-card p-3 text-sm">
                <p className="font-medium">
                  {locName.get(r.locationId)} · {r.fn} · {r.start}-{r.end}
                </p>
                <p className="text-muted-foreground">
                  {describeRule(r.rule)}: {ds.slice(0, 4).map(shortDate).join(", ")}
                  {ds.length > 4 && ` en nog ${ds.length - 4}`}
                </p>
                <p
                  className={cn(
                    "mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                    st.tone === "open" && "bg-open/15 text-open-foreground",
                    st.tone === "ok" && "bg-ok/15 text-ok",
                    st.tone === "warn" && "bg-warn/20 text-warn-foreground",
                    st.tone === "bad" && "bg-destructive/10 text-destructive",
                  )}
                >
                  {st.label}
                </p>
                {r.status === "afgewezen" && r.reason && <p className="mt-1 text-destructive">Reden: {r.reason}</p>}
                {st.coaches.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {st.coaches.map((c) => (
                      <Button key={c.id} size="xs" variant="outline" onClick={() => onCoach(c)}>
                        Profiel {c.name}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Locations({ client, data, today }: { client: Client; data: PlanData; today: string }) {
  const mine = data.locations.filter((l) => l.clientId === client.id);
  const [name, setName] = useState("");
  const [type, setType] = useState("BSO");
  const [city, setCity] = useState("");
  const [archiving, setArchiving] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const future = (id: string) => data.shifts.filter((s) => s.locationId === id && s.status === "active" && s.date >= today).length;
  const target = mine.find((l) => l.id === archiving);

  const add = () =>
    start(async () => {
      const r = await addLocation(client.id, { name, type, city });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(`${name} toegevoegd`, {
        description: r.travelUnknown
          ? "Nieuwe plaats: reistijden zijn nog onbekend. De planner ziet dat bij het plannen."
          : "Reistijden overgenomen van een locatie in dezelfde plaats.",
      });
      setName("");
      setCity("");
    });

  const archive = () =>
    start(async () => {
      if (!archiving) return;
      const r = await archiveLocation(client.id, archiving);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Gearchiveerd", { description: r.futureShifts ? `${r.futureShifts} geplande diensten blijven staan.` : undefined });
      setArchiving(null);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <ul className="divide-y rounded-xl border bg-card">
        {mine.map((l) => (
          <li key={l.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", l.archived && "text-muted-foreground")}>
            <span className="flex-1">
              <span className="font-medium">{l.name}</span> · {l.type}, {l.city}
              {l.archived && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">gearchiveerd</span>}
            </span>
            <span className="text-xs tabular-nums">{future(l.id)} gepland</span>
            {!l.archived && (
              <Button size="icon-sm" variant="ghost" aria-label={`${l.name} archiveren`} onClick={() => setArchiving(l.id)}>
                <Archive />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <h2 className="font-semibold">Locatie toevoegen</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="l-name">Naam</Label>
          <Input id="l-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. BSO De Vuurtoren" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="l-type">Type</Label>
            <NativeSelect id="l-type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="l-city">Plaats</Label>
            <Input id="l-city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bijv. Katwijk" />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          <Plus /> Toevoegen
        </Button>
      </form>

      <Dialog open={archiving !== null} onOpenChange={(o) => !o && setArchiving(null)}>
        <DialogContent>
          {target && (
            <>
              <DialogHeader>
                <DialogTitle>{target.name} archiveren?</DialogTitle>
                <DialogDescription>
                  Je kunt er daarna geen diensten meer aanvragen.{" "}
                  {future(target.id) > 0
                    ? `Er staan nog ${future(target.id)} diensten gepland; die blijven staan tot AllKidz ze aanpast.`
                    : "Er staan geen diensten meer gepland."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setArchiving(null)}>
                  Terug
                </Button>
                <Button variant="destructive" onClick={archive} disabled={pending}>
                  Archiveren
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
