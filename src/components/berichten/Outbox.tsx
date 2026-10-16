"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailMessage } from "@/app/actions/messages";
import { EmptyState } from "@/components/EmptyState";

export interface Message {
  id: string;
  at: string;
  subject: string;
  body: string;
  location: string;
  locationId: string;
  emailed_at: string | null;
}

const when = (iso: string) =>
  new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });

export function MessageCard({ m, canEmail = false, defaultOpen = false }: { m: Message; canEmail?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [to, setTo] = useState("");
  const [pending, start] = useTransition();

  const send = () =>
    start(async () => {
      const r = await emailMessage(m.id, to);
      if ("error" in r) toast.error(r.error);
      else {
        toast.success("Verstuurd", { description: "Kijk in je inbox (en eventueel in spam)." });
        setTo("");
      }
    });

  return (
    <li className="rounded-xl border bg-card">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 px-4 py-3 text-left">
        <Mail className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{m.subject}</span>
          <span className="text-xs text-muted-foreground">
            Aan {m.location} · {when(m.at)} · kort dag
            {m.emailed_at && <span className="ml-1.5 rounded-full bg-ok/15 px-1.5 text-ok">ook gemaild</span>}
          </span>
        </span>
        <ChevronDown className={cn("mt-1 size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="border-t px-4 py-3">
          <p className="text-sm whitespace-pre-line text-muted-foreground">{m.body}</p>
          {canEmail && (
            <form
              className="mt-3 flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <label htmlFor={`to-${m.id}`} className="text-sm">
                Stuur ook naar mij:
              </label>
              <Input id={`to-${m.id}`} type="email" required placeholder="jij@voorbeeld.nl" value={to} onChange={(e) => setTo(e.target.value)} className="w-64" />
              <Button type="submit" size="sm" disabled={pending}>
                <Send /> {pending ? "Versturen..." : "Verstuur echt"}
              </Button>
              <p className="w-full text-xs text-muted-foreground">Je adres wordt alleen voor deze e-mail gebruikt en niet opgeslagen. Maximaal 5 per demo.</p>
            </form>
          )}
        </div>
      )}
    </li>
  );
}

export function Outbox({ messages }: { messages: Message[] }) {
  if (messages.length === 0)
    return (
      <EmptyState icon={Mail} title="Nog geen berichten" />
    );
  return (
    <ul className="space-y-2">
      {messages.map((m, i) => (
        <MessageCard key={m.id} m={m} canEmail defaultOpen={i === 0} />
      ))}
    </ul>
  );
}
