-- KOKSAI RESCUE - CONSOLIDATED PRODUCTION SCHEMA
-- Use this file for a NEW Supabase project only.
-- For an existing database, back up first and apply existing_database/production_hardening.sql.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  full_name text,
  phone text,
  role text not null default 'user' check (role in ('admin','boss','station','volunteer','user')),
  is_volunteer boolean not null default false,
  rescue_station text,
  is_active boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.personnel_cards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  display_name text not null,
  full_name text,
  nickname text,
  callsign text,
  personnel_position text not null default 'volunteer',
  position_title text,
  personnel_sort_order integer not null default 9999,
  profile_photo_url text,
  avatar_url text,
  phone text,
  email text,
  rescue_station text,
  is_active boolean not null default true,
  facebook_url text,
  line_url text,
  tiktok_url text,
  instagram_url text,
  youtube_url text,
  website_url text,
  social_links jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.case_sequences (
  buddhist_year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  case_id text unique,
  occurred_at timestamptz not null default now(),
  incident_date date not null default current_date,
  incident_time time not null default localtime,
  case_type text not null default 'public_service',
  status text not null default 'open' check (status in ('open','in_progress','closed','cancelled')),
  accident_type text,
  accident_details text,
  details text,
  location_text text,
  place text,
  tambon text,
  reporter_name text,
  reporter_phone text,
  gps text,
  gps_text text,
  gps_lat double precision,
  gps_lng double precision,
  vehicles jsonb not null default '[]'::jsonb,
  vehicles_json jsonb not null default '[]'::jsonb,
  patients jsonb not null default '[]'::jsonb,
  patients_json jsonb not null default '[]'::jsonb,
  image_urls jsonb not null default '[]'::jsonb,
  images_json jsonb not null default '[]'::jsonb,
  destination_type text,
  destination_name text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibility tables retained for future normalization of JSON fields.
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  status text,
  gender text,
  full_name text,
  age integer,
  symptoms text,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  type text,
  brand text,
  model text,
  color text,
  plate text,
  province text,
  created_at timestamptz not null default now()
);

create table if not exists public.incident_images (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null default 'web',
  rescue_station text not null default 'all',
  is_active boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text,
  body text,
  data jsonb,
  created_at timestamptz not null default now()
);

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

create table if not exists public.incident_audit_log (
  id bigint generated always as identity primary key,
  incident_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  actor_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists incidents_date_time_idx on public.incidents(incident_date desc, incident_time desc);
create index if not exists incidents_status_idx on public.incidents(status);
create index if not exists case_messages_incident_created_idx on public.case_messages(incident_id, created_at);
create index if not exists device_tokens_user_active_idx on public.device_tokens(user_id, is_active);
create index if not exists incident_audit_incident_idx on public.incident_audit_log(incident_id, created_at desc);

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
    id,
    username,
    email,
    full_name,
    phone,
    role,
    is_volunteer,
    rescue_station,
    is_active
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
      select 1
      from public.profiles
      where lower(username) = lower(btrim(input_username))
    );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.current_profile_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true limit 1;
$$;

create or replace function public.is_active_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists(
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
      and role in ('admin','boss','station','volunteer')
  ), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(exists(
    select 1 from public.profiles
    where id = auth.uid() and is_active = true and role = 'admin'
  ), false);
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.is_active_staff() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.is_admin() to authenticated;

create or replace function public.next_case_id(p_incident_date date default current_date)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year integer;
  v_number integer;
begin
  if not public.is_active_staff() then raise exception 'not authorized'; end if;
  v_year := extract(year from coalesce(p_incident_date, current_date))::integer + 543;
  insert into public.case_sequences(buddhist_year,last_number)
  values(v_year,1)
  on conflict(buddhist_year) do update
    set last_number = public.case_sequences.last_number + 1, updated_at = now()
  returning last_number into v_number;
  return 'KS-' || v_year::text || '-' || lpad(v_number::text,4,'0');
end;
$$;
revoke all on function public.next_case_id(date) from public, anon;
grant execute on function public.next_case_id(date) to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

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

