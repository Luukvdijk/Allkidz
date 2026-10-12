"use client";

import { useMemo } from "react";
import Link from "next/link";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import { addDays, shortDate, toMin } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import { usePlan } from "./PlanContext";
import { EmptyState } from "@/components/EmptyState";
import { SearchX } from "lucide-react";

interface Props {
  visible: Shift[];
  monday: string;
  onOpenDay: (date: string, employeeId?: string) => void;
}

const OPEN = "__open__";
const HEAVY_WEEK = 32 * 60;

export function WeekView({ visible, monday, onOpenDay }: Props) {
  const { employees, locations, byShift, edit } = usePlan();

  const { days, rows } = useMemo(() => {
    const all = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    const inWeek = visible.filter((s) => s.date >= all[0] && s.date <= all[6]);
    const days = all.filter((d, i) => i < 5 || inWeek.some((s) => s.date === d));
    const cells = new Map<string, Shift[]>();
    for (const s of inWeek) {
      const k = `${s.employeeId ?? OPEN}|${s.date}`;
      (cells.get(k) ?? cells.set(k, []).get(k)!).push(s);
    }
    for (const list of cells.values()) list.sort((a, b) => toMin(a.start) - toMin(b.start));
    const ids = [...new Set(inWeek.map((s) => s.employeeId ?? OPEN))].sort((a, b) =>
      a === OPEN ? -1 : b === OPEN ? 1 : employees.get(a)!.name.localeCompare(employees.get(b)!.name),
    );
    const rows = ids.map((id) => ({
      id,
      cells,
      minutes: inWeek.filter((s) => (s.employeeId ?? OPEN) === id).reduce((t, s) => t + durationMin(s), 0),
      conflicted: inWeek.some((s) => (s.employeeId ?? OPEN) === id && byShift.has(s.id)),
    }));
    return { days, rows };
  }, [visible, monday, employees, byShift]);

  if (rows.length === 0)
    return (
      <EmptyState icon={SearchX} title="Geen diensten in deze week" />
    );

  return (
    <div className="max-h-[calc(100dvh-230px)] overflow-auto rounded-xl border bg-card">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="sticky top-0 left-0 z-20 w-36 border-b bg-muted px-3 py-2 text-left font-medium">Medewerker</th>
            {days.map((d) => (
              <th key={d} className="sticky top-0 z-10 border-b border-l bg-muted px-2 py-2 text-left font-medium">
                <button type="button" onClick={() => onOpenDay(d)} className="hover:text-foreground hover:underline">
                  {shortDate(d)}
                </button>
              </th>
            ))}
            <th className="sticky top-0 z-10 w-20 border-b border-l bg-muted px-2 py-2 text-right font-medium">Uren</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, cells, minutes, conflicted }) => (
            <tr key={id} className="align-top">
              <th
                scope="row"
                className={cn(
                  "sticky left-0 z-10 border-b bg-card px-3 py-2 text-left font-medium",
                  id === OPEN && "text-open-foreground",
                  conflicted && "text-destructive",
                )}
              >
                {id === OPEN ? (
                  "Open diensten"
                ) : (
                  <Link href={`/medewerkers/${id}`} className="underline-offset-2 hover:underline">
                    {employees.get(id)!.name}
                  </Link>
                )}
                {conflicted && <span className="ml-1.5 inline-block size-2 rounded-full bg-destructive align-middle" aria-label="heeft conflicten" />}
              </th>
              {days.map((d) => {
                const list = cells.get(`${id}|${d}`) ?? [];
                return (
                  <td key={d} className="border-b border-l p-1">
                    <div className="space-y-1">
                      {list.map((s) => {
                        const bad = byShift.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => edit(s)}
                            title={(byShift.get(s.id) ?? []).map((c) => c.message).join("\n") || undefined}
                            className={cn(
                              "flex w-full items-center gap-1.5 rounded-md border px-1.5 py-1 text-left text-xs hover:bg-muted",
                              id === OPEN && "border-dashed border-open/60",
                              bad && "border-destructive/50 bg-destructive/[0.05]",
                            )}
                          >
                            {bad && <span className="size-1.5 shrink-0 rounded-full bg-destructive" aria-label="conflict" />}
                            <span className="font-medium tabular-nums">{s.start}-{s.end}</span>
                            <span className="truncate text-muted-foreground">{locations.get(s.locationId)!.name.replace(/^(BSO|KDV|TSO|Zwembad|School) /, "")}</span>
                          </button>
                        );
                      })}
                      {list.length === 0 && id !== OPEN && (
                        <button
                          type="button"
                          onClick={() => onOpenDay(d, id)}
                          aria-label={`${employees.get(id)!.name} op ${shortDate(d)} bekijken`}
                          className="block h-6 w-full rounded-md hover:bg-muted/60"
                        />
                      )}
                    </div>
                  </td>
                );
              })}
              <td className={cn("border-b border-l px-2 py-2 text-right tabular-nums", minutes > HEAVY_WEEK && id !== OPEN && "font-semibold text-warn-foreground")}>
                {hoursLabel(minutes)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
