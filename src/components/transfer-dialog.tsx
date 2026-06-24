'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeftRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Loc = { id: string; name: string };

export function TransferDialog({ employeeId, currentLocation, locations }:
  { employeeId: string; currentLocation: string | null; locations: Loc[] }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function submit() {
    if (!to) return;
    setBusy(true);
    // Atomic: updates employees.location_id + inserts employment_history
    const { error } = await supabase.rpc('transfer_employee', {
      p_employee_id: employeeId, p_to_location: to, p_reason: reason || null,
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    setOpen(false); router.refresh();
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        <ArrowLeftRight size={16} /> نقل الموظف
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
             onClick={() => setOpen(false)}>
          <div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">نقل إلى موقع جديد</h3>
            <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">اختر الموقع…</option>
              {locations.filter((l) => l.id !== currentLocation).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
            <textarea className="input" placeholder="سبب النقل (اختياري)"
              value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
              <button className="btn-primary" onClick={submit} disabled={busy || !to}>
                {busy ? '…' : 'تأكيد النقل'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
