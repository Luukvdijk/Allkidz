"use client";

import { useMemo, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { Shift } from "@/lib/types";
import { rankCandidates } from "@/lib/suggest";
import { hoursLabel } from "@/lib/hours";
import { shortDate } from "@/lib/time";
import { PLANNER } from "@/lib/data/actor";
import { assignEmployee } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePlan } from "@/components/planbord/PlanContext";

export function SuggestDialog({ shift, onClose }: { shift: Shift | null; onClose: () => void }) {
  return (
    <Dialog open={shift !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">{shift && <Suggestions key={shift.id} shift={shift} onClose={onClose} />}</DialogContent>
    </Dialog>
  );
}

function Suggestions({ shift, onClose }: { shift: Shift; onClose: () => void }) {
  const { data, locations } = usePlan();
  const [pending, start] = useTransition();
  const candidates = useMemo(() => rankCandidates(data, shift), [data, shift]);
  const loc = locations.get(shift.locationId)!;

  const plan = (employeeId: string, name: string) =>
    start(async () => {
      const r = await assignEmployee(shift.id, employeeId, PLANNER);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(`${name} staat op ${shift.code}`, { description: r.notified ? `${loc.name} krijgt automatisch bericht.` : undefined });
      onClose();
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden /> Wie kan {shift.code} doen?
        </DialogTitle>
        <DialogDescription>
          <span className="first-letter:uppercase">{shortDate(shift.date)}</span> {shift.start}-{shift.end}, {loc.name}, {shift.fn}. Alleen medewerkers met
          deze functie die beschikbaar zijn, niet overlappen en genoeg reistijd hebben. Minste uren deze week eerst.
        </DialogDescription>
      </DialogHeader>
      {candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Niemand past zonder conflict. Tijd om te bellen.</p>
      ) : (
        <ol className="divide-y rounded-lg border">
          {candidates.slice(0, 6).map((c, i) => (
            <li key={c.employeeId} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className="w-4 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="flex-1">
                <span className="font-medium">{c.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {hoursLabel(c.weekMinutes)} deze week · {c.dayShifts === 0 ? "nog vrij die dag" : `${c.dayShifts} andere dienst${c.dayShifts === 1 ? "" : "en"} die dag`}
                </span>
              </span>
              <Button size="sm" variant={i === 0 ? "default" : "outline"} disabled={pending} onClick={() => plan(c.employeeId, c.name)}>
                Inplannen
              </Button>
            </li>
          ))}
        </ol>
      )}
      {candidates.length > 6 && <p className="text-xs text-muted-foreground">En nog {candidates.length - 6} andere geschikte medewerkers.</p>}
    </>
  );
}
