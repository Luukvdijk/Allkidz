-- AllKidz planning demo: schema, row level security, seeding and cleanup.
-- Every visitor (anonymous auth user) owns exactly one workspace with a private copy of the test data.

create extension if not exists pg_cron;
create schema if not exists seed;
create schema if not exists private;
revoke all on schema seed, private from public, anon, authenticated;

-- Canonical test data, filled by the generated seed migration. Not exposed through the API.
create table seed.employees (name text primary key, functions text[] not null);
create table seed.locations (name text primary key, type text not null, city text not null);
create table seed.travel (a text not null, b text not null, minutes int not null, primary key (a, b));
create table seed.unavailability (employee text not null, date date not null, start_time time not null, end_time time not null, reason text not null);
create table seed.shifts (
  code text primary key, date date not null, employee text, location text not null,
  start_time time not null, end_time time not null, function text not null, note text
);

-- Workspace-scoped tables
create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  notice_days int not null default 7 check (notice_days between 0 and 60),
  today date not null default '2026-10-16',
  emails_sent int not null default 0
);
create index workspaces_owner on public.workspaces (owner);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null,
  functions text[] not null default '{}',
  unique (workspace_id, name)
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  name text not null, type text not null, city text not null,
  unique (workspace_id, name)
);

create table public.travel_times (
  workspace_id uuid not null references public.workspaces on delete cascade,
  location_a uuid not null references public.locations on delete cascade,
  location_b uuid not null references public.locations on delete cascade,
  minutes int not null check (minutes >= 0),
  primary key (workspace_id, location_a, location_b)
);
create index travel_times_a on public.travel_times (location_a);
create index travel_times_b on public.travel_times (location_b);

create table public.unavailability (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  employee_id uuid not null references public.employees on delete cascade,
  date date not null, start_time time not null, end_time time not null,
  reason text not null,
  source text not null default 'planner' check (source in ('planner', 'medewerker')),
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index unavailability_ws on public.unavailability (workspace_id);
create index unavailability_emp on public.unavailability (employee_id);

create table public.shift_series (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  rule jsonb not null,
  description text not null,
  created_at timestamptz not null default now()
);
create index shift_series_ws on public.shift_series (workspace_id);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  code text not null,
  date date not null, start_time time not null, end_time time not null,
  location_id uuid not null references public.locations on delete restrict,
  function text not null,
  employee_id uuid references public.employees on delete set null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  note text,
  series_id uuid references public.shift_series on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, code),
  check (end_time > start_time)
);
create index shifts_ws_date_emp on public.shifts (workspace_id, date, employee_id);
create index shifts_location on public.shifts (location_id);
create index shifts_employee on public.shifts (employee_id);
create index shifts_series on public.shifts (series_id);

create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  at timestamptz not null default now(),
  actor_role text not null check (actor_role in ('planner', 'medewerker', 'systeem')),
  actor_name text not null,
  acting_as text,
  action text not null check (action in ('shift_created', 'shift_updated', 'shift_cancelled', 'employee_removed',
    'employee_assigned', 'employee_cancelled_self', 'availability_changed', 'open_shift_accepted')),
  shift_id uuid references public.shifts on delete set null,
  shift_code text,
  before jsonb,
  after jsonb,
  reason text,
  -- removing someone or something always needs a reason
  check (action not in ('shift_cancelled', 'employee_removed', 'employee_cancelled_self')
         or length(trim(coalesce(reason, ''))) > 0)
);
create index change_log_ws_at on public.change_log (workspace_id, at desc);
create index change_log_shift on public.change_log (shift_id);

create table public.client_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces on delete cascade,
  at timestamptz not null default now(),
  location_id uuid not null references public.locations on delete cascade,
  shift_id uuid references public.shifts on delete set null,
  change_log_id uuid references public.change_log on delete set null,
  subject text not null,
  body text not null,
  short_notice boolean not null,
  emailed_at timestamptz
);
create index client_messages_ws_at on public.client_messages (workspace_id, at desc);
create index client_messages_location on public.client_messages (location_id);
create index client_messages_shift on public.client_messages (shift_id);
create index client_messages_log on public.client_messages (change_log_id);

