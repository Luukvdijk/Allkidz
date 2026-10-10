"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import type { Shift } from "@/lib/types";
import { isShortNotice } from "@/lib/notice";
import { buildClientMessage } from "@/lib/messages";
import { shortDate } from "@/lib/time";
import { PLANNER, type Actor } from "@/lib/data/actor";
import { cancelShift, removeEmployee } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePlan, type RemoveMode } from "@/components/planbord/PlanContext";

const PLANNER_REASONS = ["Ziek", "Op verzoek opdrachtgever", "Dubbel gepland", "Anders"];
const EMPLOYEE_REASONS = ["Ziek", "Afspraak", "Studie of tentamen", "Anders"];

export type RemoveState = { shift: Shift; mode: RemoveMode } | null;

export function RemoveDialog({ state, onClose, actor = PLANNER }: { state: RemoveState; onClose: () => void; actor?: Actor }) {
  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {state && <RemoveForm key={state.shift.id + state.mode} state={state} onClose={onClose} actor={actor} />}
      </DialogContent>
    </Dialog>
  );
}

function RemoveForm({ state, onClose, actor }: { state: NonNullable<RemoveState>; onClose: () => void; actor: Actor }) {
  const { ws, employees, locations } = usePlan();
  const { shift, mode } = state;
  const [choice, setChoice] = useState<string>("");
  const [extra, setExtra] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const emp = shift.employeeId ? employees.get(shift.employeeId) : null;
  const loc = locations.get(shift.locationId)!;
  const short = isShortNotice(shift.date, ws.today, ws.noticeDays);
  const message = buildClientMessage({
    action: mode === "employee" ? "employee_removed" : "shift_cancelled",
    shift: { code: shift.code, date: shift.date, start: shift.start, end: shift.end, fn: shift.fn },
    locationName: loc.name,
    employeeName: emp?.name ?? null,
  });
  const self = actor.role === "medewerker";
  const REASONS = self ? EMPLOYEE_REASONS : PLANNER_REASONS;
  const reason = choice === "Anders" ? extra.trim() : [choice, extra.trim()].filter(Boolean).join(": ");

  const submit = () => {
    setError(null);
    if (!choice) return setError("Kies een reden.");
    if (!reason) return setError("Beschrijf de reden.");
    start(async () => {
      const r = mode === "employee" ? await removeEmployee(shift.id, reason, actor, self) : await cancelShift(shift.id, reason, actor);
      if ("error" in r) return setError(r.error);
      toast.success(self ? `Je bent afgemeld voor ${shift.code}` : mode === "employee" ? `${emp?.name} is van ${shift.code} gehaald` : `${shift.code} is geannuleerd`, {
        description: self ? "De planner ziet je afmelding direct." : r.notified ? `${loc.name} krijgt automatisch bericht.` : "Vastgelegd in het wijzigingslog.",
      });
      onClose();
    });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{self ? `Afmelden voor ${shift.code}?` : mode === "employee" ? `${emp?.name} van deze dienst halen?` : `Dienst ${shift.code} annuleren?`}</DialogTitle>
        <DialogDescription>
          <span className="first-letter:uppercase">{shortDate(shift.date)}</span> {shift.start}-{shift.end}, {loc.name}, {shift.fn}.{" "}
          {self ? "De planner ziet je afmelding direct en zoekt een vervanger." : mode === "employee" ? "De dienst wordt een open dienst." : "De dienst blijft terug te vinden in het wijzigingslog."}
        </DialogDescription>
      </DialogHeader>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Reden (verplicht)</legend>
        <div className="grid grid-cols-2 gap-1.5">
          {REASONS.map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm has-checked:border-primary has-checked:bg-accent">
              <input type="radio" name="reason" value={r} checked={choice === r} onChange={() => setChoice(r)} className="accent-(--primary)" />
              {r}
            </label>
          ))}
        </div>
        <Label htmlFor="reason-extra" className="sr-only">
          Toelichting
        </Label>
        <Textarea
          id="reason-extra"
          rows={2}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={choice === "Anders" ? "Beschrijf de reden" : "Toelichting (optioneel)"}
        />
      </fieldset>

      {self ? null : short ? (
        <div className="rounded-lg border border-primary/30 bg-accent/60 p-3 text-sm">
          <p className="mb-2 flex items-center gap-1.5 font-medium text-accent-foreground">
            <Mail className="size-4" aria-hidden />
            Binnen {ws.noticeDays} dagen: {loc.name} krijgt automatisch dit bericht
          </p>
          <div className="rounded-md bg-background p-2.5 text-xs whitespace-pre-line text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">{message.subject}</p>
            {message.body}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">De reden zelf deelt het systeem niet met de opdrachtgever.</p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ruim van tevoren (meer dan {ws.noticeDays} dagen): alleen vastgelegd in het wijzigingslog, geen bericht naar de opdrachtgever.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Terug
        </Button>
        <Button variant="destructive" onClick={submit} disabled={pending}>
          {pending ? "Bezig..." : "Bevestigen"}
        </Button>
      </DialogFooter>
    </>
  );
}
