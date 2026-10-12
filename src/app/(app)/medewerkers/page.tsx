import { Suspense } from "react";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { EmployeesTable } from "@/components/medewerkers/EmployeesTable";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Medewerkers | AllKidz Planning (demo)" };

async function Table() {
  const { ws, data } = await loadWorkspace();
  return <EmployeesTable data={data} today={ws.today} />;
}

export default function MedewerkersPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Medewerkers en licenties</h1>
      </div>
      <Suspense fallback={<PageSkeleton rows={6} />}>
        <Table />
      </Suspense>
    </main>
  );
}
