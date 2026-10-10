"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { longDate, shortDate } from "@/lib/time";

type Row = Record<string, unknown> | null;

export interface LogEntry {
  id: string;
  at: string;
  actor_role: "planner" | "medewerker" | "systeem";
  actor_name: string;
  acting_as: string | null;
  action: string;
  shift_code: string | null;
  before: Row;
  after: Row;
  reason: string | null;
}

export interface CancelledShift {
  id: string;
  code: string;
  date: string;
  start: string;
  end: string;
  location: string;
  fn: string;
}

interface Props {
  entries: LogEntry[];
  cancelled: CancelledShift[];
  employeeNames: Record<string, string>;
  locationNames: Record<string, string>;
}

const ACTIONS: Record<string, string> = {
  shift_created: "Dienst aangemaakt",
  shift_updated: "Dienst gewijzigd",
  shift_cancelled: "Dienst geannuleerd",
  employee_removed: "Medewerker eraf gehaald",
  employee_assigned: "Medewerker ingepland",
  employee_cancelled_self: "Afgemeld door medewerker",
  open_shift_accepted: "Open dienst aangenomen",
  availability_changed: "Beschikbaarheid",
};

const FIELDS: [string, string][] = [
  ["employee_id", "Medewerker"],
  ["location_id", "Locatie"],
  ["date", "Datum"],
  ["start_time", "Begin"],
  ["end_time", "Eind"],
  ["function", "Functie"],
  ["status", "Status"],
  ["note", "Opmerking"],
];

const time = (iso: string) => new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
const day = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });

