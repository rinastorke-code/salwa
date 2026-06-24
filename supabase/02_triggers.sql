-- =====================================================================
-- 02_triggers.sql : Hourly-leave -> Annual-day automation
-- =====================================================================
-- Business rule:
--   Every approved 'hourly' leave adds its hours to the employee's
--   hourly_leave_accumulator. Whenever the accumulator reaches 8 hours
--   (one working day), deduct exactly 1 day from annual_leave_balance
--   and subtract 8 from the accumulator. The loop handles a single
--   insert that pushes the total past several multiples of 8 (e.g. +20h
--   -> -2 days, accumulator keeps the remaining 4h).
-- =====================================================================

create or replace function public.fn_accumulate_hourly_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acc          integer;
  v_days_to_cut  integer;
begin
  -- Only approved hourly leaves affect the balance
  if new.type <> 'hourly' or new.status <> 'approved' then
    return new;
  end if;

  -- Add the new hours, then read the running accumulator
  update public.employees
     set hourly_leave_accumulator = hourly_leave_accumulator + coalesce(new.hours_count, 0)
   where id = new.employee_id
   returning hourly_leave_accumulator into v_acc;

  -- How many whole days (8h) are now contained in the accumulator
  v_days_to_cut := v_acc / 8;   -- integer division

  if v_days_to_cut > 0 then
    update public.employees
       set annual_leave_balance     = annual_leave_balance - v_days_to_cut,
           hourly_leave_accumulator = hourly_leave_accumulator - (v_days_to_cut * 8)
     where id = new.employee_id;
  end if;

  return new;
end $$;

drop trigger if exists trg_accumulate_hourly_leave on public.leaves;
create trigger trg_accumulate_hourly_leave
  after insert on public.leaves
  for each row execute function public.fn_accumulate_hourly_leave();

-- ---------------------------------------------------------------------
-- Deduct whole-day leaves (annual) from the balance on approval.
-- Counts inclusive days between start_date and end_date.
-- ---------------------------------------------------------------------
create or replace function public.fn_deduct_day_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer;
begin
  if new.type = 'annual' and new.status = 'approved' then
    v_days := greatest(1, (coalesce(new.end_date, new.start_date) - new.start_date) + 1);
    update public.employees
       set annual_leave_balance = annual_leave_balance - v_days
     where id = new.employee_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_deduct_day_leave on public.leaves;
create trigger trg_deduct_day_leave
  after insert on public.leaves
  for each row execute function public.fn_deduct_day_leave();
