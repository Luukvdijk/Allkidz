"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { Employee, Shift } from "@/lib/types";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { shortDate } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import type { Actor } from "@/lib/data/actor";
import { assignEmployee } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import { ConflictLine } from "@/components/planbord/ConflictBadge";
import { usePlan } from "@/components/planbord/PlanContext";
import { byStart } from "./shared";

export function OpenShifts({ employee, actor }: { employee: Employee; actor: Actor }) {
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
