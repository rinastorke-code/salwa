import { createClient } from '@/lib/supabase/server';
import { LateBanner } from '@/components/late-banner';

export const dynamic = 'force-dynamic';

export default async function AttendanceOverview() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: rows } = await supabase
    .from('attendance')
    .select('status, reason, day, employees(full_name), locations(name)')
    .eq('day', today)
    .order('location_id');
  const present = (rows ?? []).filter((r: any) => r.status === 'present').length;
  const absent = (rows ?? []).filter((r: any) => r.status === 'absent').length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">تفقّد اليوم</h1>
      <LateBanner />
      <div className="grid grid-cols-2 gap-3">
        <div className="card"><div className="text-2xl font-bold text-emerald-600">{present}</div><div className="text-xs text-stone-400">حاضر</div></div>
        <div className="card"><div className="text-2xl font-bold text-rose-600">{absent}</div><div className="text-xs text-stone-400">غائب</div></div>
      </div>
      <div className="card p-0">
        <div className="divide-y divide-stone-100">
          {(rows ?? []).length === 0 && <p className="p-4 text-sm text-stone-400">لم تَرِد تفقّدات اليوم بعد.</p>}
          {(rows ?? []).map((r: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-3 text-sm">
              <div><span className="font-medium">{r.employees?.full_name}</span>
                <span className="mr-2 text-xs text-stone-400">{r.locations?.name}</span></div>
              <span className={`badge ${r.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {r.status === 'present' ? 'حاضر' : `غائب${r.reason ? ` · ${r.reason === 'administrative' ? 'إدارية' : r.reason === 'sick' ? 'مرضية' : 'إذن'}` : ''}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
