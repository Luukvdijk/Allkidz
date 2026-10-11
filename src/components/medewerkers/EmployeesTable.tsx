"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { PlanData } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { LicenceList, licenceStatus } from "@/components/profile/LicenceList";

/** All employees with functions and licences; expired licences red, expiring within 30 days orange. */
export function EmployeesTable({ data, today }: { data: PlanData; today: string }) {
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.employees
      .map((e) => {
        const lic = (data.licences ?? []).filter((l) => l.employeeId === e.id);
        const worst = lic.some((l) => licenceStatus(l, today) === "expired") ? 2 : lic.some((l) => licenceStatus(l, today) === "soon") ? 1 : 0;
        return { e, lic, worst };
      })
      .filter(({ e, lic }) => !needle || `${e.name} ${e.functions.join(" ")} ${lic.map((l) => l.type).join(" ")}`.toLowerCase().includes(needle))
      .sort((a, b) => b.worst - a.worst || a.e.name.localeCompare(b.e.name));
  }, [data, q, today]);

  return (
    <div className="space-y-3">
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek naam, functie of licentie" aria-label="Zoek medewerkers" className="pl-8" />
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {rows.map(({ e, lic }) => (
          <li key={e.id} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[10rem_12rem_1fr] sm:items-center">
            <span className="font-medium">{e.name}</span>
            <span className="text-sm text-muted-foreground">{e.functions.join(", ")}</span>
            <LicenceList licences={lic} today={today} />
          </li>
        ))}
      </ul>
    </div>
  );
}
