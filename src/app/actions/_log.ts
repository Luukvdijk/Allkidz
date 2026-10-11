import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import { buildClientMessage, type ClientAction } from "@/lib/messages";
import { isShortNotice } from "@/lib/notice";
import { actingAs, type Actor } from "@/lib/data/actor";
import type { Workspace } from "@/lib/data/load";

export const SHIFT_COLS =
  "id, code, date, start_time, end_time, function, location_id, employee_id, status, note, extra_requirements, activity_id, bag_id";

export interface ShiftRow {
  id: string;
  code: string;
  date: string;
  start_time: string;
  end_time: string;
  function: string;
  location_id: string;
  employee_id: string | null;
  status: string;
  note: string | null;
  extra_requirements?: string[];
  activity_id?: string | null;
  bag_id?: string | null;
}

export async function logChange(
  sb: Supabase,
  p: {
    ws: Workspace;
    actor: Actor;
    action: string;
    shift?: ShiftRow | null;
    before?: unknown;
    after?: unknown;
    reason?: string | null;
  },
): Promise<string> {
  const { data, error } = await sb
    .from("change_log")
    .insert({
      workspace_id: p.ws.id,
      actor_role: p.actor.role,
      actor_name: p.actor.name,
      acting_as: actingAs(p.actor),
      action: p.action,
      shift_id: p.shift?.id ?? null,
      shift_code: p.shift?.code ?? null,
      before: p.before ?? null,
      after: p.after ?? null,
      reason: p.reason ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Creates a client message when the shift falls within the notice period. Returns whether one was created. */
export async function notifyClientIfShortNotice(
  sb: Supabase,
  p: {
    ws: Workspace;
    logId: string;
    action: ClientAction;
    shift: ShiftRow;
    employeeName: string | null;
    changes?: string;
  },
): Promise<boolean> {
  if (!isShortNotice(p.shift.date, p.ws.today, p.ws.noticeDays)) return false;
  const { data: loc } = await sb.from("locations").select("name").eq("id", p.shift.location_id).single();
  const msg = buildClientMessage({
    action: p.action,
    shift: {
      code: p.shift.code,
      date: p.shift.date,
      start: p.shift.start_time.slice(0, 5),
      end: p.shift.end_time.slice(0, 5),
      fn: p.shift.function,
    },
    locationName: loc?.name ?? "",
    employeeName: p.employeeName,
    changes: p.changes,
  });
  const { error } = await sb.from("client_messages").insert({
    workspace_id: p.ws.id,
    location_id: p.shift.location_id,
    shift_id: p.shift.id,
    change_log_id: p.logId,
    subject: msg.subject,
    body: msg.body,
    short_notice: true,
  });
  if (error) throw error;
  return true;
}

export async function employeeName(sb: Supabase, id: string | null): Promise<string | null> {
  if (!id) return null;
  const { data } = await sb.from("employees").select("name").eq("id", id).single();
  return data?.name ?? null;
}
