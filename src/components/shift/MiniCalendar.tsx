"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";
import { addMonths, DAY_SHORT, monthGrid, monthLabel } from "@/lib/time";

interface Props {
  selected: string[];
  onToggle: (date: string) => void;
  initialMonth: string;
  /** dates that already have data, shown with a dot */
  marked?: Set<string>;
}

/** Click dates to select loose dates for a recurring shift. */
export function MiniCalendar({ selected, onToggle, initialMonth, marked }: Props) {
  const [month, setMonth] = useState(initialMonth.slice(0, 8) + "01");
  const set = new Set(selected);
  const grid = monthGrid(month);
  return (
    <div className="rounded-lg border p-2">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" aria-label="Vorige maand" onClick={() => setMonth(addMonths(month, -1))} className="rounded p-1 hover:bg-muted">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium first-letter:uppercase">{monthLabel(month)}</span>
        <button type="button" aria-label="Volgende maand" onClick={() => setMonth(addMonths(month, 1))} className="rounded p-1 hover:bg-muted">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {DAY_SHORT.map((d) => (
          <span key={d} className="py-1 text-muted-foreground">
            {d}
          </span>
        ))}
        {grid.map((d) => {
          const inMonth = d.slice(0, 7) === month.slice(0, 7);
          const on = set.has(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              aria-label={d}
              onClick={() => onToggle(d)}
              className={cn(
                "relative rounded-md py-1.5 tabular-nums transition-colors",
                !inMonth && "text-muted-foreground/50",
                on ? "bg-primary font-semibold text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {Number(d.slice(8))}
              {marked?.has(d) && !on && <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary/60" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
