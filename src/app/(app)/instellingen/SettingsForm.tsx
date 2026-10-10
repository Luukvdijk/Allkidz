"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/app/actions/settings";

export function SettingsForm({ noticeDays, today }: { noticeDays: number; today: string }) {
  const [days, setDays] = useState(String(noticeDays));
  const [date, setDate] = useState(today);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateSettings({ noticeDays: Number(days), today: date });
          if ("error" in r) toast.error(r.error);
          else toast.success("Instellingen opgeslagen");
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="notice">Meldingstermijn opdrachtgever (dagen)</Label>
        <Input id="notice" type="number" min={0} max={60} value={days} onChange={(e) => setDays(e.target.value)} className="w-32" />
        <p className="text-sm text-muted-foreground">
          Wijzigingen aan diensten binnen dit aantal dagen sturen automatisch een bericht naar de opdrachtgever. Wijzigingen daarna komen alleen in het
          wijzigingslog. AllKidz moet deze grens nog bepalen, daarom is hij instelbaar.
        </p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="today">Demodatum (vandaag)</Label>
        <Input id="today" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
        <p className="text-sm text-muted-foreground">
          De testdata gaat over 19 t/m 23 oktober 2026. De demo doet alsof het vandaag deze datum is, zodat de meldingstermijn altijd hetzelfde werkt,
          wanneer je de demo ook bekijkt.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Opslaan..." : "Opslaan"}
      </Button>
    </form>
  );
}
