-- KOKSAI RESCUE: admin-managed content and ambulance registry.
-- Apply after 20260716000000_production_schema.sql.

create table if not exists public.ambulances (
  id uuid primary key default gen_random_uuid(),
  vehicle_code text not null unique,
  name text not null,
  plate_number text,
  province text,
  brand text,
  model text,
  station text not null default 'all',
  status text not null default 'ready'
    check (status in ('ready', 'on_duty', 'maintenance', 'inactive')),
  image_url text,
  notes text,
  sort_order integer not null default 9999,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  content text,
  image_url text,
  link_url text,
  is_published boolean not null default false,
  published_at timestamptz,
  sort_order integer not null default 9999,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dashboard_slides (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  link_url text,
  is_active boolean not null default true,
  sort_order integer not null default 9999,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists ambulances_active_order_idx
  on public.ambulances(is_active, sort_order, name);
create index if not exists news_publish_order_idx
  on public.news(is_published, published_at desc, sort_order);
create index if not exists dashboard_slides_active_order_idx
  on public.dashboard_slides(is_active, sort_order, created_at);

-- The base migration defines public.set_updated_at().
drop trigger if exists trg_ambulances_updated_at on public.ambulances;
create trigger trg_ambulances_updated_at
before update on public.ambulances
for each row execute function public.set_updated_at();

drop trigger if exists trg_news_updated_at on public.news;
create trigger trg_news_updated_at
before update on public.news
for each row execute function public.set_updated_at();

drop trigger if exists trg_dashboard_slides_updated_at on public.dashboard_slides;
create trigger trg_dashboard_slides_updated_at
before update on public.dashboard_slides
for each row execute function public.set_updated_at();

create or replace function public.set_app_setting_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_app_settings_audit on public.app_settings;
create trigger trg_app_settings_audit
before insert or update on public.app_settings
for each row execute function public.set_app_setting_audit_fields();

alter table public.ambulances enable row level security;
alter table public.news enable row level security;
alter table public.dashboard_slides enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "staff read ambulances" on public.ambulances;
create policy "staff read ambulances" on public.ambulances
for select to authenticated using (public.is_active_staff());

drop policy if exists "admin manage ambulances" on public.ambulances;
create policy "admin manage ambulances" on public.ambulances
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read news" on public.news;
create policy "staff read news" on public.news
for select to authenticated using (public.is_active_staff());

drop policy if exists "admin manage news" on public.news;
create policy "admin manage news" on public.news
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read dashboard slides" on public.dashboard_slides;
create policy "staff read dashboard slides" on public.dashboard_slides
for select to authenticated using (public.is_active_staff());

drop policy if exists "admin manage dashboard slides" on public.dashboard_slides;
create policy "admin manage dashboard slides" on public.dashboard_slides
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "staff read app settings" on public.app_settings;
create policy "staff read app settings" on public.app_settings
for select to authenticated using (public.is_active_staff());

drop policy if exists "admin manage app settings" on public.app_settings;
create policy "admin manage app settings" on public.app_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.ambulances, public.news, public.dashboard_slides, public.app_settings to authenticated;
grant insert, update, delete on public.ambulances, public.news, public.dashboard_slides, public.app_settings to authenticated;

insert into public.dashboard_slides(title, subtitle, image_url, sort_order, is_active)
select seed.title, seed.subtitle, seed.image_url, seed.sort_order, seed.is_active
from (
  values
    ('กู้ภัยกกไทร', 'พร้อมช่วยเหลือประชาชนตลอด 24 ชั่วโมง', '/slides/slide-1.png', 10, true),
    ('ศูนย์แจ้งเหตุ', 'แจ้งเหตุและติดตามการปฏิบัติงานแบบเรียลไทม์', '/slides/slide-2.png', 20, true),
    ('ร่วมสนับสนุนงานกู้ภัย', 'ทุกการสนับสนุนช่วยให้เราเข้าถึงผู้ประสบเหตุได้เร็วขึ้น', '/slides/slide-3.png', 30, true)
) as seed(title, subtitle, image_url, sort_order, is_active)
where not exists (
  select 1 from public.dashboard_slides existing where existing.image_url = seed.image_url
);

insert into public.app_settings(key, value, description)
values
  ('organization_name', to_jsonb('หน่วยกู้ภัยกกไทร สำนักงานใหญ่'::text), 'ชื่อหน่วยงานที่แสดงในระบบ'),
  ('emergency_phone', to_jsonb(''::text), 'เบอร์โทรฉุกเฉินหลัก'),
  ('facebook_url', to_jsonb('https://facebook.com/koksai.lomsak.th'::text), 'ลิงก์ Facebook'),
  ('line_url', to_jsonb('https://lin.ee/nys43PA'::text), 'ลิงก์ LINE')
on conflict (key) do nothing;
