import { Suspense } from "react";
import type { Metadata } from "next";
import { loadWorkspace } from "@/lib/data/load";
import { Planbord } from "@/components/planbord/Planbord";
import { PlanbordSkeleton } from "@/components/PageSkeleton";

export const metadata: Metadata = { title: "Planbord | AllKidz Planning (demo)" };

async function PlanbordData() {
  const { ws, data } = await loadWorkspace();
  return <Planbord data={data} ws={ws} />;
}

export default function PlanbordPage() {
  return (
    <Suspense fallback={<PlanbordSkeleton />}>
      <PlanbordData />
    </Suspense>
  );
}
