"use server";

import { refresh } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { getWorkspace } from "@/lib/data/load";
import { travelForNewLocation } from "@/lib/travel-new-location";
import type { Actor } from "@/lib/data/actor";
import { logChange } from "./_log";

const TYPES = ["BSO", "KDV", "TSO", "Zwembad", "School"];

async function clientActor(sb: Awaited<ReturnType<typeof supabaseServer>>, clientId: string): Promise<Actor | null> {
  const { data } = await sb.from("clients").select("id, name").eq("id", clientId).single();
  return data ? { role: "opdrachtgever", name: data.name, clientId } : null;
}

export async function addLocation(
  clientId: string,
  p: { name: string; type: string; city: string },
): Promise<{ ok: true; travelUnknown: boolean } | { error: string }> {
  const name = p.name.trim();
  const city = p.city.trim();
  if (name.length < 3 || name.length > 80) return { error: "Geef de locatie een naam (3 tot 80 tekens)." };
  if (!TYPES.includes(p.type)) return { error: "Kies een type locatie." };
  if (city.length < 2 || city.length > 60) return { error: "Vul een plaats in." };
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const actor = await clientActor(sb, clientId);
  if (!actor) return { error: "Opdrachtgever niet gevonden." };

  const { data: loc, error } = await sb
    .from("locations")
    .insert({ workspace_id: ws.id, name, type: p.type, city, client_id: clientId })
    .select("id, name, type, city")
    .single();
  if (error) return { error: error.code === "23505" ? "Er bestaat al een locatie met deze naam." : "Toevoegen mislukt." };

  const [{ data: locs }, { data: travel }] = await Promise.all([
    sb.from("locations").select("id, name, type, city").neq("id", loc.id),
    sb.from("travel_times").select("location_a, location_b, minutes"),
  ]);
  const t = travelForNewLocation(
    loc.id, city, locs ?? [],
    (travel ?? []).map((x) => ({ a: x.location_a, b: x.location_b, minutes: x.minutes })),
  );
  if (t.travel.length) {
    const { error: tErr } = await sb.from("travel_times").insert(
      t.travel.map((x) => ({ workspace_id: ws.id, location_a: x.a, location_b: x.b, minutes: x.minutes })),
    );
    if (tErr) return { error: "Locatie toegevoegd, maar reistijden opslaan mislukte." };
  }
  await logChange(sb, { ws, actor, action: "location_added", after: { ...loc, travel_unknown: t.unknown } });
  refresh();
  return { ok: true, travelUnknown: t.unknown };
}

/** Archive instead of delete: no new bookings, existing shifts stay visible. Returns how many future shifts remain. */
export async function archiveLocation(clientId: string, id: string): Promise<{ ok: true; futureShifts: number } | { error: string }> {
  const sb = await supabaseServer();
  const ws = await getWorkspace(sb);
  const actor = await clientActor(sb, clientId);
  if (!actor) return { error: "Opdrachtgever niet gevonden." };
  const { data: loc } = await sb.from("locations").select("id, name, client_id, archived_at").eq("id", id).single();
  if (!loc || loc.client_id !== clientId) return { error: "Deze locatie hoort niet bij jouw organisatie." };
  if (loc.archived_at) return { error: "Al gearchiveerd." };
  const { count } = await sb
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("location_id", id)
    .eq("status", "active")
    .gte("date", ws.today);
  const { error } = await sb.from("locations").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "Archiveren mislukt." };
  await logChange(sb, { ws, actor, action: "location_archived", before: loc, reason: `${count ?? 0} geplande diensten blijven staan` });
  refresh();
  return { ok: true, futureShifts: count ?? 0 };
}
