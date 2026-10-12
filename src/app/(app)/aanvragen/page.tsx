import { Suspense } from "react";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { loadRequests } from "@/lib/data/requests";
import { RequestInbox } from "@/components/aanvragen/RequestInbox";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Aanvragen | AllKidz Planning (demo)" };

async function Inbox() {
  const [{ data }, requests] = await Promise.all([loadWorkspace(), loadRequests()]);
  return <RequestInbox requests={requests} data={data} />;
}

export default function AanvragenPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aanvragen van opdrachtgevers</h1>
      </div>
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <Inbox />
      </Suspense>
    </main>
  );
}
