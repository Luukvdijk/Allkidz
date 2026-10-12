import Link from "next/link";
import type { ReactNode } from "react";
import { AlertTriangle, Backpack, BadgeCheck, CalendarDays, CircleDashed, Clock, History, Inbox, LayoutGrid } from "lucide-react";
import { cn } from "cn";
import type { PlanData } from "@/lib/types";
import type { DashboardStats } from "@/lib/dashboard";
import type { LogEntry } from "@/components/log/LogTimeline";
import { ACTIONS } from "@/lib/logActions";
import { hoursLabel } from "@/lib/hours";
import { dayMonth, shortDate } from "@/lib/time";
import { buttonVariants } from "@/components/ui/button";
import { ConflictLine } from "@/components/planbord/ConflictBadge";

interface Props {
  data: PlanData;
  stats: DashboardStats;
  today: string;
  pendingRequests: number;
  missingReports: number;
  log: LogEntry[];
}

/** The planner's overview at a glance. Every number links to the screen where it can be acted on. */
export function Dashboard({ data, stats, today, pendingRequests, missingReports, log }: Props) {
  const emp = new Map(data.employees.map((e) => [e.id, e]));
  const loc = new Map(data.locations.map((l) => [l.id, l]));
  const client = new Map((data.clients ?? []).map((c) => [c.id, c.name]));
  const fill = stats.shifts ? Math.round((stats.filled / stats.shifts) * 100) : 100;
  // The chart starts today: days already past have nothing left to plan.
  const days = stats.days.filter((d) => d.date >= today);
  const maxDay = Math.max(...days.map((d) => d.total), 1);
  const active = stats.workload.filter((w) => w.shifts > 0);
  const maxWork = active[0]?.minutes ?? 1;
  const quiet = [...stats.workload].sort((a, b) => a.minutes - b.minutes || emp.get(a.employeeId)!.name.localeCompare(emp.get(b.employeeId)!.name)).slice(0, 5);
  const expired = stats.licences.filter((l) => l.expired).length;
  // Links open the week of the first thing that needs attention, not today's week (which may be empty).
  const weekOf = (date: string | undefined) => `/planbord?view=week&d=${date ?? today}`;
  const shiftsLink = weekOf(days.find((d) => d.total > 0)?.date);
  const openLink = `${weekOf(stats.openSoon[0]?.date)}&open=1`;
  const conflictsLink = `${weekOf(stats.conflicts[0]?.date)}&conflicts=1`;
  const bagsLink = stats.firstBagDouble ? `/tassen?d=${stats.firstBagDouble}` : "/tassen";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Deze en volgende week · {dayMonth(stats.from)} t/m {dayMonth(stats.to)}
          </p>
        </div>
        <Link href="/planbord" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <LayoutGrid /> Naar het planbord
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border md:grid-cols-3 xl:grid-cols-6">
        <Kpi href={shiftsLink} icon={CalendarDays} label="Diensten" value={String(stats.shifts)} sub={`${fill}% ingevuld · ${hoursLabel(stats.minutes)}`} />
        <Kpi href={openLink} icon={CircleDashed} label="Open diensten" value={String(stats.open)} sub={`${stats.openSoon.length} vanaf vandaag`} tone={stats.open ? "open" : undefined} />
        <Kpi href={conflictsLink} icon={AlertTriangle} label="Conflicten" value={String(stats.conflicted)} sub={stats.conflicted === 1 ? "dienst met een conflict" : "diensten met een conflict"} tone={stats.conflicted ? "bad" : undefined} />
        <Kpi href="/aanvragen" icon={Inbox} label="Aanvragen" value={String(pendingRequests)} sub="te beoordelen" tone={pendingRequests ? "warn" : undefined} />
        <Kpi href="/medewerkers" icon={BadgeCheck} label="Licenties" value={String(stats.licences.length)} sub={`${expired} verlopen, ${stats.licences.length - expired} bijna`} tone={expired ? "bad" : stats.licences.length ? "warn" : undefined} />
        <Kpi href={bagsLink} icon={Backpack} label="Tassen" value={String(stats.bagDoubles + missingReports)} sub={`${stats.bagDoubles} dubbel, ${missingReports} mist iets`} tone={stats.bagDoubles ? "bad" : missingReports ? "warn" : undefined} />
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card title="Diensten per dag" action={<Legend />}>
          <ol className="grid auto-cols-fr grid-flow-col items-end gap-1.5 sm:gap-2" aria-label="Diensten per dag">
            {days.map((d) => {
              const filled = d.total - d.open;
              return (
                <li key={d.date}>
                  <Link
                    href={`/planbord?d=${d.date}`}
                    className="press group flex flex-col items-center gap-1"
                    aria-label={`${shortDate(d.date)}: ${d.total} diensten, ${d.open} open, ${d.conflicted} met conflict`}
                  >
                    <span className="text-[11px] font-medium tabular-nums">{d.total || ""}</span>
                    <div className="flex h-36 w-full flex-col justify-end overflow-hidden rounded-md bg-muted/60 group-hover:bg-muted">
                      {d.open > 0 && <div className="w-full bg-open/70" style={{ height: `${(d.open / maxDay) * 100}%` }} />}
                      {filled > 0 && <div className="w-full bg-primary/70" style={{ height: `${(filled / maxDay) * 100}%` }} />}
                    </div>
                    <span className={cn("size-1.5 rounded-full", d.conflicted ? "bg-destructive" : "bg-transparent")} aria-hidden />
                    <span className={cn("text-[10px] whitespace-nowrap text-muted-foreground tabular-nums sm:text-[11px]", d.date === today && "font-semibold text-foreground")}>
                      {shortDate(d.date).split(" ").slice(0, 2).join(" ")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </Card>

        <Card title={`Eerstvolgende open diensten (${stats.openSoon.length})`} action={<More href={openLink} />}>
          {stats.openSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">Alles is ingevuld.</p>
          ) : (
            <ul className="divide-y">
              {stats.openSoon.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href={`/planbord?d=${s.date}&q=${s.code}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 py-2 text-sm hover:bg-muted/40">
                    <span className="font-medium first-letter:uppercase">{shortDate(s.date)}</span>
                    <span className="min-w-0 truncate">
                      <span className="tabular-nums">{s.start}-{s.end}</span> {loc.get(s.locationId)?.name}
                      <span className="block text-xs text-muted-foreground">{s.fn}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card title="Conflicten vanaf vandaag" action={<More href={conflictsLink} />}>
          {stats.conflicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Geen conflicten.</p>
          ) : (
            <ul className="space-y-2">
              {stats.conflicts.slice(0, 6).map((c, i) => (
                <li key={i}>
                  <Link href={`/planbord?d=${c.date}&emp=${c.employeeId}`} className="block rounded-md p-1.5 hover:bg-destructive/5">
                    <span className="text-xs font-medium text-muted-foreground first-letter:uppercase">
                      {shortDate(c.date)} · {emp.get(c.employeeId)?.name}
                    </span>
                    <ConflictLine conflict={c} compact />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Werkverdeling">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Meeste uren</h3>
              <ul className="space-y-2">
                {active.slice(0, 5).map((w) => (
                  <BarRow key={w.employeeId} href={`/medewerkers/${w.employeeId}`} label={emp.get(w.employeeId)!.name} value={hoursLabel(w.minutes)} pct={(w.minutes / maxWork) * 100} />
                ))}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-medium text-muted-foreground">Nog ruimte</h3>
              <ul className="space-y-2">
                {quiet.map((w) => (
                  <BarRow
                    key={w.employeeId}
                    href={`/medewerkers/${w.employeeId}`}
                    label={emp.get(w.employeeId)!.name}
                    value={hoursLabel(w.minutes)}
                    pct={(w.minutes / maxWork) * 100}
                    sub={emp.get(w.employeeId)!.functions.join(", ")}
                    tone="ok"
                  />
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Opdrachtgevers">
          <ul className="space-y-2.5">
            {stats.clients.map((c) => {
              const pct = c.shifts ? ((c.shifts - c.open) / c.shifts) * 100 : 100;
              return (
                <li key={c.clientId}>
                  <Link href={`/opdrachtgever/${c.clientId}`} className="block text-sm hover:underline">
                    <span className="flex justify-between gap-2">
                      <span className="truncate">{client.get(c.clientId)}</span>
                      <span className={cn("tabular-nums", c.open ? "text-open-foreground" : "text-muted-foreground")}>
                        {c.open ? `${c.open} open` : "vol"} · {c.shifts}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-open/25">
                      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="Licenties" action={<More href="/medewerkers" />}>
          {stats.licences.length === 0 ? (
            <p className="text-sm text-muted-foreground">Alles geldig.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {stats.licences.slice(0, 7).map((l) => (
                <li key={`${l.employeeId}-${l.type}`} className="flex items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", l.expired ? "bg-destructive" : "bg-warn")} aria-hidden />
                  <Link href={`/medewerkers/${l.employeeId}`} className="min-w-0 flex-1 truncate hover:underline">
                    {emp.get(l.employeeId)?.name} <span className="text-muted-foreground">· {l.type}</span>
                  </Link>
                  <span className={cn("shrink-0 text-xs tabular-nums", l.expired ? "font-medium text-destructive" : "text-warn-foreground")}>
                    {l.expired ? "verlopen" : "t/m"} {dayMonth(l.expiresOn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Laatste wijzigingen" action={<More href="/log" />}>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nog niets veranderd.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {log.map((e) => (
                <li key={e.id} className="flex gap-2">
                  <History className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{ACTIONS[e.action] ?? e.action}</span>
                      {e.shift_code && <span className="text-muted-foreground"> · {e.shift_code}</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Clock className="mr-1 inline size-3 align-[-2px]" aria-hidden />
                      {dayMonth(e.at.slice(0, 10))} · {e.actor_name}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Kpi({ href, icon: Icon, label, value, sub, tone }: { href: string; icon: typeof Clock; label: string; value: string; sub: string; tone?: "open" | "warn" | "bad" }) {
  return (
    <Link href={href} className="press group block bg-card px-4 py-3 hover:bg-muted/40">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" aria-hidden /> {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "open" && "text-open-foreground",
          tone === "warn" && "text-warn-foreground",
          tone === "bad" && "text-destructive",
        )}
      >
        {value}
      </dd>
      <dd className="truncate text-xs text-muted-foreground">{sub}</dd>
    </Link>
  );
}

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function More({ href }: { href: string }) {
  return (
    <Link href={href} className="shrink-0 text-xs font-medium text-primary hover:underline">
      Alles bekijken
    </Link>
  );
}

function Legend() {
  return (
    <span className="flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-sm bg-primary/70" aria-hidden /> ingevuld
      </span>
      <span className="flex items-center gap-1">
        <span className="size-2 rounded-sm bg-open/70" aria-hidden /> open
      </span>
      <span className="flex items-center gap-1">
        <span className="size-1.5 rounded-full bg-destructive" aria-hidden /> conflict
      </span>
    </span>
  );
}

function BarRow({ href, label, value, pct, sub, tone }: { href: string; label: string; value: string; pct: number; sub?: string; tone?: "ok" }) {
  return (
    <li>
      <Link href={href} className="block text-sm hover:underline">
        <span className="flex justify-between gap-2">
          <span className="truncate">{label}</span>
          <span className="text-muted-foreground tabular-nums">{value}</span>
        </span>
        {sub && <span className="block truncate text-[11px] text-muted-foreground">{sub}</span>}
        <span className="mt-1 block h-1.5 rounded-full bg-muted">
          <span className={cn("block h-full rounded-full", tone === "ok" ? "bg-ok/60" : "bg-primary/60")} style={{ width: `${Math.max(pct, 0)}%` }} />
        </span>
      </Link>
    </li>
  );
}
