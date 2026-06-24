-- =====================================================================
-- 06_ledger.sql : Computed-balance (ledger) model
-- Run AFTER 01–05. Converts the stored balance into a computed one so
-- that deleting / editing a leave automatically corrects the balance.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Configurable settings (weekend days, etc.) — change without code
-- ---------------------------------------------------------------------
create table if not exists public.app_settings (
  key   text primary key,
  value jsonb not null
);
insert into public.app_settings (key, value) values
  ('weekend_dows', '[5,6]')   -- 5 = Friday, 6 = Saturday (Postgres DOW)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- Official holidays (excluded from leave-day counting)
-- ---------------------------------------------------------------------
create table if not exists public.holidays (
  day  date primary key,
  name text
);

-- ---------------------------------------------------------------------
-- working_days: inclusive count excluding weekend + holidays
-- ---------------------------------------------------------------------
create or replace function public.working_days(p_start date, p_end date)
returns integer
language plpgsql stable
as $$
declare we int[];
begin
  select array(select jsonb_array_elements_text(value)::int)
    into we from public.app_settings where key = 'weekend_dows';
  we := coalesce(we, array[5,6]);
  return (
    select count(*)::int
    from generate_series(p_start, coalesce(p_end, p_start), interval '1 day') g(d)
    where (extract(dow from g.d)::int) <> all(we)
      and g.d::date not in (select day from public.holidays)
  );
end $$;

-- ---------------------------------------------------------------------
-- Entitlement column = single source of truth (days available for period,
-- includes any carried-over balance). Backfill so the remaining balance
-- is identical to the previous stored value right after migration.
-- ---------------------------------------------------------------------
alter table public.employees
  add column if not exists annual_entitlement integer not null default 30;

do $$
begin
  if exists (select 1 from information_schema.columns
             where table_name='employees' and column_name='annual_leave_balance') then
    update public.employees e
       set annual_entitlement = e.annual_leave_balance
         + coalesce((select sum(public.working_days(l.start_date, coalesce(l.end_date,l.start_date)))
                       from public.leaves l
                      where l.employee_id=e.id and l.type='annual' and l.status='approved'),0)
         + coalesce((select sum(l.hours_count)/8
                       from public.leaves l
                      where l.employee_id=e.id and l.type='hourly' and l.status='approved'),0);
  end if;
end $$;

-- Remove the old balance-mutating triggers — the view computes everything now
drop trigger if exists trg_accumulate_hourly_leave on public.leaves;
drop trigger if exists trg_deduct_day_leave        on public.leaves;
drop function if exists public.fn_accumulate_hourly_leave();
drop function if exists public.fn_deduct_day_leave();

-- Drop the now-deprecated stored columns
alter table public.employees drop column if exists annual_leave_balance;
alter table public.employees drop column if exists hourly_leave_accumulator;

-- ---------------------------------------------------------------------
-- Computed balance view (leaves are append-only; balance derives from them)
-- ---------------------------------------------------------------------
create or replace view public.v_employee_balance as
with agg as (
  select
    e.id, e.full_name, e.national_id, e.location_id, e.is_active, e.annual_entitlement,
    coalesce(sum(case when l.type='annual' and l.status='approved'
              then public.working_days(l.start_date, coalesce(l.end_date,l.start_date)) end),0) as used_annual_days,
    coalesce(sum(case when l.type='hourly' and l.status='approved'
              then l.hours_count end),0) as used_hourly_hours
  from public.employees e
  left join public.leaves l on l.employee_id = e.id
  group by e.id
)
select
  a.*,
  (a.used_hourly_hours / 8)                                  as hourly_days,
  (a.used_hourly_hours % 8)                                  as hourly_accumulator,
  (a.annual_entitlement - a.used_annual_days - (a.used_hourly_hours/8)) as remaining_days
from agg a;

-- ---------------------------------------------------------------------
-- record_leave: validated insert that PREVENTS a negative balance
-- (super_admin may override with p_force = true)
-- ---------------------------------------------------------------------
create or replace function public.record_leave(
  p_employee uuid,
  p_type     leave_type,
  p_start    date,
  p_end      date    default null,
  p_hours    integer default null,
  p_doc      text    default null,
  p_force    boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cost      numeric := 0;
  v_remaining integer;
  v_admin     boolean := public.is_super_admin();
  v_id        uuid;
begin
  if p_type = 'annual' then
    v_cost := public.working_days(p_start, coalesce(p_end, p_start));
  elsif p_type = 'hourly' then
    if p_hours is null or p_hours <= 0 then raise exception 'HOURS_REQUIRED'; end if;
    v_cost := p_hours / 8.0;
  end if;

  if p_type in ('annual','hourly') then
    select remaining_days into v_remaining from public.v_employee_balance where id = p_employee;
    if (v_remaining - v_cost) < 0 and not (p_force and v_admin) then
      raise exception 'INSUFFICIENT_BALANCE: remaining=% requested=%', v_remaining, v_cost;
    end if;
  end if;

  insert into public.leaves(employee_id, type, status, start_date, end_date, hours_count, document_url, created_by)
  values (p_employee, p_type, 'approved', p_start, p_end,
          case when p_type='hourly' then p_hours end, p_doc, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Redefine dashboard_stats to use the computed balance view
-- (the old annual_leave_balance column no longer exists)
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns json language sql stable as $$
  select json_build_object(
    'total_employees', (select count(*) from public.employees where is_active),
    'on_leave_today',  (select count(distinct l.employee_id) from public.leaves l
                         where current_date between l.start_date and coalesce(l.end_date, l.start_date)
                           and l.type <> 'hourly' and l.status = 'approved'),
    'low_balance',     (select count(*) from public.v_employee_balance
                         where is_active and remaining_days <= 3),
    'locations',       (select count(*) from public.locations)
  );
$$;
