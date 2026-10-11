import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { supabaseServer } from "@/lib/supabase/server";
import { detectConflicts } from "@/lib/conflicts";
import { employeeStats } from "@/lib/employeeStats";
import { EmployeeOverview } from "@/components/medewerkers/EmployeeOverview";
import type { LogEntry } from "@/components/log/LogTimeline";
import { EmployeeDetailSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Medewerker | AllKidz Planning (demo)" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // The id goes into the log filter below, so only a real uuid gets that far.
  if (!UUID.test(id)) notFound();
  const { ws, data } = await loadWorkspace();
  const employee = data.employees.find((e) => e.id === id);
  if (!employee) notFound();

  const sb = await supabaseServer();
  const { data: log } = await sb
    .from("change_log")
    .select("id, at, actor_role, actor_name, acting_as, action, shift_code, before, after, reason")
    .or(`before->>employee_id.eq.${id},after->>employee_id.eq.${id}`)
    .order("at", { ascending: false })
    .limit(6);

  const stats = employeeStats(data, id, ws.today, detectConflicts(data));
  return <EmployeeOverview employee={employee} data={data} stats={stats} today={ws.today} log={(log ?? []) as LogEntry[]} />;
}

export default function EmployeeDetailPage({ params }: PageProps<"/medewerkers/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<EmployeeDetailSkeleton />}>
        <EmployeeDetail params={params} />
      </Suspense>
    </main>
  );
}
