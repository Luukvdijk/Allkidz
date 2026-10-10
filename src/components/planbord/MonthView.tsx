"use client";

import { useMemo } from "react";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import { DAY_SHORT, monthGrid, monthLabel, toMin } from "@/lib/time";
import { durationMin, hoursLabel } from "@/lib/hours";
import { usePlan } from "./PlanContext";

interface Props {
  visible: Shift[];
  date: string;
  employeeId?: string;
  onOpenDay: (date: string) => void;
}

export function MonthView({ visible, date, employeeId, onOpenDay }: Props) {
  const { byShift, employees } = usePlan();
  const month = date.slice(0, 7);

  const { grid, perDay, monthMinutes } = useMemo(() => {
    const grid = monthGrid(date);
    const perDay = new Map<string, Shift[]>();
    for (const s of visible) {
      if (s.date < grid[0] || s.date > grid.at(-1)!) continue;
      (perDay.get(s.date) ?? perDay.set(s.date, []).get(s.date)!).push(s);
    }
    for (const l of perDay.values()) l.sort((a, b) => toMin(a.start) - toMin(b.start));
    const monthMinutes = visible.filter((s) => s.date.startsWith(month)).reduce((t, s) => t + durationMin(s), 0);
    return { grid, perDay, monthMinutes };
  }, [visible, date, month]);

  return (
    <div>
      {employeeId && (
        <p className="mb-3 text-sm">
          <span className="font-semibold">{employees.get(employeeId)?.name}</span>: {hoursLabel(monthMinutes)} ingepland in {monthLabel(date)}
        </p>
      )}
      <div className="grid grid-cols-7 overflow-hidden rounded-xl border bg-card text-sm">
        {DAY_SHORT.map((d) => (
          <div key={d} className="border-b bg-muted/60 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase">
            {d}
          </div>
        ))}
        {grid.map((d) => {
          const list = perDay.get(d) ?? [];
          const open = list.filter((s) => !s.employeeId).length;
          const conflicts = list.filter((s) => byShift.has(s.id)).length;
          const inMonth = d.startsWith(month);
          return (
            <button
              key={d}
              type="button"
              onClick={() => onOpenDay(d)}
              className={cn(
                "min-h-24 border-b border-l p-1.5 text-left align-top transition-colors hover:bg-muted/50 [&:nth-child(7n+8)]:border-l-0",
                !inMonth && "bg-muted/30 text-muted-foreground",
              )}
              aria-label={`${d}: ${list.length} diensten, ${open} open, ${conflicts} conflicten`}
            >
              <span className={cn("text-xs tabular-nums", d === date && "rounded-full bg-primary px-1.5 py-0.5 text-primary-foreground")}>
                {Number(d.slice(8))}
              </span>
              {list.length > 0 && !employeeId && (
                <div className="mt-1 space-y-0.5 text-xs">
                  <p className="tabular-nums">{list.length} diensten</p>
                  {open > 0 && <p className="font-medium text-open-foreground tabular-nums">{open} open</p>}
                  {conflicts > 0 && <p className="font-medium text-destructive tabular-nums">{conflicts} conflict{conflicts === 1 ? "" : "en"}</p>}
                </div>
              )}
              {list.length > 0 && employeeId && (
                <div className="mt-1 space-y-0.5 text-xs">
                  {list.map((s) => (
                    <p key={s.id} className={cn("tabular-nums", byShift.has(s.id) && "font-medium text-destructive")}>
                      {s.start}-{s.end}
                    </p>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
