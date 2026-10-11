"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Conflict, Location, Shift } from "@/lib/types";
import { conflictsIfAssigned } from "@/lib/conflicts";
import { expandRule } from "@/lib/recurrence";
import { pickBag } from "@/lib/bags";
import { MissingNotice } from "@/components/bags/MissingNotice";
import { Checkbox } from "@/components/ui/checkbox";
import { notBefore, shortDate } from "@/lib/time";
import { PLANNER } from "@/lib/data/actor";
import { createShifts, updateShift } from "@/app/actions/shifts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConflictLine } from "@/components/planbord/ConflictBadge";
import { usePlan } from "@/components/planbord/PlanContext";
import { RecurrenceInput, initialRecurrence, toRule, type RecurrenceState } from "./RecurrenceInput";

const FUNCTIONS = ["KidzCoach", "Toezichthouder", "Aqualessen", "Zwemonderwijzer", "Gymdocent"];
const LICENCES = ["VOG", "EHBO", "Kinder-EHBO", "BHV", "Toezicht zwembad"];
const AUTO = "__auto__";

/** Sensible default function for a location type (the client can still pick any). */
export function defaultFunction(loc?: Location): string {
  if (loc?.type === "Zwembad") return "Aqualessen";
  if (loc?.type === "School") return "Gymdocent";
  return "KidzCoach";
}

export type SheetState =
  | { mode: "new"; defaults: Partial<Pick<Shift, "date" | "employeeId" | "locationId" | "start" | "end" | "fn">> }
  | { mode: "edit"; shift: Shift };

interface Props {
  state: SheetState | null;
  onClose: () => void;
  onCreated?: (firstDate: string) => void;
}

export function ShiftSheet({ state, onClose, onCreated }: Props) {
  return (
    <Sheet open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {state && <ShiftForm key={state.mode === "edit" ? state.shift.id : "new"} state={state} onClose={onClose} onCreated={onCreated} />}
      </SheetContent>
    </Sheet>
  );
}

