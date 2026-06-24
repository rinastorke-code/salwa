import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ExportButton } from '@/components/export-button';
import { AddEmployee } from '@/components/add-employee';

export const dynamic = 'force-dynamic';

export default async function EmployeesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('v_employee_balance')
    .select('id, full_name, national_id, remaining_days, cap, is_active, location_id')
    .order('full_name')
    .limit(300);
  const { data: locs } = await supabase.from('locations').select('id, name');
  const locMap = new Map((locs ?? []).map((l) => [l.id, l.name]));
  const rows = data ?? [];
  const pdfRows = rows.map((e: any) => [
    e.full_name, e.national_id, locMap.get(e.location_id) ?? '—', e.remaining_days, e.is_active ? 'فعّال' : 'موقوف',
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">الموظفون</h1>
        <div className="flex gap-2">
          <AddEmployee locations={(locs ?? []) as any} />
          <ExportButton title="قائمة الموظفين"
            head={['الاسم', 'الرقم الوطني', 'الموقع', 'الرصيد', 'الحالة']} rows={pdfRows} />
        </div>
      </div>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-right text-xs text-slate-500">
            <tr><th className="p-3">الاسم</th><th className="p-3">الرقم الوطني</th>
              <th className="p-3">الموقع</th><th className="p-3">السقف</th><th className="p-3">الرصيد</th><th className="p-3">الحالة</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((e: any) => (
              <tr key={e.id} className={e.is_active ? 'hover:bg-slate-50' : 'bg-slate-50/60 hover:bg-slate-100'}>
                <td className="p-3"><Link href={`/employees/${e.id}`} className="font-medium text-brand">{e.full_name}</Link></td>
                <td className="p-3 text-slate-500">{e.national_id}</td>
                <td className="p-3 text-slate-500">{locMap.get(e.location_id) ?? '—'}</td>
                <td className="p-3 text-stone-400">{e.cap}</td>
                <td className="p-3"><span className={e.remaining_days <= 3 ? 'text-rose-600 font-semibold' : ''}>{e.remaining_days} يوم</span></td>
                <td className="p-3"><span className={`badge ${e.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{e.is_active ? 'فعّال' : 'موقوف'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
