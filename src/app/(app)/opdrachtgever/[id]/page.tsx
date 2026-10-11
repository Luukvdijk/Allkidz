import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { loadMessages } from "@/lib/data/messages";
import { loadRequests } from "@/lib/data/requests";
import { ClientPortal } from "@/components/opdrachtgever/ClientPortal";
import { ClientSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Opdrachtgever | AllKidz Planning (demo)" };

async function ClientData({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { ws, data } = await loadWorkspace();
  const client = data.clients?.find((c) => c.id === id);
  if (!client) notFound();
  const locationIds = data.locations.filter((l) => l.clientId === client.id).map((l) => l.id);
  const [messages, requests] = await Promise.all([loadMessages(locationIds), loadRequests(client.id)]);
  return (
    <>
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">Opdrachtgeversportaal</p>
        <h1 className="text-xl font-semibold tracking-tight">{client.name}</h1>
      </div>
      <ClientPortal client={client} data={data} today={ws.today} requests={requests} messages={messages} />
    </>
  );
}

export default function ClientPage({ params }: PageProps<"/opdrachtgever/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<ClientSkeleton />}>
        <ClientData params={params} />
      </Suspense>
    </main>
  );
}
