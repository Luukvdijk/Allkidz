import { Suspense } from "react";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { loadMaterialReports } from "@/lib/data/requests";
import { BagBoard } from "@/components/tassen/BagBoard";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Tassen | AllKidz Planning (demo)" };

async function Board() {
  const [{ data }, reports] = await Promise.all([loadWorkspace(), loadMaterialReports()]);
  return <BagBoard data={data} reports={reports} />;
}

export default function TassenPage() {
  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Sporttassen</h1>
        <p className="text-sm text-muted-foreground">Een tas gaat de hele dag mee met de coach. Twee coaches met dezelfde tas op een dag is een dubbele boeking.</p>
      </div>
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <Board />
      </Suspense>
    </main>
  );
}
