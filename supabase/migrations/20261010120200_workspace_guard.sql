-- One workspace per visitor: calling create_workspace again returns the existing one
-- instead of creating more (prevents filling the database by calling the RPC in a loop).
-- create_workspace and reset_workspace are intentionally callable by signed-in users:
-- they only ever act on the caller's own workspace (advisor 0029 is accepted for these two).
create or replace function public.create_workspace() returns uuid
language plpgsql security definer set search_path = '' as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select id into ws from public.workspaces where owner = auth.uid() limit 1;
  if ws is not null then return ws; end if;
  insert into public.workspaces (owner) values (auth.uid()) returning id into ws;
  perform private.seed_workspace(ws);
  return ws;
end $$;
alter table public.workspaces add constraint workspaces_one_per_owner unique (owner);
drop index if exists public.workspaces_owner;

alter table seed.unavailability add column id bigint generated always as identity primary key;
