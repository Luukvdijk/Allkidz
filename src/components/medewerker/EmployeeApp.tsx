"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CalendarOff, Inbox, UserRound } from "lucide-react";
import { cn } from "cn";
import type { Employee, PlanData, Shift } from "@/lib/types";
import type { Actor } from "@/lib/data/actor";
import { PlanProvider, usePlan, type Workspace } from "@/components/planbord/PlanContext";
import { RemoveDialog, type RemoveState } from "@/components/shift/RemoveDialog";
import { Availability } from "./Availability";
import { MyShifts } from "./MyShifts";
import { OpenShifts } from "./OpenShifts";
import { Profile } from "./Profile";
import { byStart } from "./shared";

type Tab = "diensten" | "beschikbaar" | "open" | "profiel";

export function EmployeeApp({ data, ws, employee }: { data: PlanData; ws: Workspace; employee: Employee }) {
  const [removing, setRemoving] = useState<RemoveState>(null);
  const actions = useMemo(() => ({ edit: () => {}, create: () => {}, remove: (shift: Shift) => setRemoving({ shift, mode: "employee" as const }) }), []);
  const actor: Actor = { role: "medewerker", name: employee.name, employeeId: employee.id };
  return (
    <PlanProvider data={data} ws={ws} actions={actions}>
      <Phone employee={employee} actor={actor} />
      <RemoveDialog state={removing} onClose={() => setRemoving(null)} actor={actor} />
    </PlanProvider>
  );
}

function Phone({ employee, actor }: { employee: Employee; actor: Actor }) {
  const [tab, setTab] = useState<Tab>("diensten");
  const { data, byShift } = usePlan();
  const mine = useMemo(() => data.shifts.filter((s) => s.employeeId === employee.id && s.status === "active").sort(byStart), [data.shifts, employee.id]);
  const conflicts = mine.filter((s) => byShift.has(s.id)).length;

  // Below md this is the phone app (full screen, tab bar at the bottom); from md up it is a normal web page with tabs on top.
  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col overflow-hidden bg-background md:mx-auto md:h-auto md:max-w-5xl md:overflow-visible md:px-4 md:py-6">
      <header className="bg-primary px-4 pt-4 pb-3 text-primary-foreground md:rounded-xl md:px-6 md:py-5">
        <p className="text-xs opacity-80">AllKidz voor medewerkers</p>
        <h1 className="text-lg font-semibold md:text-2xl">Hoi {employee.name}</h1>
        <p className="text-xs opacity-80 md:text-sm">{employee.functions.join(", ")}</p>
        {conflicts > 0 && <p className="mt-2 rounded-md bg-white/15 px-2 py-1 text-xs md:inline-block md:text-sm">Let op: {conflicts} van je diensten {conflicts === 1 ? "heeft" : "hebben"} een probleem. De planner kijkt ernaar.</p>}
      </header>
      <nav className="order-last grid grid-cols-4 border-t bg-card md:order-none md:my-4 md:flex md:gap-1 md:border-t-0 md:border-b md:bg-transparent" aria-label="Medewerker">
        {([
          ["diensten", "Diensten", "Diensten", CalendarDays],
          ["beschikbaar", "Beschikbaar", "Beschikbaarheid", CalendarOff],
          ["open", "Open", "Open diensten", Inbox],
          ["profiel", "Profiel", "Profiel", UserRound],
        ] as const).map(([t, short, long, Icon]) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "press flex flex-col items-center gap-0.5 py-2 text-xs md:-mb-px md:flex-row md:gap-2 md:border-b-2 md:px-3 md:text-sm",
              tab === t ? "font-medium text-primary md:border-primary" : "text-muted-foreground md:border-transparent md:hover:text-foreground",
            )}
          >
            <Icon className="size-5 md:size-4" aria-hidden />
            <span className="md:hidden">{short}</span>
            <span className="max-md:hidden">{long}</span>
          </button>
        ))}
      </nav>
      <div className="flex-1 overflow-y-auto p-3 md:overflow-visible md:p-0">
        {tab === "diensten" && <MyShifts mine={mine} actor={actor} />}
        {tab === "beschikbaar" && <Availability employee={employee} actor={actor} />}
        {tab === "open" && <OpenShifts employee={employee} actor={actor} />}
        {tab === "profiel" && <Profile employee={employee} />}
      </div>
    </div>
  );
}
