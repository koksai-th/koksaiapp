-- Production hardening for a closed, staff-only deployment.
-- Run after the existing migrations.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists is_volunteer boolean not null default false,
  add column if not exists rescue_station text,
  add column if not exists is_active boolean not null default true,
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles alter column is_active set default false;

-- Registration is completed by a security-definer trigger. The browser never
-- assigns its own role or activates its own account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_volunteer boolean := lower(coalesce(new.raw_user_meta_data->>'is_volunteer', 'false'))
    in ('true', '1', 'yes', 'on');
  v_rescue_station text := nullif(btrim(new.raw_user_meta_data->>'rescue_station'), '');
begin
  insert into public.profiles(
    id, username, email, full_name, phone, role,
    is_volunteer, rescue_station, is_active
  )
  values (
    new.id,
    nullif(lower(btrim(new.raw_user_meta_data->>'username')), ''),
    new.email,
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), ''),
    'user',
    v_is_volunteer,
    case when v_is_volunteer then v_rescue_station else null end,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.get_email_by_username(input_username text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select email from public.profiles
  where lower(username) = lower(btrim(input_username))
    and is_active = true
  limit 1;
$$;
revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_username(text) to anon, authenticated;

create or replace function public.is_username_available(input_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    btrim(coalesce(input_username, '')) ~ '^[A-Za-z0-9._-]{6,}$'
    and not exists (
      select 1 from public.profiles
      where lower(username) = lower(btrim(input_username))
    );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

alter table public.incidents
  add column if not exists status text not null default 'open',
  add column if not exists details text,
  add column if not exists reporter_phone text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

alter table public.device_tokens
  add column if not exists platform text not null default 'web',
  add column if not exists rescue_station text not null default 'all',
  add column if not exists last_seen_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists device_tokens_token_key on public.device_tokens(token);
create index if not exists device_tokens_user_active_idx on public.device_tokens(user_id, is_active);
create index if not exists incidents_date_time_idx on public.incidents(incident_date desc, incident_time desc);
create index if not exists incidents_status_idx on public.incidents(status);

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and is_active = true
  limit 1;
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and is_active = true
        and role in ('admin', 'boss', 'station', 'volunteer')
    ),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active = true and role = 'admin'
    ),
    false
  );
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.is_active_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- Keep all registered devices aligned with account status and assigned station.
create or replace function public.sync_profile_device_tokens()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rescue_station is distinct from old.rescue_station then
    update public.device_tokens
    set rescue_station = coalesce(nullif(new.rescue_station, ''), 'all'), updated_at = now()
    where user_id = new.id;
  end if;

  if new.is_active = false or new.role not in ('admin', 'boss', 'station', 'volunteer') then
    update public.device_tokens
    set is_active = false, updated_at = now()
    where user_id = new.id;
  end if;

  return new;
end;
$$;
revoke all on function public.sync_profile_device_tokens() from public;

drop trigger if exists trg_profiles_sync_device_tokens on public.profiles;
create trigger trg_profiles_sync_device_tokens
  after update of is_active, role, rescue_station on public.profiles
  for each row execute function public.sync_profile_device_tokens();

-- Use one atomic sequence source instead of calculating the next case ID in the browser.
create or replace function public.next_case_id(p_incident_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buddhist_year integer;
  v_next_number integer;
begin
  if not public.is_active_staff() then
    raise exception 'not authorized';
  end if;

  v_buddhist_year := extract(year from coalesce(p_incident_date, current_date))::integer + 543;

  insert into public.case_sequences (buddhist_year, last_number)
  values (v_buddhist_year, 1)
  on conflict (buddhist_year)
  do update set
    last_number = public.case_sequences.last_number + 1,
    updated_at = now()
  returning last_number into v_next_number;

  return 'KS-' || v_buddhist_year::text || '-' || lpad(v_next_number::text, 4, '0');
end;
$$;

revoke all on function public.next_case_id(date) from public, anon;
grant execute on function public.next_case_id(date) to authenticated;

-- One temporary room per incident. Retention can be automated after a case is closed.
create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  sender_name text not null,
  message_text text,
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_messages_has_content check (
    nullif(btrim(coalesce(message_text, '')), '') is not null or image_path is not null
  )
);
create index if not exists case_messages_incident_created_idx
  on public.case_messages(incident_id, created_at);
