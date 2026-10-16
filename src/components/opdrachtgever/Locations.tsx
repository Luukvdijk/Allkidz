"use client";

import { useState, useTransition } from "react";
import { Archive, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Client, PlanData } from "@/lib/types";
import { addLocation, archiveLocation } from "@/app/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TYPES = ["BSO", "KDV", "TSO", "Zwembad", "School"];

export function Locations({ client, data, today }: { client: Client; data: PlanData; today: string }) {
  const mine = data.locations.filter((l) => l.clientId === client.id);
  const [name, setName] = useState("");
  const [type, setType] = useState("BSO");
  const [city, setCity] = useState("");
  const [archiving, setArchiving] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const future = (id: string) => data.shifts.filter((s) => s.locationId === id && s.status === "active" && s.date >= today).length;
  const target = mine.find((l) => l.id === archiving);

  const add = () =>
    start(async () => {
      const r = await addLocation(client.id, { name, type, city });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success(`${name} toegevoegd`, {
        description: r.travelUnknown
          ? "Nieuwe plaats: reistijden zijn nog onbekend. De planner ziet dat bij het plannen."
          : "Reistijden overgenomen van een locatie in dezelfde plaats.",
      });
      setName("");
      setCity("");
    });

  const archive = () =>
    start(async () => {
      if (!archiving) return;
      const r = await archiveLocation(client.id, archiving);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Gearchiveerd", { description: r.futureShifts ? `${r.futureShifts} geplande diensten blijven staan.` : undefined });
      setArchiving(null);
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <ul className="divide-y rounded-xl border bg-card">
        {mine.map((l) => (
          <li key={l.id} className={cn("flex items-center gap-3 px-4 py-2.5 text-sm", l.archived && "text-muted-foreground")}>
            <span className="flex-1">
              <span className="font-medium">{l.name}</span> · {l.type}, {l.city}
              {l.archived && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">gearchiveerd</span>}
            </span>
            <span className="text-xs tabular-nums">{future(l.id)} gepland</span>
            {!l.archived && (
              <Button size="icon-sm" variant="ghost" aria-label={`${l.name} archiveren`} onClick={() => setArchiving(l.id)}>
                <Archive />
              </Button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="space-y-3 rounded-xl border bg-card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <h2 className="font-semibold">Locatie toevoegen</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="l-name">Naam</Label>
          <Input id="l-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bijv. BSO De Vuurtoren" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="l-type">Type</Label>
            <NativeSelect id="l-type" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="l-city">Plaats</Label>
            <Input id="l-city" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="Bijv. Katwijk" />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          <Plus /> Toevoegen
        </Button>
      </form>

      <Dialog open={archiving !== null} onOpenChange={(o) => !o && setArchiving(null)}>
        <DialogContent>
          {target && (
            <>
              <DialogHeader>
                <DialogTitle>{target.name} archiveren?</DialogTitle>
                <DialogDescription>
                  Je kunt er daarna geen diensten meer aanvragen.{" "}
                  {future(target.id) > 0
                    ? `Er staan nog ${future(target.id)} diensten gepland; die blijven staan tot AllKidz ze aanpast.`
                    : "Er staan geen diensten meer gepland."}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setArchiving(null)}>
                  Terug
                </Button>
                <Button variant="destructive" onClick={archive} disabled={pending}>
                  Archiveren
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
