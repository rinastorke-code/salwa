-- =====================================================================
-- HR Management System — Directorate of Social Affairs and Labor
-- 01_schema.sql : Tables & Indexes
-- PostgreSQL 15+ (Supabase)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- ENUM types
-- ---------------------------------------------------------------------
do $$ begin
  create type app_role        as enum ('super_admin', 'data_entry');
exception when duplicate_object then null; end $$;

do $$ begin
  create type location_type   as enum ('governorate', 'directorate', 'department', 'office');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leave_type      as enum ('annual', 'hourly', 'sick', 'unpaid', 'administrative');
exception when duplicate_object then null; end $$;

do $$ begin
  create type leave_status    as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 1) users_roles  — maps Supabase auth.users -> application role
-- ---------------------------------------------------------------------
create table if not exists public.users_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        app_role not null default 'data_entry',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2) locations — self-referencing dynamic hierarchy
-- ---------------------------------------------------------------------
create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  type        location_type not null,
  parent_id   uuid references public.locations(id) on delete restrict,
  created_at  timestamptz not null default now()
);
create index if not exists idx_locations_parent on public.locations(parent_id);

-- ---------------------------------------------------------------------
-- 3) employees
-- hourly_leave_accumulator: running total of approved hourly-leave hours,
-- automatically converted to whole days by the trigger in 02_triggers.sql
-- ---------------------------------------------------------------------
create table if not exists public.employees (
  id                        uuid primary key default gen_random_uuid(),
  full_name                 text not null,
  national_id               text not null unique,
  location_id               uuid references public.locations(id) on delete set null,
  hire_date                 date not null default current_date,
  annual_leave_balance      integer not null default 30,    -- in days
  hourly_leave_accumulator  integer not null default 0,     -- in hours (0..7 after conversion)
  is_active                 boolean not null default true,
  phone                     text,
  job_title                 text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists idx_employees_location on public.employees(location_id);
create index if not exists idx_employees_active   on public.employees(is_active);
-- Trigram index for fast fuzzy search in the command palette / 360 view
create extension if not exists "pg_trgm";
create index if not exists idx_employees_name_trgm on public.employees using gin (full_name gin_trgm_ops);
create index if not exists idx_employees_nid_trgm  on public.employees using gin (national_id gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 4) leaves — includes document_url for Supabase Storage (medical docs)
-- hours_count is only used for type = 'hourly'
-- ---------------------------------------------------------------------
create table if not exists public.leaves (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  type          leave_type not null,
  status        leave_status not null default 'approved',
  start_date    date not null,
  end_date      date,
  hours_count   integer,                 -- required when type = 'hourly'
  reason        text,
  document_url  text,                    -- Supabase Storage path (medical leave)
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  constraint chk_hourly_hours
    check ( type <> 'hourly' or (hours_count is not null and hours_count > 0) )
);
create index if not exists idx_leaves_employee on public.leaves(employee_id);
create index if not exists idx_leaves_date      on public.leaves(start_date);
create index if not exists idx_leaves_type      on public.leaves(type);

-- ---------------------------------------------------------------------
-- 5) employment_history — audit trail for transfers
-- ---------------------------------------------------------------------
create table if not exists public.employment_history (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(id) on delete cascade,
  from_location_id uuid references public.locations(id),
  to_location_id   uuid references public.locations(id),
  reason          text,
  changed_by      uuid references auth.users(id),
  changed_at      timestamptz not null default now()
);
create index if not exists idx_history_employee on public.employment_history(employee_id);

-- ---------------------------------------------------------------------
-- updated_at maintenance for employees
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_employees_updated_at on public.employees;
create trigger trg_employees_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();