function ShiftForm({ state, onClose, onCreated }: { state: SheetState; onClose: () => void; onCreated?: (d: string) => void }) {
  const { data, locations, employees, ws } = usePlan();
  const edit = state.mode === "edit" ? state.shift : null;
  const d = state.mode === "new" ? state.defaults : {};
  const firstLocation = d.locationId ?? data.locations[0].id;

  const [employeeId, setEmployeeId] = useState<string>(edit?.employeeId ?? d.employeeId ?? "");
  const [locationId, setLocationId] = useState<string>(edit?.locationId ?? firstLocation);
  const [fn, setFn] = useState<string>(edit?.fn ?? d.fn ?? defaultFunction(locations.get(firstLocation)));
  const [start, setStart] = useState(edit?.start ?? d.start ?? "14:45");
  const [end, setEnd] = useState(edit?.end ?? d.end ?? "18:00");
  const [note, setNote] = useState(edit?.note ?? "");
  const [date, setDate] = useState(edit?.date ?? notBefore(d.date ?? "2026-10-19", ws.today));
  const [rec, setRec] = useState<RecurrenceState>(() => initialRecurrence(d.date ?? "2026-10-19", ws.today));
  // A shift already in the past may keep its date; everything else starts at today.
  const minDate = edit && edit.date < ws.today ? edit.date : ws.today;
  const [activityId, setActivityId] = useState<string>(edit?.activityId ?? "");
  // AUTO: the system picks a free bag per date; "" means no bag; otherwise a fixed bag id.
  const [bagChoice, setBagChoice] = useState<string>(edit ? (edit.bagId ?? "") : AUTO);
  const [extraReqs, setExtraReqs] = useState<string[]>(edit?.extraRequirements ?? []);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start_] = useTransition();

  const dates = useMemo(() => (edit ? [date] : expandRule(toRule(rec)).slice(0, 200)), [edit, date, rec]);
  const timesValid = /^\d{2}:\d{2}$/.test(start) && /^\d{2}:\d{2}$/.test(end) && end > start;

  const bagFor = (dt: string): string | null =>
    !activityId ? null : bagChoice === AUTO ? pickBag(activityId, dt, employeeId || null, data, edit?.id) : bagChoice || null;

  const probe = (dt: string): Shift => ({
    id: edit?.id ?? `__new__${dt}`, code: edit?.code ?? "nieuw", date: dt, start, end, locationId, fn,
    employeeId: employeeId || null, status: "active", note: null, seriesId: null,
    activityId: activityId || null, bagId: bagFor(dt), extraRequirements: extraReqs,
  });

  const preview = useMemo(() => {
    if (!timesValid) return [];
    return dates.map((dt) => ({ date: dt, conflicts: employeeId ? conflictsIfAssigned(data, probe(dt), employeeId) : ([] as Conflict[]) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates, employeeId, locationId, fn, start, end, data, timesValid, activityId, bagChoice, extraReqs]);
  const conflictCount = preview.filter((p) => p.conflicts.length > 0).length;

  // Which employees would get a conflict on the first date: shown in the dropdown as a warning.
  const busy = useMemo(() => {
    if (!timesValid || dates.length === 0) return new Set<string>();
    const first = probe(dates[0]);
    return new Set(data.employees.filter((e) => conflictsIfAssigned(data, first, e.id).length > 0).map((e) => e.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dates, locationId, fn, start, end, data, timesValid, activityId, bagChoice, extraReqs]);

  const markedDates = useMemo(() => new Set(data.shifts.map((s) => s.date)), [data.shifts]);

  const save = () => {
    setError(null);
    if (!timesValid) return setError("De eindtijd moet na de begintijd liggen.");
    if (dates.length === 0) return setError("Kies minstens één datum.");
    if (conflictCount > 0 && !confirming) return setConfirming(true);
    start_(async () => {
      const r = edit
        ? await updateShift(
            edit.id,
            { employeeId: employeeId || null, locationId, fn, date, start, end, note, activityId: activityId || null, bagId: bagFor(date), extraRequirements: extraReqs },
            PLANNER,
          )
        : await createShifts({
            employeeId: employeeId || null, locationId, fn, start, end, note, rule: toRule(rec), actor: PLANNER,
            activityId: activityId || null, bagIds: dates.map(bagFor), extraRequirements: extraReqs,
          });
      if ("error" in r) return setError(r.error);
      toast.success(edit ? `${edit.code} opgeslagen` : `${dates.length} ${dates.length === 1 ? "dienst" : "diensten"} aangemaakt`, {
        description: r.notified ? "De opdrachtgever krijgt automatisch bericht." : undefined,
      });
      if (!edit && r.firstDate) onCreated?.(r.firstDate);
      onClose();
    });
  };

  return (
    <>
      <SheetHeader className="border-b">
        <SheetTitle>{edit ? `Dienst ${edit.code} bewerken` : "Nieuwe dienst"}</SheetTitle>
        <SheetDescription>
          {edit ? "Wijzigingen worden vastgelegd in het wijzigingslog." : "Conflicten zie je hieronder al voordat je opslaat."}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-4 p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="f-emp">Medewerker</Label>
          <NativeSelect id="f-emp" value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setConfirming(false); }}>
            <option value="">Open dienst (nog niemand)</option>
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {!e.functions.includes(fn) ? " (andere functie)" : busy.has(e.id) ? " (conflict)" : ""}
              </option>
            ))}
          </NativeSelect>
          {employeeId && <p className="text-xs text-muted-foreground">Functies: {employees.get(employeeId)?.functions.join(", ")}</p>}
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="f-loc">Locatie</Label>
          <NativeSelect
            id="f-loc"
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              if (!edit) setFn(defaultFunction(locations.get(e.target.value)));
              setConfirming(false);
            }}
          >
            {data.locations.filter((l) => !l.archived || l.id === locationId).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.city})
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-3 grid gap-1.5 sm:col-span-1">
            <Label htmlFor="f-fn">Functie</Label>
            <NativeSelect id="f-fn" value={fn} onChange={(e) => { setFn(e.target.value); setConfirming(false); }}>
              {FUNCTIONS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-start">Begin</Label>
            <Input id="f-start" type="time" step={300} value={start} onChange={(e) => { setStart(e.target.value); setConfirming(false); }} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-end">Eind</Label>
            <Input id="f-end" type="time" step={300} value={end} onChange={(e) => { setEnd(e.target.value); setConfirming(false); }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="f-act">Activiteit</Label>
            <NativeSelect id="f-act" value={activityId} onChange={(e) => { setActivityId(e.target.value); setBagChoice(AUTO); setConfirming(false); }}>
              <option value="">Geen</option>
              {(data.activities ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-bag">Tas</Label>
            <NativeSelect id="f-bag" value={bagChoice} disabled={!activityId} onChange={(e) => { setBagChoice(e.target.value); setConfirming(false); }}>
              <option value={AUTO}>Automatisch (vrije tas)</option>
              <option value="">Geen tas</option>
              {(data.bags ?? []).filter((b) => b.activityId === activityId).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          {activityId && bagChoice === AUTO && dates.length > 0 && (
            <p className="col-span-2 text-xs text-muted-foreground">
              {dates.every((dt) => bagFor(dt))
                ? `Tas: ${[...new Set(dates.map((dt) => data.bags?.find((b) => b.id === bagFor(dt))?.label))].join(", ")}`
                : "Let op: op sommige dagen is geen tas vrij."}
            </p>
          )}
          {activityId &&
            [...new Set((dates.length > 0 ? dates : [date]).map(bagFor))].map((b) => (
              <MissingNotice
                key={b ?? "none"}
                bagId={b}
                data={data}
                className="col-span-2"
                hint={bagChoice === AUTO ? "Er is geen complete tas vrij. Vul de tas aan of laat de coach het zelf meenemen." : "Kies een andere tas of zorg dat het aangevuld is."}
              />
            ))}
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-sm font-medium">Extra eisen (bovenop de eisen van de locatie)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LICENCES.filter((l) => l !== "VOG").map((l) => (
              <label key={l} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={extraReqs.includes(l)}
                  onCheckedChange={(on) => { setExtraReqs(on ? [...extraReqs, l] : extraReqs.filter((x) => x !== l)); setConfirming(false); }}
                />
                {l}
              </label>
            ))}
          </div>
          {data.requirements && (
            <p className="text-xs text-muted-foreground">
              Altijd vereist op een {locations.get(locationId)?.type}: {(data.requirements[locations.get(locationId)?.type ?? ""] ?? []).join(", ") || "niets"}.
            </p>
          )}
        </fieldset>

        {edit ? (
          <div className="grid gap-1.5">
            <Label htmlFor="f-date">Datum</Label>
            <Input id="f-date" type="date" min={minDate} value={date} onChange={(e) => { setDate(e.target.value); setConfirming(false); }} />
          </div>
        ) : (
          <RecurrenceInput value={rec} onChange={(v) => { setRec(v); setConfirming(false); }} marked={markedDates} min={ws.today} />
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="f-note">Opmerking (optioneel)</Label>
          <Textarea id="f-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        <section aria-live="polite" className="rounded-lg border bg-muted/30 p-3">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            Controle
            <span className="font-normal text-muted-foreground">
              {dates.length} {dates.length === 1 ? "dienst" : "diensten"}
              {conflictCount > 0 && <span className="text-destructive">, {conflictCount} met conflict</span>}
            </span>
          </h3>
          {!timesValid ? (
            <p className="text-sm text-destructive">De eindtijd moet na de begintijd liggen.</p>
          ) : !employeeId ? (
            <p className="text-sm text-muted-foreground">Open dienst: er wordt niemand gecontroleerd. Medewerkers met de functie {fn} zien hem in hun app.</p>
          ) : (
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {preview.map((p) => (
                <li key={p.date} className="text-sm">
                  <span className={cn("flex items-center gap-1.5", p.conflicts.length ? "font-medium" : "text-muted-foreground")}>
                    {p.conflicts.length ? (
                      <AlertTriangle className="size-3.5 text-destructive" aria-hidden />
                    ) : (
                      <CheckCircle2 className="size-3.5 text-ok" aria-hidden />
                    )}
                    <span className="first-letter:uppercase">{shortDate(p.date)}</span>
                    {!p.conflicts.length && <span>geen conflicten</span>}
                  </span>
                  {p.conflicts.map((c, i) => (
                    <div key={i} className="ml-5">
                      <ConflictLine conflict={c} compact />
                    </div>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>

      <SheetFooter className="sticky bottom-0 mt-auto border-t bg-popover">
        {confirming && (
          <p className="text-sm text-destructive">
            Er {conflictCount === 1 ? "is 1 conflict" : `zijn ${conflictCount} conflicten`}. Weet je het zeker? Soms weet de planner meer dan het systeem.
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Annuleren
          </Button>
          <Button onClick={save} disabled={pending} variant={confirming ? "destructive" : "default"} className="flex-1">
            {pending ? "Opslaan..." : confirming ? `Toch opslaan (${conflictCount} conflict${conflictCount === 1 ? "" : "en"})` : "Opslaan"}
          </Button>
        </div>
      </SheetFooter>
    </>
  );
}
