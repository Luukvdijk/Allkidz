import { AlertTriangle, Backpack, Ban, BadgeCheck, Car, Clock, UserX } from "lucide-react";
import { cn } from "cn";
import type { Conflict, ConflictType } from "@/lib/types";

export const CONFLICT_LABEL: Record<ConflictType, string> = {
  overlap: "Overlap",
  travel: "Reistijd",
  unavailable: "Niet beschikbaar",
  function: "Functie",
  licence: "Licentie",
  bag: "Tas dubbel",
};

const ICON = { overlap: Clock, travel: Car, unavailable: UserX, function: Ban, licence: BadgeCheck, bag: Backpack } as const;

/** A conflict shown as text, never only as a colour or tooltip, so it is readable on a phone and in a video. */
export function ConflictLine({ conflict, compact = false }: { conflict: Conflict; compact?: boolean }) {
  const Icon = ICON[conflict.type] ?? AlertTriangle;
  return (
    <p className={cn("flex items-start gap-1.5 text-destructive", compact ? "text-xs" : "text-[13px]")}>
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">{CONFLICT_LABEL[conflict.type]}:</span> {conflict.message}
      </span>
    </p>
  );
}

export function ConflictPill({ type }: { type: ConflictType }) {
  const Icon = ICON[type];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
      <Icon className="size-3" aria-hidden />
      {CONFLICT_LABEL[type]}
    </span>
  );
}
