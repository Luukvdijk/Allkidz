"use client";

import { useState, useTransition } from "react";
import { Backpack, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { Shift } from "@/lib/types";
import type { Actor } from "@/lib/data/actor";
import { reportMissing } from "@/app/actions/materials";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MissingNotice } from "@/components/bags/MissingNotice";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/components/planbord/PlanContext";

const storageKey = (shiftId: string) => `paklijst:${shiftId}`;

/** "Neem mee": the bag for this shift, its packing list as a checklist (ticks only on this device) and a missing-items report. */
export function BagPanel({ s, actor }: { s: Shift; actor: Actor }) {
  const { data } = usePlan();
  const bag = data.bags?.find((b) => b.id === s.bagId);
  const activity = data.activities?.find((a) => a.id === bag?.activityId);
  const [open, setOpen] = useState(false);
  const [ticked, setTicked] = useState<string[]>([]);
  const [reporting, setReporting] = useState(false);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  if (!bag || !activity) return null;

  const toggleOpen = () => {
    if (!open) {
      try {
        setTicked(JSON.parse(localStorage.getItem(storageKey(s.id)) ?? "[]"));
      } catch {
        setTicked([]);
      }
    }
    setOpen(!open);
  };
  const tick = (item: string, on: boolean) => {
    const next = on ? [...ticked, item] : ticked.filter((x) => x !== item);
    setTicked(next);
    try {
      localStorage.setItem(storageKey(s.id), JSON.stringify(next));
    } catch {
      // storage unavailable (private mode): the checklist still works for this visit
    }
  };
  const send = () =>
    start(async () => {
      const r = await reportMissing(s.id, actor, text);
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      toast.success("Gemeld", { description: "De planner ziet het op het tassenoverzicht." });
      setText("");
      setReporting(false);
    });

  return (
    <div className="mt-2 rounded-lg bg-accent/60 p-2 text-sm">
      <button type="button" onClick={toggleOpen} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <Backpack className="size-4 text-accent-foreground" aria-hidden />
        <span className="flex-1">
          Neem mee: <span className="font-medium">{bag.label}</span>
        </span>
        {open && <span className="text-xs text-muted-foreground tabular-nums">{ticked.length}/{activity.packingList.length}</span>}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      <MissingNotice bagId={bag.id} data={data} className="mt-2" />
      {open && (
        <div className="mt-2 space-y-1.5">
          <ul className="space-y-1">
            {activity.packingList.map((p) => (
              <li key={p.item}>
                <label className="flex items-center gap-2">
                  <Checkbox checked={ticked.includes(p.item)} onCheckedChange={(on) => tick(p.item, Boolean(on))} />
                  <span className={cn(ticked.includes(p.item) && "text-muted-foreground line-through")}>
                    {p.qty}x {p.item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {reporting ? (
            <div className="space-y-1.5">
              <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Bijv. 2 walkietalkies missen" aria-label="Wat mist er?" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setReporting(false)}>
                  Annuleren
                </Button>
                <Button size="sm" onClick={send} disabled={pending || !text.trim()}>
                  Meld aan planner
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" className="w-full" onClick={() => setReporting(true)}>
              Er mist iets
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
