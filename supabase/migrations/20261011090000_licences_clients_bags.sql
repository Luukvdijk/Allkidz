-- Extension: licences, client organisations with locations and requests, activities and sport bags.
-- Backward compatible: only new tables and nullable/defaulted columns, so the code on main keeps working.

-- Canonical self-made extra data (filled by the generated seed migration), not exposed through the API.
create table seed.clients (name text primary key);
create table seed.client_locations (client text not null references seed.clients, location text primary key);
create table seed.employee_licences (employee text not null, type text not null, expires_on date, primary key (employee, type));
create table seed.activities (name text primary key, packing_list jsonb not null);
create table seed.bags (label text primary key, activity text not null references seed.activities);
create table seed.shift_extras (code text primary key, activity text, bag text, extra_requirements text[] not null default '{}');
create table seed.requests (
  id int generated always as identity primary key, client text not null, location text not null, rule jsonb not null,
  start_time time not null, end_time time not null, function text not null, activity text, note text
);
create table seed.requirements (location_type text primary key, licences text[] not null);

-- Workspace-scoped tables
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  unique (workspace_id, name)
);
alter table public.locations
  add column client_id uuid references public.clients on delete set null,
  add column archived_at timestamptz;
create index locations_client on public.locations (client_id);

create table public.employee_licences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  employee_id uuid not null references public.employees on delete cascade,
  type text not null,
  expires_on date,
  unique (employee_id, type)
);
create index employee_licences_ws on public.employee_licences (workspace_id);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  packing_list jsonb not null default '[]',
  unique (workspace_id, name)
);
create table public.bags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  activity_id uuid not null references public.activities on delete cascade,
  label text not null,
  unique (workspace_id, label)
);
create index bags_activity on public.bags (activity_id);

alter table public.shifts
  add column extra_requirements text[] not null default '{}',
  add column activity_id uuid references public.activities on delete set null,
  add column bag_id uuid references public.bags on delete set null;
create index shifts_activity on public.shifts (activity_id);
create index shifts_bag on public.shifts (bag_id);

alter table public.workspaces add column requirements jsonb not null default '{}';

create table public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  client_id uuid not null references public.clients on delete cascade,
  location_id uuid not null references public.locations on delete cascade,
  rule jsonb not null,
  start_time time not null,
  end_time time not null,
  function text not null,
  activity_id uuid references public.activities on delete set null,
  note text,
  status text not null default 'aangevraagd' check (status in ('aangevraagd', 'goedgekeurd', 'afgewezen')),
  reason text,
  shift_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  check (end_time > start_time),
  check (status <> 'afgewezen' or length(trim(coalesce(reason, ''))) > 0)
);
create index shift_requests_ws on public.shift_requests (workspace_id, created_at desc);
create index shift_requests_client on public.shift_requests (client_id);
create index shift_requests_location on public.shift_requests (location_id);
create index shift_requests_activity on public.shift_requests (activity_id);

create table public.material_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  bag_id uuid not null references public.bags on delete cascade,
  shift_id uuid references public.shifts on delete set null,
  employee_id uuid references public.employees on delete set null,
  text text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index material_reports_ws on public.material_reports (workspace_id, created_at desc);
create index material_reports_bag on public.material_reports (bag_id);
create index material_reports_shift on public.material_reports (shift_id);
create index material_reports_employee on public.material_reports (employee_id);

-- New log actions
alter table public.change_log drop constraint change_log_action_check;
alter table public.change_log add constraint change_log_action_check check (action in (
  'shift_created', 'shift_updated', 'shift_cancelled', 'employee_removed', 'employee_assigned', 'employee_cancelled_self',
  'availability_changed', 'open_shift_accepted',
  'request_created', 'request_approved', 'request_rejected', 'location_added', 'location_archived',
  'material_reported', 'material_resolved', 'bag_changed'));
alter table public.change_log add column actor_client text;

-- RLS: own workspace only
do $$
declare t text;
begin
  foreach t in array array['clients', 'employee_licences', 'activities', 'bags', 'shift_requests', 'material_reports'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (workspace_id = (select private.my_workspace())) with check (workspace_id = (select private.my_workspace()))',
      t || '_own', t);
  end loop;