export function LogTimeline({ entries, cancelled, employeeNames, locationNames }: Props) {
  const [tab, setTab] = useState<"log" | "cancelled">("log");
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [role, setRole] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const emp = (id: unknown) => (typeof id === "string" ? employeeNames[id] ?? "?" : "niemand (open)");
  const fmt = (field: string, v: unknown): string => {
    if (v === null || v === undefined || v === "") return "leeg";
    if (field === "employee_id") return emp(v);
    if (field === "location_id") return locationNames[v as string] ?? "?";
    if (field === "start_time" || field === "end_time") return String(v).slice(0, 5);
    if (field === "date") return shortDate(String(v));
    if (field === "status") return v === "cancelled" ? "geannuleerd" : "actief";
    return String(v);
  };

  const sentence = (e: LogEntry): string => {
    const code = e.shift_code ?? "";
    switch (e.action) {
      case "shift_created": return `maakte ${code} aan`;
      case "shift_updated": return `wijzigde ${code}`;
      case "shift_cancelled": return `annuleerde ${code}`;
      case "employee_removed": return `haalde ${emp(e.before?.employee_id)} van ${code}`;
      case "employee_assigned": return `plande ${emp(e.after?.employee_id)} in op ${code}`;
      case "employee_cancelled_self": return `meldde zich af voor ${code}`;
      case "open_shift_accepted": return `nam open dienst ${code} aan`;
      case "availability_changed": {
        const r = e.after ?? e.before;
        const when = r ? `${shortDate(String(r.date))} ${String(r.start_time).slice(0, 5)}-${String(r.end_time).slice(0, 5)}` : "";
        return e.after ? `gaf door: ${emp(r?.employee_id)} niet beschikbaar ${when}` : `haalde niet-beschikbaar weg voor ${emp(r?.employee_id)} (${when})`;
      }
      default: return e.action;
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (action && e.action !== action) return false;
      if (role && e.actor_role !== role) return false;
      if (needle) {
        const hay = `${e.shift_code ?? ""} ${e.actor_name} ${sentence(e)} ${e.reason ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, q, action, role]);

  const groups = useMemo(() => {
    const m = new Map<string, LogEntry[]>();
    for (const e of filtered) (m.get(day(e.at)) ?? m.set(day(e.at), []).get(day(e.at))!).push(e);
    return [...m.entries()];
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border bg-muted p-0.5" role="tablist">
        {(["log", "cancelled"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn("rounded-md px-3 py-1 text-sm", tab === t ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}
          >
            {t === "log" ? `Alle wijzigingen (${entries.length})` : `Geannuleerde diensten (${cancelled.length})`}
          </button>
        ))}
      </div>

      {tab === "cancelled" ? (
        cancelled.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">Nog geen geannuleerde diensten.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {cancelled.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="font-medium tabular-nums">{c.code}</span>
                <span className="first-letter:uppercase">{shortDate(c.date)} {c.start}-{c.end}</span>
                <span>{c.location}</span>
                <span className="text-muted-foreground">{c.fn}</span>
                <button type="button" className="ml-auto text-primary hover:underline" onClick={() => { setTab("log"); setQ(c.code); }}>
                  Waarom en door wie?
                </button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op code, naam of reden" aria-label="Zoeken in log" className="pl-8" />
            </div>
            <NativeSelect aria-label="Actie" value={action} onChange={(e) => setAction(e.target.value)} className="w-56">
              <option value="">Alle acties</option>
              {Object.entries(ACTIONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect aria-label="Door" value={role} onChange={(e) => setRole(e.target.value)} className="w-44">
              <option value="">Iedereen</option>
              <option value="planner">Planner</option>
              <option value="medewerker">Medewerker</option>
            </NativeSelect>
          </div>

          {groups.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {entries.length === 0 ? "Nog geen wijzigingen. Alles wat je op het planbord of in de medewerker-app doet, komt hier te staan." : "Geen wijzigingen met deze filters."}
            </p>
          )}

          {groups.map(([d, list]) => (
            <section key={d}>
              <h2 className="mb-2 text-sm font-semibold first-letter:uppercase">{longDate(d)}</h2>
              <ol className="divide-y rounded-xl border bg-card">
                {list.map((e) => {
                  const changed = FIELDS.filter(([f]) => e.before && e.after && JSON.stringify(e.before[f]) !== JSON.stringify(e.after[f]));
                  const open = openId === e.id;
                  const date = (e.after?.date ?? e.before?.date) as string | undefined;
                  return (
                    <li key={e.id} className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-xs text-muted-foreground tabular-nums">{time(e.at)}</span>
                        <span className="font-medium">
                          {e.actor_name}
                          <span className="font-normal text-muted-foreground">
                            {e.actor_role === "planner" ? " (planner)" : `, ${e.acting_as ?? "medewerker"}`}
                          </span>
                        </span>
                        <span>
                          {sentence(e).split(e.shift_code ?? "\u0000").map((part, i, arr) => (
                            <span key={i}>
                              {part}
                              {i < arr.length - 1 && e.shift_code && (
                                <Link className="font-medium text-primary hover:underline" href={`/planbord?${new URLSearchParams({ ...(date ? { d: date } : {}), q: e.shift_code })}`}>
                                  {e.shift_code}
                                </Link>
                              )}
                            </span>
                          ))}
                        </span>
                        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{ACTIONS[e.action]}</span>
                      </div>
                      {e.reason && (
                        <p className={cn("mt-1.5 border-l-2 pl-2", e.action === "shift_created" ? "border-border text-muted-foreground" : "border-primary")}>
                          {e.action === "shift_created" ? `Herhaling: ${e.reason}` : <>Reden: <span className="font-medium">{e.reason}</span></>}
                        </p>
                      )}
                      {changed.length > 0 && (
                        <div className="mt-1.5">
                          <button type="button" onClick={() => setOpenId(open ? null : e.id)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-expanded={open}>
                            <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
                            {changed.length} {changed.length === 1 ? "veld" : "velden"} gewijzigd
                          </button>
                          {open && (
                            <table className="mt-1 text-xs">
                              <tbody>
                                {changed.map(([f, label]) => (
                                  <tr key={f}>
                                    <td className="pr-3 text-muted-foreground">{label}</td>
                                    <td className="pr-2 line-through decoration-destructive/60">{fmt(f, e.before?.[f])}</td>
                                    <td className="font-medium">{fmt(f, e.after?.[f])}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
