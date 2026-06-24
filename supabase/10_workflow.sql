-- =====================================================================
-- 10_workflow.sql : Cap-based balance, attendance->leave, confirmation,
--                   late-center detection, RLS, activity logging.
-- =====================================================================

-- ---- Cap-based balance view (two-type model) ------------------------
-- Only 'administrative' (days) and 'hourly' (administrative-hourly) deduct.
-- 'sick' / 'unpaid' / permission do NOT deduct. Pending leaves count
-- provisionally (recorded immediately, awaiting central confirmation).
drop view if exists public.v_employee_balance;
create view public.v_employee_balance as
with agg as (
  select
    e.id, e.full_name, e.national_id, e.location_id, e.is_active,
    public.effective_cap(e.id) as cap,
    coalesce(sum(case when l.type='administrative' and l.status in ('approved','pending')
              then public.working_days(l.start_date, coalesce(l.end_date,l.start_date)) end),0) as used_admin_days,
    coalesce(sum(case when l.type='hourly' and l.status in ('approved','pending')
              then l.hours_count end),0) as used_hourly_hours
  from public.employees e
  left join public.leaves l on l.employee_id = e.id
  group by e.id
)
select
  a.*,
  (a.used_hourly_hours / 8)                                   as hourly_days,
  (a.used_hourly_hours % 8)                                   as hourly_accumulator,
  (a.used_admin_days + a.used_hourly_hours / 8)               as used_days,
  (a.cap - a.used_admin_days - (a.used_hourly_hours / 8))     as remaining_days
from agg a;

-- ---- Central direct leave entry (over-cap => pending, not blocked) ---
create or replace function public.record_leave(
  p_employee uuid, p_type leave_type, p_start date,
  p_end date default null, p_hours integer default null,
  p_doc text default null, p_force boolean default false   -- p_force kept for API compatibility
)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_cost numeric := 0; v_remaining integer; v_over boolean := false; v_status leave_status; v_id uuid;
begin
  if p_type = 'administrative' then v_cost := public.working_days(p_start, coalesce(p_end,p_start));
  elsif p_type = 'hourly' then
    if p_hours is null or p_hours <= 0 then raise exception 'HOURS_REQUIRED'; end if;
    v_cost := p_hours / 8.0;
  end if;

  if p_type in ('administrative','hourly') then
    select remaining_days into v_remaining from public.v_employee_balance where id = p_employee;
    if (v_remaining - v_cost) < 0 then v_over := true; end if;
  end if;

  v_status := case when v_over then 'pending'::leave_status else 'approved'::leave_status end;

  insert into public.leaves(employee_id, type, status, start_date, end_date, hours_count, document_url, created_by, source, over_cap)
  values (p_employee, p_type, v_status, p_start, p_end,
          case when p_type='hourly' then p_hours end, p_doc, auth.uid(), 'central', v_over)
  returning id into v_id;
  return v_id;
end $$;

