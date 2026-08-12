-- Incident operation timeline and per-user notification inbox.
-- Safe to run after the consolidated production schema.

alter table public.incidents
  add column if not exists departed_base_at timestamptz,
  add column if not exists arrived_scene_at timestamptz,
  add column if not exists transported_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.incidents drop constraint if exists incidents_status_check;
alter table public.incidents
  add constraint incidents_status_check
  check (status in ('open','in_progress','departed','on_scene','transporting','closed','cancelled'))
  not valid;

alter table public.incidents drop constraint if exists incidents_arrived_after_departed_check;
alter table public.incidents
  add constraint incidents_arrived_after_departed_check
  check (
    arrived_scene_at is null
    or (departed_base_at is not null and arrived_scene_at >= departed_base_at)
  ) not valid;

alter table public.incidents drop constraint if exists incidents_transport_after_arrival_check;
alter table public.incidents
  add constraint incidents_transport_after_arrival_check
  check (
    transported_at is null
    or (arrived_scene_at is not null and transported_at >= arrived_scene_at)
  ) not valid;

alter table public.incidents drop constraint if exists incidents_close_after_arrival_check;
alter table public.incidents
  add constraint incidents_close_after_arrival_check
  check (
    closed_at is null
    or (
      arrived_scene_at is not null
      and closed_at >= arrived_scene_at
      and (transported_at is null or closed_at >= transported_at)
    )
  ) not valid;

create table if not exists public.incident_status_events (
  id bigint generated always as identity primary key,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  event_type text not null check (event_type in ('departed_base','arrived_scene','transported','closed')),
  occurred_at timestamptz not null default now(),
  actor_id uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists incident_status_events_incident_time_idx
  on public.incident_status_events(incident_id, occurred_at, id);

alter table public.notifications
  add column if not exists type text not null default 'incident',
  add column if not exists incident_id uuid references public.incidents(id) on delete set null,
  add column if not exists target_station text not null default 'all',
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create table if not exists public.notification_recipients (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (notification_id, user_id)
);

create index if not exists notification_recipients_user_unread_idx
  on public.notification_recipients(user_id, read_at, created_at desc);
create index if not exists notifications_incident_created_idx
  on public.notifications(incident_id, created_at desc);

create or replace function public.record_incident_timeline_event(
  p_incident_id uuid,
  p_event_type text,
  p_occurred_at timestamptz default null,
  p_note text default null
)
returns public.incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  v_incident public.incidents%rowtype;
  v_occurred_at timestamptz := coalesce(p_occurred_at, now());
begin
  if not public.is_active_staff() then
    raise exception 'not authorized';
  end if;

  if p_event_type not in ('departed_base','arrived_scene','transported','closed') then
    raise exception 'invalid incident timeline event';
  end if;

  select * into v_incident
  from public.incidents
  where id = p_incident_id
  for update;

  if not found then
    raise exception 'incident not found';
  end if;

  if v_incident.status = 'cancelled' then
    raise exception 'cancelled incident cannot be updated';
  end if;

  if p_event_type = 'departed_base' then
    if v_incident.departed_base_at is not null then
      raise exception 'departure time already recorded';
    end if;
    if v_incident.status = 'closed' then
      raise exception 'closed incident cannot be updated';
    end if;

    update public.incidents
    set departed_base_at = v_occurred_at,
        status = 'departed'
    where id = p_incident_id;

  elsif p_event_type = 'arrived_scene' then
    if v_incident.departed_base_at is null then
      raise exception 'record departure time first';
    end if;
    if v_incident.arrived_scene_at is not null then
      raise exception 'arrival time already recorded';
    end if;
    if v_occurred_at < v_incident.departed_base_at then
      raise exception 'arrival time cannot be before departure time';
    end if;

    update public.incidents
    set arrived_scene_at = v_occurred_at,
        status = 'on_scene'
    where id = p_incident_id;

  elsif p_event_type = 'transported' then
    if v_incident.arrived_scene_at is null then
      raise exception 'record scene arrival time first';
    end if;
    if v_incident.transported_at is not null then
      raise exception 'transport time already recorded';
    end if;
    if v_incident.status = 'closed' then
      raise exception 'closed incident cannot be updated';
    end if;
    if v_occurred_at < v_incident.arrived_scene_at then
      raise exception 'transport time cannot be before scene arrival time';
    end if;

    update public.incidents
    set transported_at = v_occurred_at,
        status = 'transporting'
    where id = p_incident_id;

  elsif p_event_type = 'closed' then
    if v_incident.arrived_scene_at is null then
      raise exception 'record scene arrival time before closing the incident';
    end if;
    if v_incident.closed_at is not null or v_incident.status = 'closed' then
      raise exception 'incident already closed';
    end if;
    if v_occurred_at < v_incident.arrived_scene_at then
      raise exception 'close time cannot be before scene arrival time';
    end if;
    if v_incident.transported_at is not null and v_occurred_at < v_incident.transported_at then
      raise exception 'close time cannot be before transport time';
    end if;

    update public.incidents
    set closed_at = v_occurred_at,
        status = 'closed'
    where id = p_incident_id;
  end if;

  insert into public.incident_status_events(
    incident_id,
    event_type,
    occurred_at,
    actor_id,
    note
  ) values (
    p_incident_id,
    p_event_type,
    v_occurred_at,
    auth.uid(),
    nullif(btrim(coalesce(p_note, '')), '')
  );

  select * into v_incident from public.incidents where id = p_incident_id;
  return v_incident;
end;
$$;

revoke all on function public.record_incident_timeline_event(uuid,text,timestamptz,text) from public, anon;
grant execute on function public.record_incident_timeline_event(uuid,text,timestamptz,text) to authenticated;

alter table public.incident_status_events enable row level security;
alter table public.notification_recipients enable row level security;

-- Replace the old global notification read policy with per-recipient access.
drop policy if exists "staff read notifications" on public.notifications;
drop policy if exists "users read assigned notifications" on public.notifications;
create policy "users read assigned notifications" on public.notifications
for select to authenticated
using (
  public.is_active_staff()
  and exists (
    select 1
    from public.notification_recipients recipient
    where recipient.notification_id = notifications.id
      and recipient.user_id = auth.uid()
  )
);

drop policy if exists "users read own notification recipients" on public.notification_recipients;
create policy "users read own notification recipients" on public.notification_recipients
for select to authenticated
using (public.is_active_staff() and user_id = auth.uid());

drop policy if exists "users update own notification read state" on public.notification_recipients;
create policy "users update own notification read state" on public.notification_recipients
for update to authenticated
using (public.is_active_staff() and user_id = auth.uid())
with check (public.is_active_staff() and user_id = auth.uid());

drop policy if exists "staff read incident status events" on public.incident_status_events;
create policy "staff read incident status events" on public.incident_status_events
for select to authenticated
using (public.is_active_staff());

grant select on public.notifications to authenticated;
revoke update on public.notification_recipients from authenticated;
grant select on public.notification_recipients to authenticated;
grant update(read_at) on public.notification_recipients to authenticated;
grant select on public.incident_status_events to authenticated;

-- Realtime is used to refresh unread badges and inbox lists immediately.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notification_recipients'
  ) then
    alter publication supabase_realtime add table public.notification_recipients;
  end if;
end $$;
