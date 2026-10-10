import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { EmployeeApp } from "@/components/medewerker/EmployeeApp";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Medewerker-app | AllKidz Planning (demo)" };

async function EmployeeData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ws, data } = await loadWorkspace();
  const employee = data.employees.find((e) => e.id === id);
  if (!employee) notFound();
  return (
    <>
      <p className="mb-3 hidden text-center text-sm text-muted-foreground sm:block">
        Zo ziet {employee.name} de app op de telefoon. Wat {employee.name} hier doet, zie je direct terug op het planbord en in het wijzigingslog.
      </p>
      <EmployeeApp data={data} ws={ws} employee={employee} />
    </>
  );
}

export default function EmployeePage({ params }: PageProps<"/medewerker/[id]">) {
  return (
    <main className="px-0 py-0 sm:px-4 sm:py-6">
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <EmployeeData params={params} />
      </Suspense>
    </main>
  );
}
