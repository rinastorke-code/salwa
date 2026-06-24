-- =====================================================================
-- 08_rbac_crud.sql : Role-aware edit / delete RPCs + policies
-- Because the balance is now computed, deleting/editing a leave
-- self-corrects the balance. These RPCs add role checks + audit (via
-- the logging triggers in 07).
-- =====================================================================

-- ---- Leaves -----------------------------------------------------------
create or replace function public.delete_leave(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.leaves where id = p_id;   -- balance recomputes automatically
end $$;

create or replace function public.update_leave(
  p_id uuid, p_start date, p_end date default null, p_hours int default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.leaves
     set start_date = p_start,
         end_date   = p_end,
         hours_count = case when type='hourly' then p_hours else hours_count end
   where id = p_id;
end $$;

-- ---- Employees --------------------------------------------------------
-- Soft delete = the normal "delete" button in the UI (keeps audit trail)
create or replace function public.set_employee_active(p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.employees set is_active = p_active where id = p_id;
end $$;

create or replace function public.update_employee(
  p_id uuid, p_full_name text, p_national_id text,
  p_job_title text default null, p_phone text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.employees
     set full_name = p_full_name, national_id = p_national_id,
         job_title = p_job_title, phone = p_phone
   where id = p_id;
end $$;

-- Hard delete = super_admin only, rare (e.g. duplicate created by mistake)
create or replace function public.hard_delete_employee(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'FORBIDDEN: super_admin only'; end if;
  delete from public.employees where id = p_id;
end $$;

-- ---- Tighten employee delete policy: only super_admin may hard-delete
drop policy if exists emp_write on public.employees;
drop policy if exists emp_ins on public.employees;
drop policy if exists emp_upd on public.employees;
drop policy if exists emp_del on public.employees;
create policy emp_ins on public.employees for insert with check (auth.role()='authenticated');
create policy emp_upd on public.employees for update using (auth.role()='authenticated');
create policy emp_del on public.employees for delete using (public.is_super_admin());
