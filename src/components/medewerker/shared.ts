import type { Shift } from "@/lib/types";
import { toMin } from "@/lib/time";

export type Range = "dag" | "week" | "maand";
export const byStart = (a: Shift, b: Shift) => a.date.localeCompare(b.date) || toMin(a.start) - toMin(b.start);
