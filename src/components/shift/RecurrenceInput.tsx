"use client";

import { cn } from "cn";
import { describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { addDays, DAY_LONG, DAY_SHORT, weekday } from "@/lib/time";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { MiniCalendar } from "./MiniCalendar";

type Mode = "once" | "dates" | "pattern";
export type Frequency = "1" | "2" | "3" | "monthly";

export interface RecurrenceState {
  mode: Mode;
  date: string;
  dates: string[];
  weekdays: number[];
  frequency: Frequency;
  nth: number;
  from: string;
  to: string;
}

export function initialRecurrence(date: string): RecurrenceState {
  return { mode: "once", date, dates: [date], weekdays: [weekday(date)], frequency: "1", nth: 1, from: date, to: addDays(date, 27) };
}

export function toRule(s: RecurrenceState): RecurrenceRule {
  if (s.mode === "once") return { kind: "once", date: s.date };
  if (s.mode === "dates") return { kind: "dates", dates: s.dates };
  if (s.frequency === "monthly") return { kind: "monthly", weekday: s.weekdays[0] ?? 1, nth: s.nth, from: s.from, to: s.to };
  return { kind: "weekly", weekdays: s.weekdays, interval: Number(s.frequency), from: s.from, to: s.to };
}

const MODES: { m: Mode; label: string }[] = [
  { m: "once", label: "Eenmalig" },
  { m: "dates", label: "Losse datums" },
  { m: "pattern", label: "Patroon" },
];

export function RecurrenceInput({ value, onChange, marked }: { value: RecurrenceState; onChange: (v: RecurrenceState) => void; marked?: Set<string> }) {
  const set = (patch: Partial<RecurrenceState>) => onChange({ ...value, ...patch });
  const monthly = value.frequency === "monthly";

  return (
    <fieldset className="space-y-3">
      <legend className="mb-1.5 text-sm font-medium">Herhaling</legend>
      <div className="inline-flex rounded-lg border bg-muted p-0.5" role="radiogroup" aria-label="Herhaling">
        {MODES.map(({ m, label }) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={value.mode === m}
            onClick={() => set({ mode: m })}
            className={cn("rounded-md px-3 py-1 text-sm", value.mode === m ? "bg-background font-medium shadow-xs" : "text-muted-foreground")}
          >
            {label}
          </button>
        ))}
      </div>

      {value.mode === "once" && (
        <div className="grid gap-1.5">
          <Label htmlFor="rec-date">Datum</Label>
          <Input id="rec-date" type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
        </div>
      )}

      {value.mode === "dates" && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Klik de dagen aan waarop de dienst terugkomt.</p>
          <MiniCalendar
            selected={value.dates}
            initialMonth={value.date}
            marked={marked}
            onToggle={(d) => set({ dates: value.dates.includes(d) ? value.dates.filter((x) => x !== d) : [...value.dates, d] })}
          />
        </div>
      )}

      {value.mode === "pattern" && (
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rec-freq">Hoe vaak</Label>
            <NativeSelect id="rec-freq" value={value.frequency} onChange={(e) => set({ frequency: e.target.value as Frequency })}>
              <option value="1">Elke week</option>
              <option value="2">Om de week</option>
              <option value="3">Elke 3 weken</option>
              <option value="monthly">Een vaste weekdag per maand (bijv. elke derde vrijdag)</option>
            </NativeSelect>
          </div>
          {monthly ? (
            <div className="flex gap-2">
              <NativeSelect aria-label="Welke" value={String(value.nth)} onChange={(e) => set({ nth: Number(e.target.value) })} className="flex-1">
                <option value="1">Eerste</option>
                <option value="2">Tweede</option>
                <option value="3">Derde</option>
                <option value="4">Vierde</option>
                <option value="-1">Laatste</option>
              </NativeSelect>
              <NativeSelect aria-label="Weekdag" value={String(value.weekdays[0] ?? 1)} onChange={(e) => set({ weekdays: [Number(e.target.value)] })} className="flex-1">
                {DAY_LONG.map((d, i) => (
                  <option key={d} value={i + 1}>
                    {d}
                  </option>
                ))}
              </NativeSelect>
            </div>
          ) : (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Weekdagen">
              {DAY_SHORT.map((d, i) => {
                const on = value.weekdays.includes(i + 1);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set({ weekdays: on ? value.weekdays.filter((x) => x !== i + 1) : [...value.weekdays, i + 1] })}
                    className={cn("w-10 rounded-md border py-1 text-sm", on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="rec-from">Vanaf</Label>
              <Input id="rec-from" type="date" value={value.from} onChange={(e) => set({ from: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rec-to">Tot en met</Label>
              <Input id="rec-to" type="date" value={value.to} onChange={(e) => set({ to: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {value.mode !== "once" && <p className="text-sm font-medium text-accent-foreground">{describeRule(toRule(value))}</p>}
    </fieldset>
  );
}
