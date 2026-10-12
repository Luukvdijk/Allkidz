"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import type { PlanData } from "@/lib/types";
import { describeRule, expandRule } from "@/lib/recurrence";
import { shortDate } from "@/lib/time";
import type { ShiftRequest } from "@/lib/data/requests";
import { MissingNotice } from "@/components/bags/MissingNotice";
import { approveRequest, rejectRequest } from "@/app/actions/requests";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/EmptyState";
import { Inbox } from "lucide-react";

const STATUS: Record<ShiftRequest["status"], string> = { aangevraagd: "Open", goedgekeurd: "Goedgekeurd", afgewezen: "Afgewezen" };
const when = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export function RequestInbox({ requests, data }: { requests: ShiftRequest[]; data: PlanData }) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState<ShiftRequest | null>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const client = new Map((data.clients ?? []).map((c) => [c.id, c.name]));
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const act = new Map((data.activities ?? []).map((a) => [a.id, a.name]));
  const names = { client, loc, act };
  const open = requests.filter((r) => r.status === "aangevraagd");
  const done = requests.filter((r) => r.status !== "aangevraagd");

  const approve = (r: ShiftRequest) =>
    start(async () => {
      const res = await approveRequest(r.id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      const first = expandRule(r.rule)[0];
      toast.success("Goedgekeurd: open dienst(en) aangemaakt", {
        description: "Kies op het planbord wie hem doet (Stel iemand voor).",
        action: { label: "Naar planbord", onClick: () => router.push(`/planbord?d=${first}&open=1`) },
      });
    });

  const reject = () =>
    start(async () => {
      if (!rejecting) return;
      const res = await rejectRequest(rejecting.id, reason);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Afgewezen; de opdrachtgever ziet de reden.");
      setRejecting(null);
      setReason("");
    });

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-sm font-semibold">Open aanvragen ({open.length})</h2>
        {open.length === 0 ? (
          <EmptyState icon={Inbox} title="Geen open aanvragen" />
        ) : (
          <ul className="space-y-2">{open.map((r) => <RequestCard key={r.id} r={r} names={names} data={data} pending={pending} onApprove={approve} onReject={setRejecting} />)}</ul>
        )}
      </section>
      {done.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Afgehandeld ({done.length})</h2>
          <ul className="space-y-2 opacity-90">{done.map((r) => <RequestCard key={r.id} r={r} names={names} data={data} pending={pending} onApprove={approve} onReject={setRejecting} />)}</ul>
        </section>
      )}

      <Dialog open={rejecting !== null} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aanvraag afwijzen</DialogTitle>
            <DialogDescription>De reden is zichtbaar voor {rejecting && client.get(rejecting.clientId)}.</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Bijv. op die dagen hebben we geen gymdocent beschikbaar" aria-label="Reden" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Terug
            </Button>
            <Button variant="destructive" onClick={reject} disabled={pending || !reason.trim()}>
              Afwijzen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CardProps {
  data: PlanData;
r: ShiftRequest;
names: { client: Map<string, string>; loc: Map<string, string>; act: Map<string, string> };
pending: boolean;
onApprove: (r: ShiftRequest) => void;
onReject: (r: ShiftRequest) => void;
}

function RequestCard({ r, names, data, pending, onApprove, onReject }: CardProps) {
const { client, loc, act } = names;
  const dates = expandRule(r.rule);
  return (
    <li className={cn("rounded-xl border bg-card p-4", r.status === "aangevraagd" && "border-primary/40")}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{client.get(r.clientId)}</p>
          <p className="text-sm">
            {loc.get(r.locationId)} · {r.fn} · {r.start}-{r.end}
            {r.activityId && <span className="ml-1 rounded bg-accent px-1.5 text-xs text-accent-foreground">{act.get(r.activityId)}</span>}
          </p>
          <p className="text-sm text-muted-foreground">
            {describeRule(r.rule)}: {dates.slice(0, 6).map(shortDate).join(", ")}
            {dates.length > 6 && ` en nog ${dates.length - 6}`}
          </p>
          {r.note && <p className="mt-1 border-l-2 pl-2 text-sm italic">{r.note}</p>}
          {r.status === "afgewezen" && <p className="mt-1 text-sm text-destructive">Reden: {r.reason}</p>}
          {r.status === "aangevraagd" &&
            r.activityId &&
            (data.bags ?? []).filter((b) => b.activityId === r.activityId).map((b) => <MissingNotice key={b.id} bagId={b.id} data={data} className="mt-2" />)}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <span className={cn("rounded-full px-2 py-0.5 font-medium", r.status === "aangevraagd" ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {STATUS[r.status]}
          </span>
          <p className="mt-1">{when(r.createdAt)}</p>
        </div>
      </div>
      {r.status === "aangevraagd" && (
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={() => onApprove(r)} disabled={pending}>
            <Check /> Goedkeuren ({dates.length} {dates.length === 1 ? "dienst" : "diensten"})
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(r)} disabled={pending}>
            <X /> Afwijzen
          </Button>
        </div>
      )}
    </li>
  );
}
