"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export type LoginState = { error?: string };

/**
 * Shared demo login. The credentials are checked on the server; on success the visitor is signed in
 * anonymously, so every login is its own Supabase user with its own freshly seeded workspace.
 */
export async function demoLogin(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const okEmail = same(email, (process.env.DEMO_EMAIL ?? "").toLowerCase());
  const okPassword = same(password, process.env.DEMO_PASSWORD ?? "");
  if (!okEmail || !okPassword || !process.env.DEMO_PASSWORD) return { error: "Onjuiste inloggegevens." };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return { error: "Inloggen lukt nu niet. Probeer het zo opnieuw." };
  const { error: wsError } = await supabase.rpc("create_workspace");
  if (wsError) return { error: "Je demo-omgeving kon niet worden aangemaakt." };
  redirect("/planbord");
}
