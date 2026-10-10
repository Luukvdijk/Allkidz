"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import type { Location, PlanData } from "@/lib/types";
import { addDays, addMonths, DAY_SHORT, mondayOf, monthGrid, monthLabel, shortDate, toMin } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { MessageCard, type Message } from "@/components/berichten/Outbox";

/** What a client (opdrachtgever) sees: their location's shifts, who is coming, and the automatic notifications. Read-only. */
export function ClientView({ data, location, messages }: { data: PlanData; location: Location; messages: Message[] }) {
  const [range, setRange] = useState<"week" | "maand">("week");
  const [date, setDate] = useState("2026-10-19");
  const emp = new Map(data.employees.map((e) => [e.id, e.name]));
  const shifts = data.shifts
    .filter((s) => s.locationId === location.id && s.status === "active")
    .sort((a, b) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start));
  const monday = mondayOf(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="space-y-3">
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
          <h2 className="font-semibold first-letter:uppercase">{range === "week" ? `Week van ${shortDate(monday)}` : monthLabel(date)}</h2>
        </div>

        {range === "week" ? (
          <div className="space-y-2">
            {week.map((d) => {
              const list = shifts.filter((s) => s.date === d);
              if (list.length === 0 && (d > addDays(monday, 4))) return null;
              return (
                <div key={d} className="rounded-xl border bg-card p-3">
                  <h3 className="mb-1.5 text-sm font-semibold first-letter:uppercase">{shortDate(d)}</h3>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Geen diensten.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {list.map((s) => (
                        <li key={s.id} className="flex flex-wrap items-center gap-x-3 text-sm">
                          <span className="font-medium tabular-nums">{s.start}-{s.end}</span>
                          <span className="text-muted-foreground">{s.fn}</span>
                          {s.employeeId ? (
                            <span className="ml-auto rounded-full bg-ok/15 px-2 py-0.5 text-xs font-medium text-ok">1/1 gevuld · {emp.get(s.employeeId)}</span>
                          ) : (
                            <span className="ml-auto rounded-full bg-warn/20 px-2 py-0.5 text-xs font-medium text-warn-foreground">0/1 nog niet gevuld</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
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
              const list = shifts.filter((s) => s.date === d);
              const open = list.filter((s) => !s.employeeId).length;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setDate(d); setRange("week"); }}
                  className={cn("min-h-16 border-b border-l p-1.5 text-left hover:bg-muted/50", !d.startsWith(date.slice(0, 7)) && "bg-muted/30 text-muted-foreground")}
                >
                  <span className="tabular-nums">{Number(d.slice(8))}</span>
                  {list.length > 0 && <p className="mt-1">{list.length - open}/{list.length} gevuld</p>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <aside className="space-y-2">
        <h2 className="font-semibold">Meldingen ({messages.length})</h2>
        <p className="text-sm text-muted-foreground">Bericht over wijzigingen op korte termijn, automatisch verstuurd door AllKidz.</p>
        {messages.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Geen meldingen.</p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m, i) => (
              <MessageCard key={m.id} m={m} defaultOpen={i === 0} />
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
