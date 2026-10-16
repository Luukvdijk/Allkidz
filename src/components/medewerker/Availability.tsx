"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Employee } from "@/lib/types";
import { notBefore, shortDate, toMin } from "@/lib/time";
import type { Actor } from "@/lib/data/actor";
import { addUnavailability, removeUnavailability } from "@/app/actions/availability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { usePlan } from "@/components/planbord/PlanContext";

export function Availability({ employee, actor }: { employee: Employee; actor: Actor }) {
  const { data, ws } = usePlan();
  const [date, setDate] = useState(() => notBefore("2026-10-21", ws.today));
  const [wholeDay, setWholeDay] = useState(true);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("17:00");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();

  const mine = data.unavailability.filter((u) => u.employeeId === employee.id).sort((a, b) => a.date.localeCompare(b.date) || a.from.localeCompare(b.from));
  const f = wholeDay ? "00:00" : from;
  const t = wholeDay ? "23:59" : to;
  const clashes = data.shifts.filter(
    (s) => s.employeeId === employee.id && s.status === "active" && s.date === date && toMin(s.start) < toMin(t) && toMin(f) < toMin(s.end),
  );

  const save = () =>
    start(async () => {
      const r = await addUnavailability({ employeeId: employee.id, date, from: f, to: t, reason }, actor);
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Doorgegeven", { description: "De planner ziet dit direct." });
        setReason("");
      }
    });

  return (
    <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
      <form
        className="space-y-3 rounded-xl border bg-card p-3 md:p-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h2 className="text-sm font-semibold">Ik kan niet op</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="u-date">Datum</Label>
          <Input id="u-date" type="date" min={ws.today} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <label className="flex items-center justify-between text-sm">
          Hele dag
          <Switch checked={wholeDay} onCheckedChange={setWholeDay} />
        </label>
        {!wholeDay && (
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="u-from">Van</Label>
              <Input id="u-from" type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="u-to">Tot</Label>
              <Input id="u-to" type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="u-reason">Reden</Label>
          <Input id="u-reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bijv. tentamen, tandarts" />
        </div>
        {clashes.length > 0 && (
          <p className="rounded-md bg-warn/15 p-2 text-xs text-warn-foreground">
            Let op: je staat dan ingepland op {clashes.map((s) => `${s.code} (${s.start}-${s.end})`).join(", ")}. Meld je bij Diensten ook af als je niet kunt.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Bezig..." : "Doorgeven"}
        </Button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-semibold">Al doorgegeven</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nog niets doorgegeven.</p>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {mine.map((u) => (
              <li key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1">
                  <span className="font-medium first-letter:uppercase">{shortDate(u.date)}</span>{" "}
                  {u.from === "00:00" && u.to === "23:59" ? "hele dag" : `${u.from}-${u.to}`}
                  <span className="block text-xs text-muted-foreground">{u.reason}</span>
                </span>
                <RemoveUnavailability id={u.id} actor={actor} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function RemoveUnavailability({ id, actor }: { id: string; actor: Actor }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Verwijderen"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await removeUnavailability(id, actor);
          if ("error" in r) toast.error(r.error);
        })
      }
    >
      <Trash2 />
    </Button>
  );
}
