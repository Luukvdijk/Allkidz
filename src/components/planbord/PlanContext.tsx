"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Conflict, Employee, Location, PlanData, Shift } from "@/lib/types";
import { conflictsByShift, detectConflicts } from "@/lib/conflicts";

export interface Workspace {
  id: string;
  noticeDays: number;
  today: string;
}

export type RemoveMode = "employee" | "shift";

export interface PlanActions {
  edit: (shift: Shift) => void;
  create: (defaults?: Partial<Pick<Shift, "date" | "employeeId" | "locationId" | "start" | "end" | "fn">>) => void;
  remove: (shift: Shift, mode: RemoveMode) => void;
}

interface PlanCtx extends PlanActions {
  data: PlanData;
  ws: Workspace;
  employees: Map<string, Employee>;
  locations: Map<string, Location>;
  conflicts: Conflict[];
  byShift: Map<string, Conflict[]>;
}

const Ctx = createContext<PlanCtx | null>(null);

/** Shared, memoised lookups for everything on the planbord. Conflicts are computed once per data version. */
export function PlanProvider({ data, ws, actions, children }: { data: PlanData; ws: Workspace; actions: PlanActions; children: ReactNode }) {
  const derived = useMemo(() => {
    const conflicts = detectConflicts(data);
    return {
      employees: new Map(data.employees.map((e) => [e.id, e])),
      locations: new Map(data.locations.map((l) => [l.id, l])),
      conflicts,
      byShift: conflictsByShift(conflicts),
    };
  }, [data]);
  return <Ctx value={{ data, ws, ...derived, ...actions }}>{children}</Ctx>;
}

export function usePlan(): PlanCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlan must be used inside PlanProvider");
  return v;
}
