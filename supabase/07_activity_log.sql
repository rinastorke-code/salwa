-- =====================================================================
-- 07_activity_log.sql : Unified audit / activity log
-- =====================================================================

create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  actor       uuid references auth.users(id),
  action      text not null,            -- INSERT | UPDATE | DELETE | IMPORT
  entity_type text not null,            -- employee | leave | location | transfer | import
  entity_id   uuid,
  summary     text not null,            -- human-readable Arabic line
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_activity_created on public.activity_log(created_at desc);
create index if not exists idx_activity_entity  on public.activity_log(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- Generic trigger: builds a readable summary per table/operation
-- ---------------------------------------------------------------------
create or replace function public.fn_log_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_summary text;
  v_entity  text;
  v_id      uuid;
  v_name    text;
begin
  if tg_table_name = 'employees' then
    v_entity := 'employee';
    if tg_op = 'INSERT' then v_id := new.id; v_summary := 'إضافة موظف: ' || new.full_name;
    elsif tg_op = 'UPDATE' then
      v_id := new.id;
      if new.is_active = false and old.is_active = true then v_summary := 'إيقاف الموظف: ' || new.full_name;
      elsif new.is_active = true and old.is_active = false then v_summary := 'إعادة تفعيل الموظف: ' || new.full_name;
      else v_summary := 'تعديل بيانات الموظف: ' || new.full_name; end if;
    else v_id := old.id; v_summary := 'حذف موظف: ' || old.full_name; end if;

  elsif tg_table_name = 'leaves' then
    v_entity := 'leave';
    if tg_op = 'DELETE' then
      v_id := old.id;
      select full_name into v_name from public.employees where id = old.employee_id;
      v_summary := 'حذف إجازة (' || old.type || ') للموظف ' || coalesce(v_name,'—');
    else
      v_id := new.id;
      select full_name into v_name from public.employees where id = new.employee_id;
      v_summary := (case when tg_op='INSERT' then 'تسجيل' else 'تعديل' end)
                || ' إجازة (' || new.type || ') للموظف ' || coalesce(v_name,'—');
    end if;

  elsif tg_table_name = 'locations' then
    v_entity := 'location';
    if tg_op='DELETE' then v_id:=old.id; v_summary:='حذف موقع: '||old.name;
    elsif tg_op='INSERT' then v_id:=new.id; v_summary:='إضافة موقع: '||new.name;
    else v_id:=new.id; v_summary:='تعديل موقع: '||new.name; end if;

  elsif tg_table_name = 'employment_history' then
    v_entity := 'transfer'; v_id := new.employee_id;
    select full_name into v_name from public.employees where id = new.employee_id;
    v_summary := 'نقل الموظف ' || coalesce(v_name,'—');
  else
    v_entity := tg_table_name; v_summary := tg_op || ' on ' || tg_table_name;
  end if;

  insert into public.activity_log(actor, action, entity_type, entity_id, summary, meta)
  values (auth.uid(), tg_op, v_entity, v_id, v_summary,
          jsonb_build_object('table', tg_table_name,
                             'new', case when tg_op<>'DELETE' then to_jsonb(new) end,
                             'old', case when tg_op<>'INSERT' then to_jsonb(old) end));
  return null; -- AFTER trigger
end $$;

-- Attach to the meaningful tables
drop trigger if exists trg_log_employees on public.employees;
create trigger trg_log_employees after insert or update or delete on public.employees
  for each row execute function public.fn_log_activity();

drop trigger if exists trg_log_leaves on public.leaves;
create trigger trg_log_leaves after insert or update or delete on public.leaves
  for each row execute function public.fn_log_activity();

drop trigger if exists trg_log_locations on public.locations;
create trigger trg_log_locations after insert or update or delete on public.locations
  for each row execute function public.fn_log_activity();

drop trigger if exists trg_log_transfer on public.employment_history;
create trigger trg_log_transfer after insert on public.employment_history
  for each row execute function public.fn_log_activity();

-- RLS: readable by staff; written only by the SECURITY DEFINER triggers
alter table public.activity_log enable row level security;
drop policy if exists act_read on public.activity_log;
create policy act_read on public.activity_log for select using (auth.role() = 'authenticated');

-- Helper used by the bulk-import API to log a one-line summary
create or replace function public.log_import(p_summary text, p_meta jsonb default '{}')
returns void language sql security definer set search_path = public as $$
  insert into public.activity_log(actor, action, entity_type, summary, meta)
  values (auth.uid(), 'IMPORT', 'import', p_summary, p_meta);
$$;
