import { addDays, mondayOf, weekday, daysBetween, DAY_LONG } from "@/lib/time";

/** weekdays use 1 = Monday ... 7 = Sunday; nth is 1..4, or -1 for the last one in the month */
export type RecurrenceRule =
  | { kind: "once"; date: string }
  | { kind: "dates"; dates: string[] }
  | { kind: "weekly"; weekdays: number[]; interval: number; from: string; to: string }
  | { kind: "monthly"; weekday: number; nth: number; from: string; to: string };

const MAX = 366;

export function expandRule(rule: RecurrenceRule): string[] {
  switch (rule.kind) {
    case "once":
      return [rule.date];
    case "dates":
      return [...new Set(rule.dates)].sort();
    case "weekly": {
      const out: string[] = [];
      const anchor = mondayOf(rule.from);
      const every = Math.max(1, Math.floor(rule.interval));
      for (let d = rule.from; d <= rule.to && out.length < MAX; d = addDays(d, 1)) {
        const week = Math.floor(daysBetween(anchor, mondayOf(d)) / 7);
        if (week % every === 0 && rule.weekdays.includes(weekday(d))) out.push(d);
      }
      return out;
    }
    case "monthly": {
      const out: string[] = [];
      for (let d = rule.from; d <= rule.to && out.length < MAX; d = addDays(d, 1)) {
        if (weekday(d) !== rule.weekday) continue;
        const ok = rule.nth === -1
          ? addDays(d, 7).slice(0, 7) !== d.slice(0, 7)
          : Math.ceil(Number(d.slice(8)) / 7) === rule.nth;
        if (ok) out.push(d);
      }
      return out;
    }
  }
}

const NTH: Record<number, string> = { 1: "eerste", 2: "tweede", 3: "derde", 4: "vierde", [-1]: "laatste" };

export function describeRule(rule: RecurrenceRule): string {
  switch (rule.kind) {
    case "once":
      return "Eenmalig";
    case "dates":
      return `${rule.dates.length} losse datum${rule.dates.length === 1 ? "" : "s"}`;
    case "weekly": {
      const sorted = [...rule.weekdays].sort((a, b) => a - b);
      const names = sorted.map((d) => DAY_LONG[d - 1]);
      const days = sorted.join() === "1,2,3,4,5"
        ? "dag van maandag t/m vrijdag"
        : names.length > 1 ? `${names.slice(0, -1).join(", ")} en ${names.at(-1)}` : names[0];
      const freq = rule.interval === 2 ? ", om de week" : rule.interval > 2 ? `, elke ${rule.interval} weken` : "";
      return `Elke ${days}${freq}`;
    }
    case "monthly":
      return `Elke ${NTH[rule.nth]} ${DAY_LONG[rule.weekday - 1]} van de maand`;
  }
}
