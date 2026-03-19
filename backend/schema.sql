-- Cosmetologist appointment schema (Supabase / Postgres)
-- This file documents the current project data model.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('client', 'cosmetologist', 'admin');
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'appointment_status') then
    create type public.appointment_status as enum ('pending', 'confirmed', 'cancelled', 'completed');
  end if;
end
$$;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  duration_min integer not null,
  price numeric not null,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.user_role not null default 'client',
  full_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id),
  client_profile_id uuid not null references public.profiles(id),
  client_name text not null,
  client_phone text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status public.appointment_status not null default 'pending',
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure current deployments with pre-existing tables are aligned.
alter table if exists public.services
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.profiles
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from public.appointments
    where client_profile_id is null
  ) then
    alter table if exists public.appointments
      alter column client_profile_id set not null;
  else
    raise notice 'Skipped NOT NULL for appointments.client_profile_id because NULL rows exist.';
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_services_duration_min_positive'
  ) then
    alter table public.services
      add constraint chk_services_duration_min_positive check (duration_min > 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_services_price_non_negative'
  ) then
    alter table public.services
      add constraint chk_services_price_non_negative check (price >= 0);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_appointments_time_range'
  ) then
    alter table public.appointments
      add constraint chk_appointments_time_range check (start_time < end_time);
  end if;
end
$$;

create index if not exists idx_appointments_date on public.appointments(date);
create index if not exists idx_appointments_status on public.appointments(status);
create index if not exists idx_appointments_service_id on public.appointments(service_id);
create index if not exists idx_appointments_client_profile_id on public.appointments(client_profile_id);
create index if not exists idx_profiles_user_id on public.profiles(user_id);

-- Avoid overlapping active bookings for the same slot.
create unique index if not exists uq_appointments_active_slot
  on public.appointments(date, start_time)
  where status in ('pending', 'confirmed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_services_set_updated_at on public.services;
create trigger trg_services_set_updated_at
before update on public.services
for each row
execute function public.set_updated_at();

drop trigger if exists trg_profiles_set_updated_at on public.profiles;
create trigger trg_profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists trg_appointments_set_updated_at on public.appointments;
create trigger trg_appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.appointments enable row level security;
alter table public.services enable row level security;

-- Helper: returns the profile row for the currently authenticated user.
create or replace function public.my_profile_id()
returns uuid
language sql
stable
security definer
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.my_role()
returns public.user_role
language sql
stable
security definer
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

-- ---- profiles ----

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (user_id = auth.uid());

-- ---- services ----

drop policy if exists "services_select_all" on public.services;
create policy "services_select_all" on public.services
  for select
  using (true);

drop policy if exists "services_insert_admin" on public.services;
create policy "services_insert_admin" on public.services
  for insert to authenticated
  with check (public.my_role() in ('cosmetologist', 'admin'));

drop policy if exists "services_update_admin" on public.services;
create policy "services_update_admin" on public.services
  for update to authenticated
  using (public.my_role() in ('cosmetologist', 'admin'))
  with check (public.my_role() in ('cosmetologist', 'admin'));

-- ---- appointments ----

drop policy if exists "appointments_select" on public.appointments;
create policy "appointments_select" on public.appointments
  for select to authenticated
  using (
    client_profile_id = public.my_profile_id()
    or public.my_role() in ('cosmetologist', 'admin')
  );

drop policy if exists "appointments_insert_own" on public.appointments;
create policy "appointments_insert_own" on public.appointments
  for insert to authenticated
  with check (client_profile_id = public.my_profile_id());

drop policy if exists "appointments_update" on public.appointments;
create policy "appointments_update" on public.appointments
  for update to authenticated
  using (
    client_profile_id = public.my_profile_id()
    or public.my_role() in ('cosmetologist', 'admin')
  );

drop policy if exists "appointments_delete_own" on public.appointments;
create policy "appointments_delete_own" on public.appointments
  for delete to authenticated
  using (client_profile_id = public.my_profile_id());
