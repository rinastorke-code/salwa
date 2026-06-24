-- =====================================================================
-- 09_centers_attendance.sql : Centers portal + daily attendance + caps
-- Run AFTER 01–08.
-- =====================================================================

-- ---- Per-location annual cap + per-employee override -----------------
alter table public.locations add column if not exists annual_cap integer;          -- null => default 30
alter table public.employees add column if not exists annual_cap_override integer;  -- null => inherit

create or replace function public.effective_cap(p_employee uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select annual_cap_override from public.employees where id = p_employee),
    (select l.annual_cap from public.employees e join public.locations l on l.id = e.location_id where e.id = p_employee),
    30
  );
$$;

-- ---- Center login accounts (one per center/location) ----------------
create table if not exists public.center_accounts (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid not null references public.locations(id) on delete cascade,
  username      text not null unique,
  password_hash text not null,             -- bcrypt hash (generated in the API layer)
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_center_location on public.center_accounts(location_id);

-- ---- Daily attendance (تفقّد) ---------------------------------------
do $$ begin create type attendance_status as enum ('present','absent');
exception when duplicate_object then null; end $$;
do $$ begin create type absence_reason as enum ('administrative','sick','permission');
exception when duplicate_object then null; end $$;

create table if not exists public.attendance (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  location_id uuid not null references public.locations(id),
  day         date not null,
  status      attendance_status not null,
  reason      absence_reason,        -- required when status='absent'
  hours       integer,               -- for hourly administrative / permission
  source      text not null default 'center',
  created_at  timestamptz not null default now(),
  unique (employee_id, day)
);
create index if not exists idx_attendance_day on public.attendance(day);
create index if not exists idx_attendance_loc on public.attendance(location_id, day);

-- ---- Leaves workflow columns ---------------------------------------
-- status (pending|approved|rejected) already exists from 01.
alter table public.leaves add column if not exists source       text not null default 'central'; -- central|center
alter table public.leaves add column if not exists over_cap     boolean not null default false;
alter table public.leaves add column if not exists confirmed_by uuid references auth.users(id);
alter table public.leaves add column if not exists confirmed_at timestamptz;
