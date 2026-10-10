import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import { PageSkeleton } from "@/components/PageSkeleton";
import { SettingsForm } from "./SettingsForm";

export const metadata: Metadata = { title: "Instellingen | AllKidz Planning (demo)" };

async function Settings() {
  await connection();
  const ws = await getWorkspace(await supabaseServer());
  return <SettingsForm noticeDays={ws.noticeDays} today={ws.today} />;
}

export default function InstellingenPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Instellingen</h1>
      <Suspense fallback={<PageSkeleton rows={2} />}>
        <Settings />
      </Suspense>
    </main>
  );
}
