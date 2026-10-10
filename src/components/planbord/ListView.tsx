"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import { shortDate, toMin } from "@/lib/time";
import { ConflictPill } from "./ConflictBadge";
import { ShiftActions } from "./ShiftChip";
import { usePlan } from "./PlanContext";

type SortKey = "date" | "employee" | "location" | "fn" | "status";

export function ListView({ visible, from, to }: { visible: Shift[]; from: string; to: string }) {
  const { employees, locations, byShift, edit } = usePlan();
  const [sort, setSort] = useState<SortKey>("date");

  const rows = useMemo(() => {
    const name = (s: Shift) => (s.employeeId ? employees.get(s.employeeId)!.name : "~open");
    const byDate = (a: Shift, b: Shift) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start);
    const status = (s: Shift) => (byShift.has(s.id) ? 0 : !s.employeeId ? 1 : 2);
    const cmp: Record<SortKey, (a: Shift, b: Shift) => number> = {
      date: (a, b) => byDate(a, b) || name(a).localeCompare(name(b)),
      employee: (a, b) => name(a).localeCompare(name(b)) || byDate(a, b),
      location: (a, b) => locations.get(a.locationId)!.name.localeCompare(locations.get(b.locationId)!.name) || byDate(a, b),
      fn: (a, b) => a.fn.localeCompare(b.fn) || byDate(a, b),
      status: (a, b) => status(a) - status(b) || byDate(a, b),
    };
    return visible.filter((s) => s.date >= from && s.date <= to).sort(cmp[sort]);
  }, [visible, from, to, sort, employees, locations, byShift]);

  const Th = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th scope="col" className="px-3 py-2 text-left font-medium" aria-sort={sort === k ? "ascending" : undefined}>
      <button type="button" onClick={() => setSort(k)} className="inline-flex items-center gap-1 hover:text-foreground">
        {children}
        <ArrowUpDown className={cn("size-3", sort === k ? "opacity-100" : "opacity-30")} aria-hidden />
      </button>
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="sticky top-0 border-b bg-muted/60 text-xs text-muted-foreground">
          <tr>
            <Th k="date">Datum en tijd</Th>
            <Th k="employee">Medewerker</Th>
            <Th k="location">Locatie</Th>
            <Th k="fn">Functie</Th>
            <Th k="status">Status</Th>
            <th className="px-3 py-2 text-left font-medium">Code</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const c = byShift.get(s.id) ?? [];
            return (
              <tr key={s.id} className={cn("border-b last:border-0 hover:bg-muted/40", c.length > 0 && "bg-destructive/[0.03]")}>
                <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">
                  <button type="button" onClick={() => edit(s)} className="hover:underline">
                    {shortDate(s.date)} · {s.start}-{s.end}
                  </button>
                </td>
                <td className={cn("px-3 py-1.5", !s.employeeId && "font-medium text-open-foreground")}>
                  {s.employeeId ? employees.get(s.employeeId)!.name : "Open"}
                </td>
                <td className="px-3 py-1.5">{locations.get(s.locationId)!.name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{s.fn}</td>
                <td className="px-3 py-1.5">
                  <div className="flex flex-wrap gap-1" title={c.map((x) => x.message).join("\n")}>
                    {c.length > 0 ? c.map((x, i) => <ConflictPill key={i} type={x.type} />) : !s.employeeId ? null : <span className="text-xs text-ok">OK</span>}
                  </div>
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground tabular-nums">{s.code}</td>
                <td className="px-1">
                  <ShiftActions shift={s} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="p-8 text-center text-muted-foreground">Geen diensten met deze filters.</p>}
    </div>
  );
}