drop trigger if exists trg_incidents_updated_at on public.incidents;
create trigger trg_incidents_updated_at before update on public.incidents
for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.log_incident_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.incident_audit_log(incident_id,action,actor_id,old_data,new_data)
  values(
    coalesce(new.id,old.id), tg_op, auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new,old);
end;
$$;

drop trigger if exists trg_incident_audit on public.incidents;
create trigger trg_incident_audit after insert or update or delete on public.incidents
for each row execute function public.log_incident_change();

alter table public.profiles enable row level security;
alter table public.personnel_cards enable row level security;
alter table public.case_sequences enable row level security;
alter table public.incidents enable row level security;
alter table public.patients enable row level security;
alter table public.vehicles enable row level security;
alter table public.incident_images enable row level security;
alter table public.device_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.case_messages enable row level security;
alter table public.incident_audit_log enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated
using (id = auth.uid());
create policy "staff read active profiles" on public.profiles for select to authenticated
using (public.is_active_staff() and (is_active = true or public.is_admin()));
create policy "admin insert profiles" on public.profiles for insert to authenticated with check (public.is_admin());
create policy "admin update profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete profiles" on public.profiles for delete to authenticated using (public.is_admin() and id <> auth.uid());

create policy "staff read personnel cards" on public.personnel_cards for select to authenticated using (public.is_active_staff());
create policy "admin write personnel cards" on public.personnel_cards for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "staff read incidents" on public.incidents for select to authenticated using (public.is_active_staff());
create policy "staff create incidents" on public.incidents for insert to authenticated with check (public.is_active_staff());
create policy "staff update incidents" on public.incidents for update to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "admin delete incidents" on public.incidents for delete to authenticated using (public.is_admin());

create policy "staff manage patients" on public.patients for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "staff manage vehicles" on public.vehicles for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy "staff manage incident images" on public.incident_images for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy "users read own device tokens" on public.device_tokens for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "users insert own device tokens" on public.device_tokens for insert to authenticated with check (user_id = auth.uid() and public.is_active_staff());
create policy "users update own device tokens" on public.device_tokens for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy "users delete own device tokens" on public.device_tokens for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "staff read notifications" on public.notifications for select to authenticated using (public.is_active_staff());
create policy "staff read case messages" on public.case_messages for select to authenticated using (public.is_active_staff());
create policy "staff send case messages" on public.case_messages for insert to authenticated with check (public.is_active_staff() and sender_id = auth.uid());
create policy "sender update case messages" on public.case_messages for update to authenticated using (sender_id = auth.uid() or public.is_admin()) with check (sender_id = auth.uid() or public.is_admin());
create policy "sender delete case messages" on public.case_messages for delete to authenticated using (sender_id = auth.uid() or public.is_admin());
create policy "staff read incident audit" on public.incident_audit_log for select to authenticated using (public.is_active_staff());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('incident-photos','incident-photos',false,10485760,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('incident-chat','incident-chat',false,8388608,array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "staff read protected images" on storage.objects for select to authenticated
using (bucket_id in ('incident-photos','incident-chat') and public.is_active_staff());
create policy "staff upload protected images" on storage.objects for insert to authenticated
with check (bucket_id in ('incident-photos','incident-chat') and public.is_active_staff());
create policy "owner delete protected images" on storage.objects for delete to authenticated
using (bucket_id in ('incident-photos','incident-chat') and (owner_id = auth.uid()::text or public.is_admin()));

create or replace view public.dashboard_summary
with (security_invoker = true)
as
select
  count(*) as total_cases,
  count(*) filter(where case_type='accident') as accident,
  count(*) filter(where case_type='emergency') as emergency,
  count(*) filter(where case_type='public_service') as service,
  count(*) filter(where status='closed') as closed
from public.incidents;

revoke all on public.dashboard_summary from anon;
grant select on public.dashboard_summary to authenticated;

-- Realtime tables.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='incidents') then
    alter publication supabase_realtime add table public.incidents;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='case_messages') then
    alter publication supabase_realtime add table public.case_messages;
  end if;
end $$;
