import "server-only";
import { connection } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { RecurrenceRule } from "@/lib/recurrence";

export interface ShiftRequest {
  id: string;
  clientId: string;
  locationId: string;
  rule: RecurrenceRule;
  start: string;
  end: string;
  fn: string;
  activityId: string | null;
  note: string | null;
  status: "aangevraagd" | "goedgekeurd" | "afgewezen";
  reason: string | null;
  shiftIds: string[];
  createdAt: string;
}

export async function loadRequests(clientId?: string): Promise<ShiftRequest[]> {
  await connection();
  const sb = await supabaseServer();
  let q = sb
    .from("shift_requests")
    .select("id, client_id, location_id, rule, start_time, end_time, function, activity_id, note, status, reason, shift_ids, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id, clientId: r.client_id, locationId: r.location_id, rule: r.rule as RecurrenceRule,
    start: r.start_time.slice(0, 5), end: r.end_time.slice(0, 5), fn: r.function, activityId: r.activity_id,
    note: r.note, status: r.status, reason: r.reason, shiftIds: r.shift_ids ?? [], createdAt: r.created_at,
  }));
}

export interface MaterialReport {
  id: string;
  bagId: string;
  shiftId: string | null;
  employeeId: string | null;
  text: string;
  createdAt: string;
  resolvedAt: string | null;
}

export async function loadMaterialReports(): Promise<MaterialReport[]> {
  await connection();
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from("material_reports")
    .select("id, bag_id, shift_id, employee_id, text, created_at, resolved_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id, bagId: m.bag_id, shiftId: m.shift_id, employeeId: m.employee_id, text: m.text,
    createdAt: m.created_at, resolvedAt: m.resolved_at,
  }));
}
