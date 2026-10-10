"use client";

import { MoreHorizontal, Pencil, UserMinus, XCircle } from "lucide-react";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConflictLine, ConflictPill } from "./ConflictBadge";
import { usePlan } from "./PlanContext";

interface Props {
  shift: Shift;
  /** full: conflict explanations written out; compact: pills only (week view) */
  variant?: "full" | "compact";
  showEmployee?: boolean;
  dimmed?: boolean;
}

export function ShiftActions({ shift }: { shift: Shift }) {
  const { edit, remove } = usePlan();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Acties ${shift.code}`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => edit(shift)}>
          <Pencil /> Bewerken
        </DropdownMenuItem>
        {shift.employeeId && (
          <DropdownMenuItem onClick={() => remove(shift, "employee")}>
            <UserMinus /> Medewerker eraf halen
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => remove(shift, "shift")}>
          <XCircle /> Dienst annuleren
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ShiftChip({ shift, variant = "full", showEmployee = false, dimmed = false }: Props) {
  const { locations, employees, byShift, edit } = usePlan();
  const conflicts = byShift.get(shift.id) ?? [];
  const loc = locations.get(shift.locationId);
  const emp = shift.employeeId ? employees.get(shift.employeeId) : null;
  const open = !shift.employeeId;

  return (
    <div
      className={cn(
        "group relative flex gap-2 rounded-lg border bg-card p-2 text-sm shadow-xs transition-colors",
        open && "border-dashed border-open/60 bg-open/[0.03]",
        conflicts.length > 0 && "border-destructive/40 bg-destructive/[0.03]",
        dimmed && "opacity-60",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "w-1 shrink-0 rounded-full",
          conflicts.length > 0 ? "bg-destructive" : open ? "bg-open" : "bg-primary/40",
        )}
      />
      <button
        type="button"
        onClick={() => edit(shift)}
        className="min-w-0 flex-1 cursor-pointer text-left focus-visible:outline-none"
        aria-label={`${shift.code} bewerken`}
      >
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-semibold tabular-nums">
            {shift.start}-{shift.end}
          </span>
          <span className="truncate font-medium">{loc?.name}</span>
          {variant === "full" && <span className="text-xs text-muted-foreground">{loc?.city}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showEmployee && (
            <span className={cn("font-medium", open ? "text-open-foreground" : "text-foreground")}>
              {emp?.name ?? "Open dienst"}
            </span>
          )}
          {!showEmployee && open && <span className="font-medium text-open-foreground">Open dienst</span>}
          <span>{shift.fn}</span>
          <span className="tabular-nums">{shift.code}</span>
          {shift.note && <span className="italic">"{shift.note}"</span>}
          {variant === "compact" && conflicts.map((c, i) => <ConflictPill key={i} type={c.type} />)}
        </div>
        {variant === "full" && conflicts.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {conflicts.map((c, i) => (
              <ConflictLine key={i} conflict={c} />
            ))}
          </div>
        )}
      </button>
      <ShiftActions shift={shift} />
    </div>
  );
}
