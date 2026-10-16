"use client";

import type { Employee } from "@/lib/types";
import { LicenceList } from "@/components/profile/LicenceList";
import { usePlan } from "@/components/planbord/PlanContext";

export function Profile({ employee }: { employee: Employee }) {
  const { data, ws } = usePlan();
  const licences = (data.licences ?? []).filter((l) => l.employeeId === employee.id);
  return (
    <div className="space-y-4 md:grid md:grid-cols-2 md:items-start md:gap-6 md:space-y-0">
      <section className="rounded-xl border bg-card p-3 md:p-4">
        <h2 className="text-sm font-semibold">{employee.name}</h2>
        <p className="text-sm text-muted-foreground">{employee.functions.join(", ")}</p>
      </section>
      <section className="rounded-xl border bg-card p-3 md:p-4">
        <h2 className="mb-2 text-sm font-semibold">Mijn licenties</h2>
        <LicenceList licences={licences} today={ws.today} />
        <p className="mt-3 text-xs text-muted-foreground">
          Opdrachtgevers zien alleen je voornaam, functies en of je licenties in orde zijn. Nooit je achternaam, geboortedatum of BSN.
        </p>
      </section>
    </div>
  );
}
