"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { PlanData, Shift } from "@/lib/types";
import { bagDoubles } from "@/lib/bags";
import { addDays, mondayOf, shortDate } from "@/lib/time";
import type { MaterialReport } from "@/lib/data/requests";
import { resolveReport } from "@/app/actions/materials";
import { Button } from "@/components/ui/button";

const when = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

/** Per bag: who has it on which day. A bag goes home with the coach, so two coaches on one day is a double booking. */
export function BagBoard({ data, reports }: { data: PlanData; reports: MaterialReport[] }) {
  const [monday, setMonday] = useState(mondayOf("2026-10-19"));
  const [pending, start] = useTransition();
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i));
  const emp = new Map(data.employees.map((e) => [e.id, e.name]));
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const bags = data.bags ?? [];
  const bagLabel = new Map(bags.map((b) => [b.id, b.label]));

  const { cells, doubles } = useMemo(() => {
    const cells = new Map<string, Shift[]>();
    for (const s of data.shifts) {
      if (s.status !== "active" || !s.bagId) continue;
      const k = `${s.bagId}|${s.date}`;
      (cells.get(k) ?? cells.set(k, []).get(k)!).push(s);
    }
    const doubles = new Set(bagDoubles(data.shifts).map((d) => `${d.bagId}|${d.date}`));
    return { cells, doubles };
  }, [data.shifts]);

  const open = reports.filter((r) => !r.resolvedAt);
  const resolve = (id: string) =>
    start(async () => {
      const r = await resolveReport(id);
      if ("error" in r) toast.error(r.error);
      else toast.success("Gemarkeerd als opgelost");
    });

  return (
    <div className="space-y-6">
      <section aria-labelledby="missing">
        <h2 id="missing" className="mb-2 text-sm font-semibold">
          Missende materialen ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Niets gemeld. Coaches melden ontbrekende spullen vanuit hun app.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {open.map((r) => {
              const shift = data.shifts.find((s) => s.id === r.shiftId);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  <AlertTriangle className="size-4 text-warn-foreground" aria-hidden />
                  <span className="font-medium">{bagLabel.get(r.bagId)}</span>
                  <span>&ldquo;{r.text}&rdquo;</span>
                  <span className="text-xs text-muted-foreground">
                    {r.employeeId && emp.get(r.employeeId)}
                    {shift && `, ${shift.code}`} · {when(r.createdAt)}
                  </span>
                  <Button size="sm" variant="outline" className="ml-auto" disabled={pending} onClick={() => resolve(r.id)}>
                    <Check /> Opgelost
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="week">
        <div className="mb-2 flex items-center gap-2">
          <h2 id="week" className="text-sm font-semibold">
            Tassen per dag
          </h2>
          <Button variant="outline" size="icon-sm" aria-label="Vorige week" onClick={() => setMonday(addDays(monday, -7))}>
            <ChevronLeft />
          </Button>
          <Button variant="outline" size="icon-sm" aria-label="Volgende week" onClick={() => setMonday(addDays(monday, 7))}>
            <ChevronRight />
          </Button>
          <span className="text-sm text-muted-foreground">Week van {shortDate(monday)}</span>
        </div>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Tas</th>
                {days.map((d) => (
                  <th key={d} className="border-l px-3 py-2 text-left font-medium first-letter:uppercase">
                    {shortDate(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bags.map((b) => (
                <tr key={b.id} className="border-t align-top">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {b.label}
                  </th>
                  {days.map((d) => {
                    const list = cells.get(`${b.id}|${d}`) ?? [];
                    const dbl = doubles.has(`${b.id}|${d}`);
                    return (
                      <td key={d} className={cn("border-l px-3 py-2", dbl && "bg-destructive/[0.06]")}>
                        {list.length === 0 ? (
                          <span className="text-xs text-muted-foreground">vrij</span>
                        ) : (
                          <ul className="space-y-0.5 text-xs">
                            {list.map((s) => (
                              <li key={s.id} className={cn(dbl && "font-medium text-destructive")}>
                                {s.employeeId ? emp.get(s.employeeId) : "open"} · {s.code}
                                <span className="block text-muted-foreground">{loc.get(s.locationId)}</span>
                              </li>
                            ))}
                            {dbl && <li className="font-medium text-destructive">Dubbel: twee coaches</li>}
                          </ul>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
