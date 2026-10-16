"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Client, Employee, PlanData } from "@/lib/types";
import { describeRule, expandRule } from "@/lib/recurrence";
import { shortDate } from "@/lib/time";
import type { ShiftRequest } from "@/lib/data/requests";
import { createRequest } from "@/app/actions/requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { RecurrenceInput, initialRecurrence, toRule, type RecurrenceState } from "@/components/shift/RecurrenceInput";
import { defaultFunction } from "@/components/shift/ShiftSheet";

const FUNCTIONS = ["KidzCoach", "Toezichthouder", "Aqualessen", "Zwemonderwijzer", "Gymdocent"];

function requestStatus(r: ShiftRequest, data: PlanData): { label: string; tone: "open" | "ok" | "warn" | "bad"; coaches: Employee[] } {
  if (r.status === "aangevraagd") return { label: "Aangevraagd, wacht op AllKidz", tone: "open", coaches: [] };
  if (r.status === "afgewezen") return { label: "Afgewezen", tone: "bad", coaches: [] };
  const shifts = data.shifts.filter((s) => r.shiftIds.includes(s.id) && s.status === "active");
  const ids = [...new Set(shifts.map((s) => s.employeeId).filter(Boolean))] as string[];
  const coaches = ids.map((id) => data.employees.find((e) => e.id === id)!).filter(Boolean);
  const filled = shifts.filter((s) => s.employeeId).length;
  if (shifts.length > 0 && filled === shifts.length) return { label: `Ingepland met ${coaches.map((c) => c.name).join(", ")}`, tone: "ok", coaches };
  if (filled > 0) return { label: `Deels ingepland (${filled}/${shifts.length})`, tone: "warn", coaches };
  return { label: "Goedgekeurd, coach wordt gezocht", tone: "warn", coaches };
}

export function Requests({ client, data, today, requests, onCoach }: { client: Client; data: PlanData; today: string; requests: ShiftRequest[]; onCoach: (e: Employee) => void }) {
  const active = data.locations.filter((l) => l.clientId === client.id && !l.archived);
  const [locationId, setLocationId] = useState(active[0]?.id ?? "");
  const [fn, setFn] = useState(() => defaultFunction(active[0]));
  const [start, setStart] = useState("14:45");
  const [end, setEnd] = useState("18:00");
  const [activityId, setActivityId] = useState("");
  const [note, setNote] = useState("");
  const [rec, setRec] = useState<RecurrenceState>(() => initialRecurrence("2026-10-26", today));
  const [pending, startT] = useTransition();
  const locName = new Map(data.locations.map((l) => [l.id, l.name]));
  const dates = useMemo(() => expandRule(toRule(rec)), [rec]);

  const submit = () =>
    startT(async () => {
      const r = await createRequest(client.id, { locationId, rule: toRule(rec), start, end, fn, activityId: activityId || null, note });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Aanvraag verstuurd", { description: "AllKidz plant er een coach op en je ziet hier de status." });
      setNote("");
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <h2 className="font-semibold">Nieuwe aanvraag</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Voeg eerst een locatie toe.</p>
        ) : (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="r-loc">Locatie</Label>
              <NativeSelect id="r-loc" value={locationId} onChange={(e) => { setLocationId(e.target.value); setFn(defaultFunction(active.find((l) => l.id === e.target.value))); }}>
                {active.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-3 grid gap-1.5 sm:col-span-1">
                <Label htmlFor="r-fn">Functie</Label>
                <NativeSelect id="r-fn" value={fn} onChange={(e) => setFn(e.target.value)}>
                  {FUNCTIONS.map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </NativeSelect>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="r-start">Begin</Label>
                <Input id="r-start" type="time" step={300} value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="r-end">Eind</Label>
                <Input id="r-end" type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="r-act">Activiteit (optioneel)</Label>
              <NativeSelect id="r-act" value={activityId} onChange={(e) => setActivityId(e.target.value)}>
                <option value="">Geen voorkeur</option>
                {(data.activities ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <RecurrenceInput value={rec} onChange={setRec} min={today} />
            <div className="grid gap-1.5">
              <Label htmlFor="r-note">Opmerking (optioneel)</Label>
              <Textarea id="r-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={pending || dates.length === 0}>
              {pending ? "Versturen..." : `Aanvragen (${dates.length} ${dates.length === 1 ? "dienst" : "diensten"})`}
            </Button>
          </>
        )}
      </form>

      <section className="space-y-2">
        <h2 className="font-semibold">Mijn aanvragen</h2>
        {requests.length === 0 && <p className="text-sm text-muted-foreground">Nog geen aanvragen.</p>}
        <ul className="space-y-2">
          {requests.map((r) => {
            const st = requestStatus(r, data);
            const ds = expandRule(r.rule);
            return (
              <li key={r.id} className="rounded-xl border bg-card p-3 text-sm">
                <p className="font-medium">
                  {locName.get(r.locationId)} · {r.fn} · {r.start}-{r.end}
                </p>
                <p className="text-muted-foreground">
                  {describeRule(r.rule)}: {ds.slice(0, 4).map(shortDate).join(", ")}
                  {ds.length > 4 && ` en nog ${ds.length - 4}`}
                </p>
                <p
                  className={cn(
                    "mt-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                    st.tone === "open" && "bg-open/15 text-open-foreground",
                    st.tone === "ok" && "bg-ok/15 text-ok",
                    st.tone === "warn" && "bg-warn/20 text-warn-foreground",
                    st.tone === "bad" && "bg-destructive/10 text-destructive",
                  )}
                >
                  {st.label}
                </p>
                {r.status === "afgewezen" && r.reason && <p className="mt-1 text-destructive">Reden: {r.reason}</p>}
                {st.coaches.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {st.coaches.map((c) => (
                      <Button key={c.id} size="xs" variant="outline" onClick={() => onCoach(c)}>
                        Profiel {c.name}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
