"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "cn";
import type { Client, Employee, PlanData } from "@/lib/types";
import type { ShiftRequest } from "@/lib/data/requests";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCard, type Message } from "@/components/berichten/Outbox";
import { LicenceList } from "@/components/profile/LicenceList";
import { CLIENT_TABS, clientTabFrom, goToClientTab, type ClientTab } from "./tabs";
import { EmptyState } from "@/components/EmptyState";
import { BellOff } from "lucide-react";
import { Locations } from "./Locations";
import { Planning } from "./Planning";
import { Requests } from "./Requests";

interface Props {
  client: Client;
  data: PlanData;
  today: string;
  requests: ShiftRequest[];
  messages: Message[];
}

export function ClientPortal({ client, data, today, requests, messages }: Props) {
  const tab = clientTabFrom(useSearchParams().get("tab"));
  const [profile, setProfile] = useState<Employee | null>(null);
  const myLocations = data.locations.filter((l) => l.clientId === client.id);
  const myIds = new Set(myLocations.map((l) => l.id));
  const myShifts = data.shifts.filter((s) => s.status === "active" && myIds.has(s.locationId));
  const openRequests = requests.filter((r) => r.status === "aangevraagd").length;

  const counts: Partial<Record<ClientTab, number>> = {
    aanvragen: openRequests,
    locaties: myLocations.filter((l) => !l.archived).length,
    meldingen: messages.length,
  };

  return (
    <div className="space-y-4">
      {/* On a phone the sections live in the header menu; the current one is the heading here. */}
      <h2 className="text-lg font-semibold sm:hidden">{CLIENT_TABS.find((x) => x.t === tab)?.label}</h2>
      <div className="hidden gap-1 border-b sm:flex" role="tablist">
        {CLIENT_TABS.map(({ t, label }) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => goToClientTab(t)}
            className={cn(
              "press -mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap",
              tab === t ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {counts[t] ? <span className="ml-1.5 rounded-full bg-muted px-1.5 text-xs">{counts[t]}</span> : null}
          </button>
        ))}
      </div>

      {tab === "planning" && <Planning data={data} today={today} shifts={myShifts} locations={myLocations} onCoach={setProfile} />}
      {tab === "aanvragen" && <Requests client={client} data={data} today={today} requests={requests} onCoach={setProfile} />}
      {tab === "locaties" && <Locations client={client} data={data} today={today} />}
      {tab === "meldingen" &&
        (messages.length === 0 ? (
          <EmptyState icon={BellOff} title="Geen meldingen" />
        ) : (
          <ul className="space-y-2">{messages.map((m, i) => <MessageCard key={m.id} m={m} defaultOpen={i === 0} />)}</ul>
        ))}

      <CoachProfile employee={profile} data={data} today={today} onClose={() => setProfile(null)} />
    </div>
  );
}

/** What a client may see of a coach: first name, functions and whether licences are in order. Nothing else. */
function CoachProfile({ employee, data, today, onClose }: { employee: Employee | null; data: PlanData; today: string; onClose: () => void }) {
  const licences = employee ? (data.licences ?? []).filter((l) => l.employeeId === employee.id) : [];
  return (
    <Dialog open={employee !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {employee && (
          <>
            <DialogHeader>
              <DialogTitle>{employee.name}</DialogTitle>
              <DialogDescription>{employee.functions.join(", ")} bij AllKidz</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Licenties en diploma&apos;s</h3>
              <LicenceList licences={licences} today={today} />
            </div>
            <p className="text-xs text-muted-foreground">
              Je ziet alleen wat nodig is voor de inzet. Achternaam, geboortedatum en BSN deelt AllKidz niet.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
