"use server";

import { Resend } from "resend";
import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMIT = 5;

/**
 * Sends a client message for real, so a reviewer can see it arrive in their own inbox.
 * The address is used once and never stored; each demo sandbox can send at most LIMIT emails.
 */
export async function emailMessage(messageId: string, to: string): Promise<{ ok: true } | { error: string }> {
  const address = to.trim();
  if (!EMAIL.test(address) || address.length > 200) return { error: "Vul een geldig e-mailadres in." };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) return { error: "E-mail is in deze omgeving niet ingesteld." };
  const sb = await supabaseServer();
  const { data: ws } = await sb.from("workspaces").select("id, emails_sent").limit(1).single();
  if (!ws) return { error: "Geen demo-omgeving." };
  if (ws.emails_sent >= LIMIT) return { error: `Maximaal ${LIMIT} e-mails per demo.` };
  const { data: msg } = await sb.from("client_messages").select("id, subject, body").eq("id", messageId).single();
  if (!msg) return { error: "Bericht niet gevonden." };

  // Count first, so a failing or slow send can never be repeated past the limit.
  const { error: countError } = await sb.from("workspaces").update({ emails_sent: ws.emails_sent + 1 }).eq("id", ws.id);
  if (countError) return { error: "Versturen mislukt." };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM,
    to: address,
    subject: `[Demo] ${msg.subject}`,
    text: `${msg.body}\n\n--\nDit is een demobericht uit de AllKidz planning-demo. Alle gegevens zijn fictief.`,
  });
  if (error) return { error: "Versturen mislukt." };
  await sb.from("client_messages").update({ emailed_at: new Date().toISOString() }).eq("id", msg.id);
  refresh();
  return { ok: true };
}
