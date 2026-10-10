import "server-only";
import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Message } from "@/components/berichten/Outbox";

export async function loadMessages(locationId?: string): Promise<Message[]> {
  await connection();
  const sb = await supabaseServer();
  let q = sb
    .from("client_messages")
    .select("id, at, subject, body, emailed_at, location_id, locations(name)")
    .order("at", { ascending: false })
    .limit(200);
  if (locationId) q = q.eq("location_id", locationId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id, at: m.at, subject: m.subject, body: m.body, emailed_at: m.emailed_at, locationId: m.location_id,
    location: (m.locations as unknown as { name: string } | null)?.name ?? "",
  }));
}
