import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { EmployeeApp } from "@/components/medewerker/EmployeeApp";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Medewerker | AllKidz Planning (demo)" };

async function EmployeeData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ws, data } = await loadWorkspace();
  const employee = data.employees.find((e) => e.id === id);
  if (!employee) notFound();
  return (
    <EmployeeApp data={data} ws={ws} employee={employee} />
  );
}

export default function EmployeePage({ params }: PageProps<"/medewerker/[id]">) {
  return (
    <main>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <EmployeeData params={params} />
      </Suspense>
    </main>
  );
}
