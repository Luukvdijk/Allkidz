"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PlanData, Shift } from "@/lib/types";
import { applyFilters, parseFilters, toQuery, type Filters } from "@/lib/filters";
import { addDays, mondayOf } from "@/lib/time";
import { detectConflicts } from "@/lib/conflicts";
import { ShiftSheet, type SheetState } from "@/components/shift/ShiftSheet";
import { RemoveDialog, type RemoveState } from "@/components/shift/RemoveDialog";
import { PlanProvider, type Workspace } from "./PlanContext";
import { Toolbar } from "./Toolbar";
import { DayView } from "./DayView";
import { ListView } from "./ListView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";

/** Range of dates a view shows. */
function dateScope(f: Filters): [string, string] {
  if (f.view === "dag") return [f.date, f.date];
  if (f.view === "maand") return [f.date.slice(0, 8) + "01", f.date.slice(0, 8) + "31"];
  const monday = mondayOf(f.date);
  return [monday, addDays(monday, 6)];
}

export function Planbord({ data, ws }: { data: PlanData; ws: Workspace }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [removing, setRemoving] = useState<RemoveState>(null);

  const set = useCallback(
    (patch: Partial<Filters>) => {
      const q = toQuery({ ...filters, ...patch });
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const conflictIds = useMemo(() => new Set(detectConflicts(data).flatMap((c) => c.shiftIds)), [data]);
  const visible = useMemo(() => applyFilters(data, filters, conflictIds), [data, filters, conflictIds]);
  const scoped = useMemo(() => {
    const [from, to] = dateScope(filters);
    return applyFilters(data, { ...filters, onlyConflicts: false, onlyOpen: false }, conflictIds).filter((s) => s.date >= from && s.date <= to);
  }, [data, filters, conflictIds]);

  const actions = useMemo(
    () => ({
      edit: (shift: Shift) => setSheet({ mode: "edit", shift }),
      create: (defaults = {}) => setSheet({ mode: "new", defaults }),
      remove: (shift: Shift, mode: "employee" | "shift") => setRemoving({ shift, mode }),
    }),
    [],
  );

  const openDay = (date: string, employeeId?: string) => set({ view: "dag", date, ...(employeeId ? { employeeId } : {}) });
  const monday = mondayOf(filters.date);

  return (
    <PlanProvider data={data} ws={ws} actions={actions}>
      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-4">
        <Toolbar filters={filters} set={set} scoped={scoped} visible={visible} />
        {filters.view === "dag" && <DayView visible={visible} date={filters.date} />}
        {filters.view === "lijst" && <ListView visible={visible} from={monday} to={addDays(monday, 6)} />}
        {filters.view === "week" && <WeekView visible={visible} monday={monday} onOpenDay={openDay} />}
        {filters.view === "maand" && <MonthView visible={visible} date={filters.date} employeeId={filters.employeeId} onOpenDay={(d) => openDay(d)} />}
      </main>
      <ShiftSheet state={sheet} onClose={() => setSheet(null)} onCreated={(d) => set({ date: d })} />
      <RemoveDialog state={removing} onClose={() => setRemoving(null)} />
    </PlanProvider>
  );
}