-- Row level security: you only ever see your own workspace.
create or replace function private.my_workspace() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.workspaces where owner = (select auth.uid()) order by created_at desc limit 1
$$;
grant usage on schema private to authenticated;
revoke all on function private.my_workspace() from public, anon;
grant execute on function private.my_workspace() to authenticated;

alter table public.workspaces enable row level security;
create policy workspaces_select on public.workspaces for select to authenticated
  using (owner = (select auth.uid()));
create policy workspaces_update on public.workspaces for update to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array['employees', 'locations', 'travel_times', 'unavailability', 'shift_series', 'shifts', 'client_messages'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (workspace_id = (select private.my_workspace())) with check (workspace_id = (select private.my_workspace()))',
      t || '_own', t);
  end loop;
end $$;

-- change_log is append-only: no update or delete for anyone through the API.
alter table public.change_log enable row level security;
create policy change_log_select on public.change_log for select to authenticated
  using (workspace_id = (select private.my_workspace()));
create policy change_log_insert on public.change_log for insert to authenticated
  with check (workspace_id = (select private.my_workspace()));
revoke update, delete, truncate on public.change_log from anon, authenticated;

revoke all on all tables in schema public from anon;

-- Seeding: (re)fill one workspace from the canonical test data.
create or replace function private.seed_workspace(ws uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.client_messages where workspace_id = ws;
  delete from public.change_log where workspace_id = ws;
  delete from public.shifts where workspace_id = ws;
  delete from public.shift_series where workspace_id = ws;
  delete from public.unavailability where workspace_id = ws;
  delete from public.travel_times where workspace_id = ws;
  delete from public.employees where workspace_id = ws;
  delete from public.locations where workspace_id = ws;
  update public.workspaces set notice_days = 7, today = '2026-10-16' where id = ws;

  insert into public.employees (workspace_id, name, functions)
    select ws, name, functions from seed.employees;
  insert into public.locations (workspace_id, name, type, city)
    select ws, name, type, city from seed.locations;
  insert into public.travel_times (workspace_id, location_a, location_b, minutes)
    select ws, la.id, lb.id, t.minutes from seed.travel t
    join public.locations la on la.workspace_id = ws and la.name = t.a
    join public.locations lb on lb.workspace_id = ws and lb.name = t.b;
  insert into public.unavailability (workspace_id, employee_id, date, start_time, end_time, reason)
    select ws, e.id, u.date, u.start_time, u.end_time, u.reason from seed.unavailability u
    join public.employees e on e.workspace_id = ws and e.name = u.employee;
  insert into public.shifts (workspace_id, code, date, start_time, end_time, location_id, function, employee_id, note)
    select ws, s.code, s.date, s.start_time, s.end_time, l.id, s.function, e.id, s.note from seed.shifts s
    join public.locations l on l.workspace_id = ws and l.name = s.location
    left join public.employees e on e.workspace_id = ws and e.name = s.employee;
end $$;
revoke all on function private.seed_workspace(uuid) from public, anon, authenticated;

create or replace function public.create_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into public.workspaces (owner) values (auth.uid()) returning id into ws;
  perform private.seed_workspace(ws);
  return ws;
end $$;

create or replace function public.reset_workspace() returns void
language plpgsql security definer set search_path = '' as $$
declare ws uuid := private.my_workspace();
begin
  if ws is null then raise exception 'no workspace'; end if;
  perform private.seed_workspace(ws);
end $$;

revoke all on function public.create_workspace(), public.reset_workspace() from public, anon;
grant execute on function public.create_workspace(), public.reset_workspace() to authenticated;

-- Cleanup: demo sandboxes and their anonymous users disappear after 7 days.
select cron.schedule('cleanup-demo-sandboxes', '17 3 * * *', $$
  delete from public.workspaces where created_at < now() - interval '7 days';
  delete from auth.users where is_anonymous and created_at < now() - interval '7 days';
$$);
