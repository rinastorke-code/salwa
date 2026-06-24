-- =====================================================================
-- 04_rls.sql : Row Level Security + Storage
-- =====================================================================

-- Helper: current user's role
create or replace function public.current_role()
returns app_role
language sql stable security definer set search_path = public
as $$
  select role from public.users_roles where user_id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.users_roles where user_id = auth.uid()), false);
$$;

-- Enable RLS
alter table public.users_roles        enable row level security;
alter table public.locations          enable row level security;
alter table public.employees          enable row level security;
alter table public.leaves             enable row level security;
alter table public.employment_history enable row level security;

-- users_roles: a user reads own row; super_admin manages all
drop policy if exists ur_self_read on public.users_roles;
create policy ur_self_read on public.users_roles
  for select using (user_id = auth.uid() or public.is_super_admin());
drop policy if exists ur_admin_all on public.users_roles;
create policy ur_admin_all on public.users_roles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- Any authenticated staff member can read operational data
drop policy if exists loc_read on public.locations;
create policy loc_read on public.locations for select using (auth.role() = 'authenticated');
drop policy if exists emp_read on public.employees;
create policy emp_read on public.employees for select using (auth.role() = 'authenticated');
drop policy if exists lv_read on public.leaves;
create policy lv_read on public.leaves for select using (auth.role() = 'authenticated');
drop policy if exists hist_read on public.employment_history;
create policy hist_read on public.employment_history for select using (auth.role() = 'authenticated');

-- Data-entry assistants AND super_admin can write employees / leaves
drop policy if exists emp_write on public.employees;
create policy emp_write on public.employees
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists lv_write on public.leaves;
create policy lv_write on public.leaves
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists hist_write on public.employment_history;
create policy hist_write on public.employment_history
  for insert with check (auth.role() = 'authenticated');

-- Locations: only super_admin restructures the hierarchy
drop policy if exists loc_write on public.locations;
create policy loc_write on public.locations
  for all using (public.is_super_admin()) with check (public.is_super_admin());

-- ---------------------------------------------------------------------
-- Storage bucket for medical / leave documents (private)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('leave-docs', 'leave-docs', false)
on conflict (id) do nothing;

drop policy if exists docs_read on storage.objects;
create policy docs_read on storage.objects
  for select using (bucket_id = 'leave-docs' and auth.role() = 'authenticated');
drop policy if exists docs_write on storage.objects;
create policy docs_write on storage.objects
  for insert with check (bucket_id = 'leave-docs' and auth.role() = 'authenticated');
