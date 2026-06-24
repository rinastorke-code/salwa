'use client';
import { useRouter } from 'next/navigation';
import { Check, X, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function ConfirmList({ rows }: { rows: any[] }) {
  const router = useRouter();
  const supabase = createClient();
  async function act(id: string, ok: boolean) {
    const { error } = await supabase.rpc(ok ? 'confirm_leave' : 'reject_leave', { p_id: id });
    if (error) return alert(error.message);
    router.refresh();
  }
  if (rows.length === 0) return <div className="card text-sm text-stone-400">لا توجد اعتمادات معلّقة.</div>;
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.id} className="card flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{r.employees?.full_name}</span>
              {r.over_cap && <span className="badge bg-amber-50 text-amber-700"><AlertTriangle size={12} /> تجاوز السقف</span>}
              {r.source === 'center' && <span className="badge bg-stone-100 text-stone-500">من مركز</span>}
            </div>
            <div className="text-xs text-stone-400">
              {r.employees?.locations?.name ?? '—'} · {r.type === 'sick' ? 'مرضية' : r.type === 'hourly' ? `إدارية ${r.hours_count}س` : 'إدارية'} · {r.start_date}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button className="btn bg-emerald-600 px-3 text-white" onClick={() => act(r.id, true)}><Check size={16} /> اعتماد</button>
            <button className="btn border border-stone-200 bg-white px-3 text-rose-600" onClick={() => act(r.id, false)}><X size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}
