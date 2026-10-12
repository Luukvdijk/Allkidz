import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { loadWorkspace } from "@/lib/data/load";
import { loadMaterialReports, loadRequests } from "@/lib/data/requests";
import { supabaseServer } from "@/lib/supabase/server";
import { detectConflicts } from "@/lib/conflicts";
import { dashboardStats } from "@/lib/dashboard";
import { Dashboard } from "@/components/dashboard/Dashboard";
import type { LogEntry } from "@/components/log/LogTimeline";
import { DashboardSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Dashboard | AllKidz Planning (demo)" };

async function DashboardData() {
  // Request-time data (session cookie, today); mark it before the Supabase client is created.
  await connection();
  const sb = await supabaseServer();
  const [{ ws, data }, requests, reports, { data: log }] = await Promise.all([
    loadWorkspace(),
    loadRequests(),
    loadMaterialReports(),
    sb
      .from("change_log")
      .select("id, at, actor_role, actor_name, acting_as, action, shift_code, before, after, reason")
      .order("at", { ascending: false })
      .limit(6),
  ]);
  return (
    <Dashboard
      data={data}
      stats={dashboardStats(data, ws.today, detectConflicts(data))}
      today={ws.today}
      pendingRequests={requests.filter((r) => r.status === "aangevraagd").length}
      missingReports={reports.filter((r) => !r.resolvedAt).length}
      log={(log ?? []) as LogEntry[]}
    />
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardData />
      </Suspense>
    </main>
  );
}
