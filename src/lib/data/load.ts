import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { supabaseServer, type Supabase } from "@/lib/supabase/server";
import type { PackingItem, PlanData, ShiftStatus } from "@/lib/types";

export interface Workspace {
  id: string;
  noticeDays: number;
  today: string;
}

const hhmm = (t: string) => t.slice(0, 5);
const PAGE = 1000;

/** PostgREST returns at most 1000 rows per request; recurring shifts can push a workspace past that. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

export async function getWorkspace(sb: Supabase): Promise<Workspace> {
  const { data, error } = await sb.from("workspaces").select("id, notice_days, today").limit(1).single();
  if (error || !data) throw new Error("Geen demo-omgeving gevonden");
  return { id: data.id, noticeDays: data.notice_days, today: data.today };
}

type ShiftRow = {
  id: string; code: string; date: string; start_time: string; end_time: string; location_id: string;
  function: string; employee_id: string | null; status: string; note: string | null; series_id: string | null;
  extra_requirements: string[] | null; activity_id: string | null; bag_id: string | null;
};

/** The whole workspace (about 300 shifts) in one go; filtering and conflict detection happen in memory. */
export const loadWorkspace = cache(async (): Promise<{ ws: Workspace; data: PlanData }> => {
  // Request-time data (session cookie): never part of the prerendered shell.
  await connection();
  const sb = await supabaseServer();
  const [ws, e, l, t, u, shifts, lic, cl, act, bg, req] = await Promise.all([
    getWorkspace(sb),
    sb.from("employees").select("id, name, functions").order("name"),
    sb.from("locations").select("id, name, type, city, client_id, archived_at").order("name"),
    sb.from("travel_times").select("location_a, location_b, minutes"),
    sb.from("unavailability").select("id, employee_id, date, start_time, end_time, reason").order("date"),
    fetchAll<ShiftRow>((from, to) =>
      sb.from("shifts")
        .select("id, code, date, start_time, end_time, location_id, function, employee_id, status, note, series_id, extra_requirements, activity_id, bag_id")
        .order("code")
        .range(from, to),
    ),
    sb.from("employee_licences").select("employee_id, type, expires_on"),
    sb.from("clients").select("id, name").order("name"),
    sb.from("activities").select("id, name, packing_list").order("name"),
    sb.from("bags").select("id, activity_id, label").order("label"),
    sb.from("workspaces").select("requirements").limit(1).single(),
  ]);
  for (const r of [e, l, t, u, lic, cl, act, bg, req]) if (r.error) throw r.error;
  return {
    ws,
    data: {
      employees: e.data!.map((x) => ({ id: x.id, name: x.name, functions: x.functions })),
      locations: l.data!.map((x) => ({
        id: x.id, name: x.name, type: x.type, city: x.city, clientId: x.client_id, archived: x.archived_at !== null,
      })),
      travel: t.data!.map((x) => ({ a: x.location_a, b: x.location_b, minutes: x.minutes })),
      unavailability: u.data!.map((x) => ({
        id: x.id, employeeId: x.employee_id, date: x.date, from: hhmm(x.start_time), to: hhmm(x.end_time), reason: x.reason,
      })),
      shifts: shifts.map((x) => ({
        id: x.id, code: x.code, date: x.date, start: hhmm(x.start_time), end: hhmm(x.end_time),
        locationId: x.location_id, fn: x.function, employeeId: x.employee_id, status: x.status as ShiftStatus,
        note: x.note, seriesId: x.series_id,
        extraRequirements: x.extra_requirements ?? [], activityId: x.activity_id, bagId: x.bag_id,
      })),
      licences: lic.data!.map((x) => ({ employeeId: x.employee_id, type: x.type, expiresOn: x.expires_on })),
      requirements: (req.data!.requirements ?? {}) as Record<string, string[]>,
      clients: cl.data!,
      activities: act.data!.map((x) => ({ id: x.id, name: x.name, packingList: x.packing_list as PackingItem[] })),
      bags: bg.data!.map((x) => ({ id: x.id, activityId: x.activity_id, label: x.label })),
    },
  };
});
