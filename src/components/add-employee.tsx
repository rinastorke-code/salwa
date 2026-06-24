'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Loc = { id: string; name: string };

export function AddEmployee({ locations }: { locations: Loc[] }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ full_name: '', national_id: '', location_id: '', job_title: '', annual_cap_override: '' });
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function save() {
    if (!f.full_name || !f.national_id) return;
    setBusy(true);
    const { error } = await supabase.from('employees').insert({
      full_name: f.full_name, national_id: f.national_id,
      location_id: f.location_id || null, job_title: f.job_title || null,
      annual_cap_override: f.annual_cap_override ? Number(f.annual_cap_override) : null,
    });
    setBusy(false);
    if (error) return alert(error.message);
    setOpen(false); setF({ full_name: '', national_id: '', location_id: '', job_title: '', annual_cap_override: '' });
    router.refresh();
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}><UserPlus size={16} /> موظف جديد</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">إضافة موظف</h3>
            <input className="input" placeholder="الاسم الكامل" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
            <input className="input" placeholder="الرقم الوطني" value={f.national_id} onChange={(e) => setF({ ...f, national_id: e.target.value })} />
            <select className="input" value={f.location_id} onChange={(e) => setF({ ...f, location_id: e.target.value })}>
              <option value="">الموقع/المركز…</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input className="input" placeholder="المسمى الوظيفي" value={f.job_title} onChange={(e) => setF({ ...f, job_title: e.target.value })} />
            <input className="input" type="number" placeholder="سقف خاص (اختياري)" value={f.annual_cap_override} onChange={(e) => setF({ ...f, annual_cap_override: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save} disabled={busy}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
