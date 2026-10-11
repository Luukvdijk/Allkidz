import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarOff, ExternalLink, History, LayoutGrid } from "lucide-react";
import { cn } from "cn";
import type { ConflictType, Employee, PlanData } from "@/lib/types";
import type { EmployeeStats } from "@/lib/employeeStats";
import type { LogEntry } from "@/components/log/LogTimeline";
import { ACTIONS } from "@/lib/logActions";
import { hoursLabel } from "@/lib/hours";
import { dayMonth, shortDate } from "@/lib/time";
import { buttonVariants } from "@/components/ui/button";
import { LicenceList, licenceStatus } from "@/components/profile/LicenceList";
import { ConflictLine, ConflictPill } from "@/components/planbord/ConflictBadge";
import { EmptyState } from "@/components/EmptyState";

interface Props {
  employee: Employee;
  data: PlanData;
  stats: EmployeeStats;
  today: string;
  log: LogEntry[];
}

const SHOWN = 12;

/** The planner's view of one employee: workload, what is coming, and what needs attention. */
export function EmployeeOverview({ employee, data, stats, today, log }: Props) {
  const loc = new Map(data.locations.map((l) => [l.id, l]));
  const licences = (data.licences ?? []).filter((l) => l.employeeId === employee.id);
  const badLicences = licences.filter((l) => licenceStatus(l, today) !== "ok").length;
  const unavailable = data.unavailability
    .filter((u) => u.employeeId === employee.id && u.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
  const typesByShift = new Map<string, Set<ConflictType>>();
  for (const c of stats.conflicts) for (const id of c.shiftIds) typesByShift.set(id, (typesByShift.get(id) ?? new Set()).add(c.type));
  const maxWeek = Math.max(...stats.weeks.map((w) => w.minutes), 60);
  const maxLoc = stats.locations[0]?.shifts ?? 1;
  const sixWeeks = stats.weeks.reduce((t, w) => t + w.minutes, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link href="/medewerkers" className="press inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> Alle medewerkers
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-accent text-lg font-semibold text-accent-foreground" aria-hidden>
            {employee.name.slice(0, 1)}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight">{employee.name}</h1>
            <p className="text-sm text-muted-foreground">{employee.functions.join(", ")}</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link href={`/planbord?view=week&d=${today}&emp=${employee.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <LayoutGrid /> Op het planbord
            </Link>
            <Link href={`/medewerker/${employee.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <ExternalLink /> Bekijk als {employee.name}
            </Link>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 divide-border overflow-hidden rounded-xl border bg-card md:grid-cols-4">
        <Stat label="Deze week" value={hoursLabel(stats.thisWeek.minutes)} sub={`${stats.thisWeek.shifts} ${stats.thisWeek.shifts === 1 ? "dienst" : "diensten"}`} />
        <Stat label="Komende 6 weken" value={hoursLabel(sixWeeks)} sub={`${stats.upcoming.length} diensten vanaf vandaag`} className="border-l" />
        <Stat
          label="Conflicten"
          value={String(stats.conflictedUpcoming)}
          sub={stats.conflictedUpcoming === 0 ? "Alles klopt" : stats.conflictedUpcoming === 1 ? "dienst met een probleem" : "diensten met een probleem"}
          tone={stats.conflictedUpcoming > 0 ? "bad" : undefined}
          className="border-t md:border-t-0 md:border-l"
        />
        <Stat
          label="Licenties"
          value={badLicences === 0 ? "In orde" : String(badLicences)}
          sub={badLicences === 0 ? `${licences.length} bekend` : "verlopen of bijna verlopen"}
          tone={badLicences > 0 ? "warn" : undefined}
          className="border-t border-l md:border-t-0"
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          <Section title="Uren per week">
            <ol className="grid grid-cols-6 items-end gap-2 rounded-xl border bg-card p-4" aria-label="Uren per week">
              {stats.weeks.map((w, i) => (
                <li key={w.monday} className="flex flex-col items-center gap-1.5" aria-label={`Week van ${dayMonth(w.monday)}: ${hoursLabel(w.minutes)}`}>
                  <span className="text-xs font-medium tabular-nums">{hoursLabel(w.minutes)}</span>
                  <div className="flex h-28 w-full items-end overflow-hidden rounded-md bg-muted/60">
                    <div
                      className={cn("w-full rounded-md", i === 0 ? "bg-primary" : "bg-primary/45")}
                      style={{ height: `${w.minutes ? Math.max((w.minutes / maxWeek) * 100, 4) : 0}%` }}
                    />
                  </div>
                  <span className="text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">{i === 0 ? "Deze wk" : dayMonth(w.monday)}</span>
                </li>
              ))}
            </ol>
          </Section>

          {stats.conflicts.length > 0 && (
            <Section title={`Wat aandacht nodig heeft (${stats.conflicts.length})`}>
              <ul className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 p-2">
                {stats.conflicts.map((c, i) => (
                  <li key={i}>
                    <Link href={`/planbord?d=${c.date}&emp=${employee.id}`} className="block rounded-md px-2 py-1 hover:bg-destructive/10">
                      <span className="mb-0.5 block text-xs font-medium text-muted-foreground first-letter:uppercase">{shortDate(c.date)}</span>
                      <ConflictLine conflict={c} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title={`Komende diensten (${stats.upcoming.length})`}>
            {stats.upcoming.length === 0 ? (
              <EmptyState icon={CalendarOff} title="Geen diensten gepland">
                {stats.matchingOpen > 0
                  ? `Er ${stats.matchingOpen === 1 ? "staat 1 open dienst" : `staan ${stats.matchingOpen} open diensten`} die bij ${employee.name} past. Plan die in vanaf het planbord.`
                  : `Plan ${employee.name} in vanaf het planbord.`}
              </EmptyState>
            ) : (
              <ul className="divide-y rounded-xl border bg-card">
                {stats.upcoming.slice(0, SHOWN).map((s) => {
                  const types = [...(typesByShift.get(s.id) ?? [])];
                  return (
                    <li key={s.id}>
                      <Link
                        href={`/planbord?d=${s.date}&q=${s.code}`}
                        className="grid grid-cols-[6.5rem_1fr] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm hover:bg-muted/50 sm:grid-cols-[6.5rem_6.5rem_minmax(0,1fr)_auto]"
                      >
                        <span className="font-medium first-letter:uppercase">{shortDate(s.date)}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {s.start}-{s.end}
                        </span>
                        <span className="col-span-2 min-w-0 truncate sm:col-span-1">
                          {loc.get(s.locationId)?.name} <span className="text-muted-foreground">· {s.fn}</span>
                        </span>
                        {types.length > 0 && (
                          <span className="col-span-2 flex flex-wrap gap-1 sm:col-span-1 sm:justify-end">
                            {types.map((t) => (
                              <ConflictPill key={t} type={t} />
                            ))}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {stats.upcoming.length > SHOWN && (
              <p className="mt-2 text-sm text-muted-foreground">
                En nog {stats.upcoming.length - SHOWN} later.{" "}
                <Link href={`/planbord?view=maand&d=${today}&emp=${employee.id}`} className="text-primary hover:underline">
                  Bekijk de maand
                </Link>
              </p>
            )}
          </Section>
        </div>

        <aside className="space-y-6">
          <Section title="Licenties">
            <LicenceList licences={licences} today={today} />
          </Section>

          <Section title="Werkt vaak op">
            {stats.locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog nergens ingepland.</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.locations.slice(0, 5).map((l) => (
                  <li key={l.locationId} className="text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="truncate">{loc.get(l.locationId)?.name ?? "Onbekende locatie"}</span>
                      <span className="text-muted-foreground tabular-nums">{l.shifts}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-brand-blue" style={{ width: `${(l.shifts / maxLoc) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Niet beschikbaar">
            {unavailable.length === 0 ? (
              <p className="text-sm text-muted-foreground">Niets doorgegeven.</p>
            ) : (
              <ul className="space-y-1.5 text-sm">
                {unavailable.map((u) => (
                  <li key={u.id} className="flex gap-2">
                    <span className="w-24 shrink-0 font-medium first-letter:uppercase">{shortDate(u.date)}</span>
                    <span className="text-muted-foreground">
                      {u.from === "00:00" && u.to === "23:59" ? "Hele dag" : `${u.from}-${u.to}`}, {u.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Laatste wijzigingen">
            {log.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog niets veranderd.</p>
            ) : (
              <ul className="space-y-2.5 text-sm">
                {log.map((e) => (
                  <li key={e.id} className="flex gap-2">
                    <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0">
                      <p>
                        <span className="font-medium">{ACTIONS[e.action] ?? e.action}</span>
                        {e.shift_code && <span className="text-muted-foreground"> · {e.shift_code}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dayMonth(e.at.slice(0, 10))} door {e.actor_name}
                        {e.reason ? `: ${e.reason}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/log" className="mt-3 inline-block text-sm text-primary hover:underline">
              Naar het wijzigingslog
            </Link>
          </Section>
        </aside>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Stat({ label, value, sub, tone, className }: { label: string; value: string; sub: string; tone?: "warn" | "bad"; className?: string }) {
  return (
    <div className={cn("px-4 py-3", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 text-2xl font-semibold tracking-tight tabular-nums", tone === "bad" && "text-destructive", tone === "warn" && "text-warn-foreground")}>
        {value}
      </dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  );
}
