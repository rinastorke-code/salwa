-- =====================================================================
-- 05_seed.sql : optional demo data
-- Run AFTER creating your auth users, then map them in users_roles.
-- =====================================================================

-- Location hierarchy: Governorate > Directorate > Departments
with gov as (
  insert into public.locations (name, type) values ('محافظة اللاذقية', 'governorate')
  returning id
), dir as (
  insert into public.locations (name, type, parent_id)
  select 'مديرية الشؤون الاجتماعية والعمل', 'directorate', id from gov
  returning id
)
insert into public.locations (name, type, parent_id)
select v.n, 'department', dir.id from dir,
  (values ('قسم العمل'), ('قسم الشؤون الاجتماعية'), ('قسم الموارد البشرية')) as v(n);

-- Sample employees (attach to first department)
insert into public.employees (full_name, national_id, location_id, hire_date, annual_leave_balance, job_title)
select v.fn, v.nid,
       (select id from public.locations where type = 'department' limit 1),
       v.hd::date, v.bal, v.jt
from (values
  ('أحمد محمود العلي', '03010012345', '2019-03-01', 30, 'كاتب'),
  ('سلمى يوسف خضر',   '03020023456', '2021-06-15', 12, 'باحث اجتماعي'),
  ('فادي ناصر حسن',    '03030034567', '2017-09-10',  4, 'مدقق')
) as v(fn, nid, hd, bal, jt)
on conflict (national_id) do nothing;

-- Map your super_admin auth user (replace the UUID with a real auth.users id):
-- insert into public.users_roles (user_id, full_name, role)
-- values ('00000000-0000-0000-0000-000000000000', 'المدير العام', 'super_admin');
