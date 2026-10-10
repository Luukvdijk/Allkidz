import { Suspense } from "react";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import { Outbox } from "@/components/berichten/Outbox";
import { loadMessages } from "@/lib/data/messages";
import { PageSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Berichten | AllKidz Planning (demo)" };

async function OutboxData() {
  const messages = await loadMessages();
  const ws = await getWorkspace(await supabaseServer());
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Bij wijzigingen binnen {ws.noticeDays} dagen krijgt de opdrachtgever automatisch een bericht. Wijzigingen ruim van tevoren komen alleen in het
        wijzigingslog. De grens stel je in bij Instellingen.
      </p>
      <Outbox messages={messages} />
    </>
  );
}

export default function BerichtenPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Berichten aan opdrachtgevers</h1>
      <Suspense fallback={<PageSkeleton rows={3} />}>
        <OutboxData />
      </Suspense>
    </main>
  );
}
