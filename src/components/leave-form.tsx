'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Emp = { id: string; full_name: string };

export function LeaveForm({ employees }: { employees: Emp[] }) {
  const [employeeId, setEmployeeId] = useState('');
  const [type, setType] = useState<'administrative' | 'sick'>('administrative');
  const [mode, setMode] = useState<'day' | 'hourly'>('day');
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(1);
  const [start, setStart] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const supabase = createClient();

  async function submit() {
    if (!employeeId || !start) return;
    setBusy(true); setMsg('');
    let document_url: string | null = null;
    if (file && type === 'sick') {
      const path = `${employeeId}/${Date.now()}-${file.name}`;
      const { error: up } = await supabase.storage.from('leave-docs').upload(path, file);
      if (!up) {
        const { data } = await supabase.storage.from('leave-docs').createSignedUrl(path, 60 * 60 * 24 * 365);
        document_url = data?.signedUrl ?? null;
      }
    }
    let p_type: string = type, p_end: string | null = null, p_hours: number | null = null;
    if (type === 'administrative' && mode === 'hourly') { p_type = 'hourly'; p_hours = hours; }
    else if (type === 'administrative') {
      const e = new Date(start); e.setDate(e.getDate() + days - 1); p_end = e.toISOString().slice(0, 10);
    } else { p_end = start; }

    const { error } = await supabase.rpc('record_leave', {
      p_employee: employeeId, p_type, p_start: start, p_end, p_hours, p_doc: document_url, p_force: false,
    });
    setBusy(false);
    if (error) { alert(error.message); return; }
    setMsg(type === 'administrative'
      ? 'تم تسجيل الإجازة (إن تجاوزت السقف تُحوَّل تلقائياً لقائمة الاعتماد).'
      : 'تم تسجيل الإجازة المرضية (لا تُخصم من الرصيد).');
    setEmployeeId(''); setStart(''); setFile(null);
    router.refresh();
  }

  return (
    <div className="card grid gap-3 sm:grid-cols-2">
      <select className="input sm:col-span-2" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
        <option value="">اختر الموظف…</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
      </select>

      <div className="flex gap-2 sm:col-span-2">
        <button onClick={() => setType('administrative')}
          className={`btn flex-1 ${type === 'administrative' ? 'bg-gold text-white' : 'border border-stone-200 bg-white'}`}>إدارية (تُحسب)</button>
        <button onClick={() => setType('sick')}
          className={`btn flex-1 ${type === 'sick' ? 'bg-gold text-white' : 'border border-stone-200 bg-white'}`}>مرضية (لا تُحسب)</button>
      </div>

      {type === 'administrative' && (
        <div className="flex gap-2 sm:col-span-2">
          <select className="input w-28" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="day">أيام</option><option value="hourly">ساعات</option>
          </select>
          {mode === 'day'
            ? <select className="input flex-1" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map((d) => <option key={d} value={d}>{d} يوم</option>)}
              </select>
            : <select className="input flex-1" value={hours} onChange={(e) => setHours(Number(e.target.value))}>
                {[1, 2, 3, 4, 5, 6, 7].map((h) => <option key={h} value={h}>{h} ساعة</option>)}
              </select>}
        </div>
      )}

      <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
      {type === 'sick' && (
        <input className="input" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      )}
      <button className="btn-primary sm:col-span-2" onClick={submit} disabled={busy}>{busy ? '…' : 'تسجيل الإجازة'}</button>
      {msg && <p className="sm:col-span-2 rounded-xl bg-stone-100 p-2 text-center text-xs">{msg}</p>}
    </div>
  );
}
