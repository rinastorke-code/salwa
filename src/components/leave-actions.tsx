'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Pencil } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function LeaveRow({ leave, canEdit }: { leave: any; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(leave.start_date);
  const [end, setEnd] = useState(leave.end_date ?? '');
  const [hours, setHours] = useState(leave.hours_count ?? '');
  const router = useRouter();
  const supabase = createClient();

  async function del() {
    if (!confirm('حذف هذه الإجازة؟ سيُعاد احتساب الرصيد تلقائياً.')) return;
    const { error } = await supabase.rpc('delete_leave', { p_id: leave.id });
    if (error) return alert(error.message);
    router.refresh();
  }
  async function save() {
    const { error } = await supabase.rpc('update_leave', {
      p_id: leave.id, p_start: start, p_end: end || null,
      p_hours: leave.type === 'hourly' ? Number(hours) : null,
    });
    if (error) return alert(error.message);
    setEditing(false); router.refresh();
  }

  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex-1">
        <span>{leave.type}{leave.type === 'hourly' ? ` (${leave.hours_count} س)` : ''}</span>
        <span className="mr-2 text-xs text-slate-400">{leave.start_date}{leave.end_date ? ` ← ${leave.end_date}` : ''}</span>
        {leave.document_url && <a className="mr-2 text-xs text-brand underline" href={leave.document_url} target="_blank">الوثيقة</a>}
      </div>
      {canEdit && (
        <div className="flex gap-1">
          <button className="p-1 text-slate-400 hover:text-brand" onClick={() => setEditing(true)}><Pencil size={15} /></button>
          <button className="p-1 text-slate-400 hover:text-rose-600" onClick={del}><Trash2 size={15} /></button>
        </div>
      )}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(false)}>
          <div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">تعديل الإجازة</h3>
            <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            {leave.type === 'hourly'
              ? <input className="input" type="number" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="الساعات" />
              : <input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="إلى" />}
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
