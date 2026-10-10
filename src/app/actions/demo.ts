"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export async function resetDemo() {
  const supabase = await supabaseServer();
  const { error } = await supabase.rpc("reset_workspace");
  if (error) return { error: "Reset mislukt." };
  refresh();
  return { ok: true as const };
}

export async function logout() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect("/login");
}
