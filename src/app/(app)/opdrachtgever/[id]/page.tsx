import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { loadMessages } from "@/lib/data/messages";
import { ClientView } from "@/components/opdrachtgever/ClientView";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Opdrachtgever | AllKidz Planning (demo)" };

async function ClientData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data }, messages] = await Promise.all([loadWorkspace(), loadMessages(id)]);
  const location = data.locations.find((l) => l.id === id);
  if (!location) notFound();
  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Opdrachtgever-weergave (alleen lezen)</p>
        <h1 className="text-xl font-semibold tracking-tight">
          {location.name} <span className="font-normal text-muted-foreground">· {location.type}, {location.city}</span>
        </h1>
      </div>
      <ClientView data={data} location={location} messages={messages} />
    </>
  );
}

export default function ClientPage({ params }: PageProps<"/opdrachtgever/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<PageSkeleton rows={4} />}>
        <ClientData params={params} />
      </Suspense>
    </main>
  );
}
