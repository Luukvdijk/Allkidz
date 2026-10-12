import { Suspense } from "react";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { loadMaterialReports } from "@/lib/data/requests";
import { BagBoard } from "@/components/tassen/BagBoard";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Tassen | AllKidz Planning (demo)" };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

async function Board({ searchParams }: { searchParams: Promise<{ d?: string | string[] }> }) {
  const [{ ws, data }, reports, { d }] = await Promise.all([loadWorkspace(), loadMaterialReports(), searchParams]);
  // ?d= opens the day timeline on that date (the dashboard links to the first double booking).
  const start = typeof d === "string" && DATE.test(d) ? d : undefined;
  return <BagBoard data={data} reports={reports} today={ws.today} start={start} />;
}

export default function TassenPage({ searchParams }: PageProps<"/tassen">) {
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sporttassen</h1>
      </div>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <Board searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
