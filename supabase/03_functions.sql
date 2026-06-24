-- =====================================================================
-- 03_functions.sql : RPCs used by the application
-- =====================================================================

-- ---------------------------------------------------------------------
-- Atomic employee transfer: update location + log history in one tx
-- ---------------------------------------------------------------------
create or replace function public.transfer_employee(
  p_employee_id uuid,
  p_to_location uuid,
  p_reason      text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from uuid;
begin
  select location_id into v_from from public.employees where id = p_employee_id;
  if v_from is null and not exists (select 1 from public.employees where id = p_employee_id) then
    raise exception 'employee % not found', p_employee_id;
  end if;
  if v_from is not distinct from p_to_location then
    raise exception 'employee is already in the target location';
  end if;

  update public.employees set location_id = p_to_location where id = p_employee_id;

  insert into public.employment_history(employee_id, from_location_id, to_location_id, reason, changed_by)
  values (p_employee_id, v_from, p_to_location, p_reason, auth.uid());
end $$;

-- ---------------------------------------------------------------------
-- Command-palette search (name or national_id), location name joined
-- ---------------------------------------------------------------------
create or replace function public.search_employees(p_q text, p_limit int default 12)
returns table (
  id uuid, full_name text, national_id text,
  location_name text, is_active boolean
)
language sql
stable
as $$
  select e.id, e.full_name, e.national_id, l.name, e.is_active
  from public.employees e
  left join public.locations l on l.id = e.location_id
  where p_q is null or p_q = ''
     or e.full_name ilike '%'||p_q||'%'
     or e.national_id ilike '%'||p_q||'%'
  order by similarity(e.full_name, coalesce(p_q,'')) desc, e.full_name
  limit p_limit;
$$;

-- ---------------------------------------------------------------------
-- Daily operations dashboard metrics
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns json
language sql
stable
as $$
  select json_build_object(
    'total_employees', (select count(*) from public.employees where is_active),
    'on_leave_today',  (select count(distinct l.employee_id)
                          from public.leaves l
                         where current_date between l.start_date and coalesce(l.end_date, l.start_date)
                           and l.type <> 'hourly' and l.status = 'approved'),
    'low_balance',     (select count(*) from public.employees where is_active and annual_leave_balance <= 3),
    'locations',       (select count(*) from public.locations)
  );
$$;
