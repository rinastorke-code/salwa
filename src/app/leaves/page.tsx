import { createClient } from '@/lib/supabase/server';
import { LeaveForm } from '@/components/leave-form';
import { LeaveRow } from '@/components/leave-actions';

export const dynamic = 'force-dynamic';

export default async function LeavesPage() {
  const supabase = createClient();
  const [{ data: employees }, { data: leaves }] = await Promise.all([
    supabase.from('employees').select('id, full_name').eq('is_active', true).order('full_name'),
    supabase.from('leaves').select('*, employees(full_name)').order('created_at', { ascending: false }).limit(60),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">الإجازات</h1>
      <LeaveForm employees={(employees ?? []) as any} />
      <div className="card">
        <h2 className="mb-2 text-sm font-semibold">أحدث الإجازات</h2>
        <div className="divide-y divide-slate-100">
          {(leaves ?? []).length === 0 && <p className="py-3 text-sm text-slate-400">لا يوجد.</p>}
          {(leaves ?? []).map((l: any) => (
            <div key={l.id}>
              <div className="pt-1 text-xs font-medium text-slate-500">{l.employees?.full_name}</div>
              <LeaveRow leave={l} canEdit={true} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