alter table public.case_messages enable row level security;

-- Immutable incident audit trail.
create table if not exists public.incident_audit_log (
  id bigint generated always as identity primary key,
  incident_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists incident_audit_incident_idx
  on public.incident_audit_log(incident_id, created_at desc);
alter table public.incident_audit_log enable row level security;

create or replace function public.log_incident_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.incident_audit_log(incident_id, action, actor_id, old_data, new_data)
  values (
    coalesce(new.id, old.id),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_incident_audit on public.incidents;
create trigger trg_incident_audit
after insert or update or delete on public.incidents
for each row execute function public.log_incident_change();

-- Remove permissive legacy policies.
drop policy if exists "all_profiles" on public.profiles;
drop policy if exists "all_personnel_cards" on public.personnel_cards;
drop policy if exists "all_incidents" on public.incidents;
drop policy if exists "allow read incidents" on public.incidents;
drop policy if exists "allow insert incidents" on public.incidents;
drop policy if exists "all_patients" on public.patients;
drop policy if exists "all_vehicles" on public.vehicles;
drop policy if exists "all_images" on public.incident_images;
drop policy if exists "all_tokens" on public.device_tokens;
drop policy if exists "all_notifications" on public.notifications;

-- Profiles: users may read their own pending profile; active staff can read the directory.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile" on public.profiles
for select to authenticated using (id = auth.uid());

drop policy if exists "staff read active profiles" on public.profiles;
create policy "staff read active profiles" on public.profiles
for select to authenticated
using (public.is_active_staff() and (is_active = true or public.is_admin()));

drop policy if exists "admin insert profiles" on public.profiles;
create policy "admin insert profiles" on public.profiles
for insert to authenticated
with check (public.is_admin());

drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles
for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin delete profiles" on public.profiles;
create policy "admin delete profiles" on public.profiles
for delete to authenticated
using (public.is_admin() and id <> auth.uid());

-- Personnel directory is visible to active staff; editing remains admin-only.
drop policy if exists "staff read personnel cards" on public.personnel_cards;
create policy "staff read personnel cards" on public.personnel_cards
for select to authenticated using (public.is_active_staff());
drop policy if exists "admin insert personnel cards" on public.personnel_cards;
create policy "admin insert personnel cards" on public.personnel_cards
for insert to authenticated with check (public.is_admin());
drop policy if exists "admin update personnel cards" on public.personnel_cards;
create policy "admin update personnel cards" on public.personnel_cards
for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete personnel cards" on public.personnel_cards;
create policy "admin delete personnel cards" on public.personnel_cards
for delete to authenticated using (public.is_admin());

-- Incidents and related records.
drop policy if exists "staff read incidents" on public.incidents;
create policy "staff read incidents" on public.incidents
for select to authenticated using (public.is_active_staff());
drop policy if exists "staff create incidents" on public.incidents;
create policy "staff create incidents" on public.incidents
for insert to authenticated with check (public.is_active_staff());
drop policy if exists "staff update incidents" on public.incidents;
create policy "staff update incidents" on public.incidents
for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
drop policy if exists "admin delete incidents" on public.incidents;
create policy "admin delete incidents" on public.incidents
for delete to authenticated using (public.is_admin());

drop policy if exists "staff read patients" on public.patients;
create policy "staff read patients" on public.patients
for select to authenticated using (public.is_active_staff());
drop policy if exists "staff create patients" on public.patients;
create policy "staff create patients" on public.patients
for insert to authenticated with check (public.is_active_staff());
drop policy if exists "staff update patients" on public.patients;
create policy "staff update patients" on public.patients
for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
drop policy if exists "admin delete patients" on public.patients;
create policy "admin delete patients" on public.patients
for delete to authenticated using (public.is_admin());

drop policy if exists "staff read vehicles" on public.vehicles;
create policy "staff read vehicles" on public.vehicles
for select to authenticated using (public.is_active_staff());
drop policy if exists "staff create vehicles" on public.vehicles;
create policy "staff create vehicles" on public.vehicles
for insert to authenticated with check (public.is_active_staff());
drop policy if exists "staff update vehicles" on public.vehicles;
create policy "staff update vehicles" on public.vehicles
for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
drop policy if exists "admin delete vehicles" on public.vehicles;
create policy "admin delete vehicles" on public.vehicles
for delete to authenticated using (public.is_admin());

drop policy if exists "staff read incident images" on public.incident_images;
create policy "staff read incident images" on public.incident_images
for select to authenticated using (public.is_active_staff());
drop policy if exists "staff create incident images" on public.incident_images;
create policy "staff create incident images" on public.incident_images
for insert to authenticated with check (public.is_active_staff());
drop policy if exists "admin delete incident images" on public.incident_images;
create policy "admin delete incident images" on public.incident_images
for delete to authenticated using (public.is_admin());

-- A user may register multiple devices, but may only manage their own tokens.
drop policy if exists "users read own device tokens" on public.device_tokens;
create policy "users read own device tokens" on public.device_tokens
for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "users insert own device tokens" on public.device_tokens;
create policy "users insert own device tokens" on public.device_tokens
for insert to authenticated with check (user_id = auth.uid() and public.is_active_staff());
drop policy if exists "users update own device tokens" on public.device_tokens;
create policy "users update own device tokens" on public.device_tokens
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "users delete own device tokens" on public.device_tokens;
create policy "users delete own device tokens" on public.device_tokens
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "staff read notifications" on public.notifications;
create policy "staff read notifications" on public.notifications
for select to authenticated using (public.is_active_staff());

drop policy if exists "staff read case messages" on public.case_messages;
create policy "staff read case messages" on public.case_messages
for select to authenticated using (public.is_active_staff());
drop policy if exists "staff send case messages" on public.case_messages;
create policy "staff send case messages" on public.case_messages
for insert to authenticated
with check (public.is_active_staff() and sender_id = auth.uid());
drop policy if exists "sender update case messages" on public.case_messages;
create policy "sender update case messages" on public.case_messages
for update to authenticated
using (sender_id = auth.uid() or public.is_admin())
with check (sender_id = auth.uid() or public.is_admin());
drop policy if exists "sender delete case messages" on public.case_messages;
create policy "sender delete case messages" on public.case_messages
for delete to authenticated
using (sender_id = auth.uid() or public.is_admin());

drop policy if exists "staff read incident audit" on public.incident_audit_log;
create policy "staff read incident audit" on public.incident_audit_log
for select to authenticated using (public.is_active_staff());

-- Private image buckets. Files are opened with short-lived signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-photos', 'incident-photos', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'incident-chat', 'incident-chat', false, 8388608,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public read incident photos" on storage.objects;
drop policy if exists "public upload incident photos" on storage.objects;
drop policy if exists "staff read protected images" on storage.objects;
drop policy if exists "staff upload protected images" on storage.objects;
drop policy if exists "owner delete protected images" on storage.objects;

drop policy if exists "staff read protected images" on storage.objects;
create policy "staff read protected images" on storage.objects
for select to authenticated
using (bucket_id in ('incident-photos', 'incident-chat') and public.is_active_staff());

drop policy if exists "staff upload protected images" on storage.objects;
create policy "staff upload protected images" on storage.objects
for insert to authenticated
with check (bucket_id in ('incident-photos', 'incident-chat') and public.is_active_staff());

drop policy if exists "owner delete protected images" on storage.objects;
create policy "owner delete protected images" on storage.objects
for delete to authenticated
using (
  bucket_id in ('incident-photos', 'incident-chat')
  and (owner_id = auth.uid()::text or public.is_admin())
);

-- Ensure the dashboard aggregate obeys incident RLS and is unavailable to anonymous users.
create or replace view public.dashboard_summary
with (security_invoker = true)
as
select
  count(*) as total_cases,
  count(*) filter (where case_type = 'accident') as accident,
  count(*) filter (where case_type = 'emergency') as emergency,
  count(*) filter (where case_type = 'public_service') as service,
  count(*) filter (where status = 'closed') as closed
from public.incidents;
revoke all on public.dashboard_summary from anon;
grant select on public.dashboard_summary to authenticated;

-- Add chat to realtime once, without failing when it was already added.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'case_messages'
  ) then
    alter publication supabase_realtime add table public.case_messages;
  end if;
end $$;

-- ============================================================
-- FEATURE: INCIDENT TIMELINE + PER-USER NOTIFICATION INBOX
-- ============================================================
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
