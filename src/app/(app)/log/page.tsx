import { Suspense } from "react";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { supabaseServer } from "@/lib/supabase/server";
import { LogTimeline, type LogEntry } from "@/components/log/LogTimeline";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Wijzigingslog | AllKidz Planning (demo)" };

async function LogData() {
  const { data } = await loadWorkspace();
  const sb = await supabaseServer();
  const { data: entries, error } = await sb
    .from("change_log")
    .select("id, at, actor_role, actor_name, acting_as, action, shift_code, before, after, reason")
    .order("at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const loc = new Map(data.locations.map((l) => [l.id, l.name]));
  const cancelled = data.shifts
    .filter((s) => s.status === "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    .map((s) => ({ id: s.id, code: s.code, date: s.date, start: s.start, end: s.end, location: loc.get(s.locationId) ?? "", fn: s.fn }));
  return (
    <LogTimeline
      entries={(entries ?? []) as LogEntry[]}
      cancelled={cancelled}
      employeeNames={Object.fromEntries(data.employees.map((e) => [e.id, e.name]))}
      locationNames={Object.fromEntries(data.locations.map((l) => [l.id, l.name]))}
    />
  );
}

export default function LogPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Wijzigingslog</h1>
      </div>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <LogData />
      </Suspense>
    </main>
  );
}
