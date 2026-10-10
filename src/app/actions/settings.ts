"use server";

import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";

export async function updateSettings(p: { noticeDays: number; today: string }): Promise<{ ok: true } | { error: string }> {
  if (!Number.isInteger(p.noticeDays) || p.noticeDays < 0 || p.noticeDays > 60) return { error: "Kies 0 t/m 60 dagen." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.today)) return { error: "Ongeldige datum." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const { error } = await sb.from("workspaces").update({ notice_days: p.noticeDays, today: p.today }).eq("id", ws.id);
  if (error) return { error: "Opslaan mislukt." };
  refresh();
  return { ok: true };
}
