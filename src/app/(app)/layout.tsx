import { Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { AppHeader } from "@/components/AppHeader";
import { loadWorkspace } from "@/lib/data/load";
import { supabaseServer } from "@/lib/supabase/server";

async function Header() {
  const { data } = await loadWorkspace();
  const sb = await supabaseServer();
  const { count } = await sb.from("client_messages").select("id", { count: "exact", head: true });
  return (
    <AppHeader
      employees={data.employees.map((e) => ({ id: e.id, name: e.name }))}
      locations={data.locations.map((l) => ({ id: l.id, name: l.name }))}
      messageCount={count ?? 0}
    />
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Suspense fallback={<div className="h-[53px] border-b" />}>
        <Header />
      </Suspense>
      <div className="flex-1">{children}</div>
      <Toaster position="bottom-center" />
    </div>
  );
}
