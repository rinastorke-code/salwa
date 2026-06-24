import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/auth';
import { TransferDialog } from '@/components/transfer-dialog';
import { EmployeeActions } from '@/components/employee-actions';
import { LeaveRow } from '@/components/leave-actions';
import { CalendarDays, MapPin, IdCard, Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Employee360({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const role = await getRole();
  const isAdmin = role === 'super_admin';

  const { data: emp } = await supabase.from('employees').select('*, locations(id, name)').eq('id', params.id).single();
  if (!emp) notFound();
  const { data: bal } = await supabase.from('v_employee_balance')
    .select('remaining_days, used_annual_days, used_hourly_hours, hourly_accumulator')
    .eq('id', params.id).single();

  const [{ data: leaves }, { data: history }, { data: locations }] = await Promise.all([
    supabase.from('leaves').select('*').eq('employee_id', params.id).order('start_date', { ascending: false }),
    supabase.from('employment_history').select('*, from:from_location_id(name), to:to_location_id(name)')
      .eq('employee_id', params.id).order('changed_at', { ascending: false }),
    supabase.from('locations').select('id, name').order('name'),
  ]);

  const facts = [
    { Icon: IdCard, label: 'الرقم الوطني', value: emp.national_id },
    { Icon: MapPin, label: 'الموقع', value: emp.locations?.name ?? '—' },
    { Icon: CalendarDays, label: 'تاريخ التعيين', value: emp.hire_date },
    { Icon: Wallet, label: 'الرصيد المتبقي', value: `${bal?.remaining_days ?? 0} يوم` },
  ];

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{emp.full_name}{!emp.is_active && <span className="badge mr-2 bg-rose-50 text-rose-600">موقوف</span>}</h1>
          <p className="text-sm text-slate-400">{emp.job_title ?? 'موظف'}</p>
        </div>
        <div className="flex gap-2">
          <TransferDialog employeeId={emp.id} currentLocation={emp.locations?.id ?? null} locations={(locations ?? []) as any} />
          <EmployeeActions employee={emp} isAdmin={isAdmin} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="card flex items-center gap-2">
            <f.Icon size={20} className="text-brand" />
            <div><div className="text-xs text-slate-400">{f.label}</div><div className="text-sm font-medium">{f.value}</div></div>
          </div>
        ))}
        <div className="card"><div className="text-xs text-slate-400">رصيد الساعات المتراكم</div><div className="text-sm font-medium">{bal?.hourly_accumulator ?? 0} / 8 ساعة</div></div>
        <div className="card"><div className="text-xs text-slate-400">أيام مستهلكة</div><div className="text-sm font-medium">{bal?.used_annual_days ?? 0} يوم</div></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">سجل الإجازات</h2>
          <div className="divide-y divide-slate-100">
            {(leaves ?? []).length === 0 && <p className="py-3 text-sm text-slate-400">لا يوجد.</p>}
            {(leaves ?? []).map((l: any) => <LeaveRow key={l.id} leave={l} canEdit={true} />)}
          </div>
        </div>
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">سجل النقل</h2>
          <div className="divide-y divide-slate-100">
            {(history ?? []).length === 0 && <p className="py-3 text-sm text-slate-400">لا يوجد.</p>}
            {(history ?? []).map((h: any) => (
              <div key={h.id} className="py-2 text-sm">
                <span className="text-slate-500">{h.from?.name ?? '—'}</span><span className="mx-2">←</span>
                <span className="font-medium">{h.to?.name ?? '—'}</span>
                <div className="text-xs text-slate-400">{new Date(h.changed_at).toLocaleDateString('ar')}{h.reason ? ` · ${h.reason}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