-- ---- Center attendance -> auto leave -------------------------------
-- Any 'absent + administrative' becomes an administrative leave (1 day,
-- or hourly if p_hours given). 'sick' records a non-deducting leave.
-- All center entries are 'pending' until confirmed by central staff.
create or replace function public.record_center_attendance(
  p_employee uuid, p_location uuid, p_day date,
  p_status attendance_status, p_reason absence_reason default null, p_hours integer default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_remaining int; v_cost numeric; v_over boolean := false;
begin
  insert into public.attendance(employee_id, location_id, day, status, reason, hours, source)
  values (p_employee, p_location, p_day, p_status, p_reason, p_hours, 'center')
  on conflict (employee_id, day)
  do update set status=excluded.status, reason=excluded.reason, hours=excluded.hours;

  -- reset any prior center leave for that day to stay idempotent
  delete from public.leaves where employee_id=p_employee and start_date=p_day and source='center';

  if p_status = 'absent' and p_reason = 'administrative' then
    if p_hours is not null and p_hours > 0 and p_hours < 8 then
      v_cost := p_hours / 8.0;
      select remaining_days into v_remaining from public.v_employee_balance where id=p_employee;
      v_over := (v_remaining - v_cost) < 0;
      insert into public.leaves(employee_id, type, status, start_date, hours_count, created_by, source, over_cap)
      values (p_employee, 'hourly', 'pending', p_day, p_hours, auth.uid(), 'center', v_over);
    else
      v_cost := public.working_days(p_day, p_day);
      select remaining_days into v_remaining from public.v_employee_balance where id=p_employee;
      v_over := (v_remaining - v_cost) < 0;
      insert into public.leaves(employee_id, type, status, start_date, end_date, created_by, source, over_cap)
      values (p_employee, 'administrative', 'pending', p_day, p_day, auth.uid(), 'center', v_over);
    end if;
  elsif p_status = 'absent' and p_reason = 'sick' then
    insert into public.leaves(employee_id, type, status, start_date, end_date, created_by, source)
    values (p_employee, 'sick', 'pending', p_day, p_day, auth.uid(), 'center');
  end if;
end $$;

-- ---- Confirmation by ANY central staff -----------------------------
create or replace function public.confirm_leave(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.leaves
     set status='approved', confirmed_by=auth.uid(), confirmed_at=now()
   where id=p_id;
end $$;

create or replace function public.reject_leave(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.leaves set status='rejected', confirmed_by=auth.uid(), confirmed_at=now() where id=p_id;
end $$;

-- ---- Late centers: active centers with no attendance for today ------
-- Enforces: after 10:00 Asia/Damascus, and today is not Fri/Sat.
create or replace function public.late_centers(p_enforce_time boolean default true)
returns table (location_id uuid, name text) language plpgsql stable as $$
declare v_now timestamptz := now(); v_dow int; we int[];
begin
  v_dow := extract(dow from (v_now at time zone 'Asia/Damascus'))::int;
  select array(select jsonb_array_elements_text(value)::int) into we from public.app_settings where key='weekend_dows';
  we := coalesce(we, array[5,6]);
  if p_enforce_time and (v_dow = any(we)
       or extract(hour from (v_now at time zone 'Asia/Damascus')) < 10) then
    return; -- not yet late / weekend
  end if;
  return query
    select l.id, l.name
    from public.locations l
    join public.center_accounts c on c.location_id = l.id and c.is_active
    where not exists (
      select 1 from public.attendance a
       where a.location_id = l.id
         and a.day = (v_now at time zone 'Asia/Damascus')::date
    );
end $$;

-- ---- Center roster (used by the portal, scoped to one location) -----
create or replace function public.center_roster(p_location uuid)
returns table (id uuid, full_name text, national_id text, remaining_days int) language sql stable as $$
  select b.id, b.full_name, b.national_id, b.remaining_days
  from public.v_employee_balance b
  where b.location_id = p_location and b.is_active
  order by b.full_name;
$$;

-- ---- Safe centers listing for admin (no password hash) -------------
create or replace function public.list_centers()
returns table (id uuid, location_id uuid, location_name text, username text, is_active boolean) language sql stable as $$
  select c.id, c.location_id, l.name, c.username, c.is_active
  from public.center_accounts c join public.locations l on l.id=c.location_id
  order by l.name;
$$;

-- ---- Activity logging for new tables + center login ----------------
create or replace function public.fn_log_attendance()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text; v_loc text;
begin
  select full_name into v_name from public.employees where id=new.employee_id;
  select name into v_loc from public.locations where id=new.location_id;
  insert into public.activity_log(actor, action, entity_type, entity_id, summary, meta)
  values (auth.uid(), tg_op, 'attendance', new.employee_id,
    'تفقّد ('||v_loc||'): '||coalesce(v_name,'—')||' — '||
      case new.status when 'present' then 'حاضر' else 'غائب ('||coalesce(new.reason::text,'')||')' end,
    to_jsonb(new));
  return null;
end $$;
drop trigger if exists trg_log_attendance on public.attendance;
create trigger trg_log_attendance after insert or update on public.attendance
  for each row execute function public.fn_log_attendance();

create or replace function public.log_center_login(p_username text, p_location text)
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log(action, entity_type, summary, meta)
  values ('LOGIN', 'center', 'دخول مركز: '||p_location||' ('||p_username||')',
          jsonb_build_object('username', p_username, 'location', p_location));
$$;

-- ---- RLS for the new tables ----------------------------------------
alter table public.center_accounts enable row level security;
alter table public.attendance      enable row level security;

-- center_accounts: managed by super_admin only (contains hashes)
drop policy if exists ca_admin on public.center_accounts;
create policy ca_admin on public.center_accounts for all
  using (public.is_super_admin()) with check (public.is_super_admin());

-- attendance: central staff read all; centers write via service-role API
drop policy if exists att_read on public.attendance;
create policy att_read on public.attendance for select using (auth.role()='authenticated');
drop policy if exists att_write on public.attendance;
create policy att_write on public.attendance for all
  using (auth.role()='authenticated') with check (auth.role()='authenticated');