end $$;
alter table public.change_log drop constraint change_log_actor_role_check;
alter table public.change_log add constraint change_log_actor_role_check check (actor_role in ('planner', 'medewerker', 'opdrachtgever', 'systeem'));

-- Seeding now also fills the extension
create or replace function private.seed_workspace(ws uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.client_messages where workspace_id = ws;
  delete from public.change_log where workspace_id = ws;
  delete from public.material_reports where workspace_id = ws;
  delete from public.shift_requests where workspace_id = ws;
  delete from public.shifts where workspace_id = ws;
  delete from public.shift_series where workspace_id = ws;
  delete from public.unavailability where workspace_id = ws;
  delete from public.travel_times where workspace_id = ws;
  delete from public.employee_licences where workspace_id = ws;
  delete from public.bags where workspace_id = ws;
  delete from public.activities where workspace_id = ws;
  delete from public.employees where workspace_id = ws;
  delete from public.locations where workspace_id = ws;
  delete from public.clients where workspace_id = ws;
  update public.workspaces set notice_days = 7, today = '2026-10-16',
    requirements = coalesce((select jsonb_object_agg(location_type, to_jsonb(licences)) from seed.requirements), '{}')
  where id = ws;

  insert into public.clients (workspace_id, name) select ws, name from seed.clients;
  insert into public.employees (workspace_id, name, functions) select ws, name, functions from seed.employees;
  insert into public.locations (workspace_id, name, type, city, client_id)
    select ws, l.name, l.type, l.city, c.id from seed.locations l
    left join seed.client_locations cl on cl.location = l.name
    left join public.clients c on c.workspace_id = ws and c.name = cl.client;
  insert into public.travel_times (workspace_id, location_a, location_b, minutes)
    select ws, la.id, lb.id, t.minutes from seed.travel t
    join public.locations la on la.workspace_id = ws and la.name = t.a
    join public.locations lb on lb.workspace_id = ws and lb.name = t.b;
  insert into public.unavailability (workspace_id, employee_id, date, start_time, end_time, reason)
    select ws, e.id, u.date, u.start_time, u.end_time, u.reason from seed.unavailability u
    join public.employees e on e.workspace_id = ws and e.name = u.employee;
  insert into public.employee_licences (workspace_id, employee_id, type, expires_on)
    select ws, e.id, l.type, l.expires_on from seed.employee_licences l
    join public.employees e on e.workspace_id = ws and e.name = l.employee;
  insert into public.activities (workspace_id, name, packing_list) select ws, name, packing_list from seed.activities;
  insert into public.bags (workspace_id, activity_id, label)
    select ws, a.id, b.label from seed.bags b join public.activities a on a.workspace_id = ws and a.name = b.activity;
  insert into public.shifts (workspace_id, code, date, start_time, end_time, location_id, function, employee_id, note,
                             activity_id, bag_id, extra_requirements)
    select ws, s.code, s.date, s.start_time, s.end_time, l.id, s.function, e.id, s.note, a.id, b.id, coalesce(x.extra_requirements, '{}')
    from seed.shifts s
    join public.locations l on l.workspace_id = ws and l.name = s.location
    left join public.employees e on e.workspace_id = ws and e.name = s.employee
    left join seed.shift_extras x on x.code = s.code
    left join public.activities a on a.workspace_id = ws and a.name = x.activity
    left join public.bags b on b.workspace_id = ws and b.label = x.bag;
  insert into public.shift_requests (workspace_id, client_id, location_id, rule, start_time, end_time, function, activity_id, note)
    select ws, c.id, l.id, r.rule, r.start_time, r.end_time, r.function, a.id, r.note from seed.requests r
    join public.clients c on c.workspace_id = ws and c.name = r.client
    join public.locations l on l.workspace_id = ws and l.name = r.location
    left join public.activities a on a.workspace_id = ws and a.name = r.activity
    order by r.id;
end $$;
revoke all on function private.seed_workspace(uuid) from public, anon, authenticated;

-- Covering indexes for the seed foreign keys (performance advisor)
create index seed_bags_activity on seed.bags (activity);
create index seed_client_locations_client on seed.client_locations (client);
