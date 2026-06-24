'use client';
import { useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';

type Worker = { id: string; full_name: string; remaining_days: number };

export default function CenterLeave() {
  const [roster, setRoster] = useState<Worker[]>([]);
  const [employee, setEmployee] = useState('');
  const [type, setType] = useState<'administrative' | 'sick'>('administrative');
  const [mode, setMode] = useState<'day' | 'hourly'>('day');
  const [days, setDays] = useState(1);
  const [hours, setHours] = useState(1);
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/center/roster').then((r) => r.json()).then((d) => setRoster(d.roster ?? []));
  }, []);

  async function submit() {
    if (!employee) return;
    setBusy(true); setMsg('');
    const res = await fetch('/api/center/leave', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employee_id: employee, type, mode, days, hours, start }),
    });
    setBusy(false);
    setMsg(res.ok ? 'تم رفع الإجازة — بانتظار اعتماد الإدارة المركزية' : 'تعذّر الرفع');
    if (res.ok) setEmployee('');
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">رفع إجازة</h1>
      <div className="card space-y-3">
        <div>
          <label className="label">العامل</label>
          <select className="input" value={employee} onChange={(e) => setEmployee(e.target.value)}>
            <option value="">اختر…</option>
            {roster.map((w) => <option key={w.id} value={w.id}>{w.full_name} (متبقٍ {w.remaining_days})</option>)}
          </select>
        </div>
        <div>
          <label className="label">النوع</label>
          <div className="flex gap-2">
            <button onClick={() => setType('administrative')}
              className={`btn flex-1 ${type === 'administrative' ? 'bg-gold text-white' : 'border border-stone-200 bg-white'}`}>إدارية (تُحسب)</button>
            <button onClick={() => setType('sick')}
              className={`btn flex-1 ${type === 'sick' ? 'bg-gold text-white' : 'border border-stone-200 bg-white'}`}>مرضية (لا تُحسب)</button>
          </div>
        </div>
        {type === 'administrative' && (
          <div>
            <label className="label">المدة</label>
            <div className="flex gap-2">
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
          </div>
        )}
        <div>
          <label className="label">تاريخ البدء</label>
          <input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <button className="btn-primary w-full" onClick={submit} disabled={busy || !employee}>
          <CalendarPlus size={16} /> {busy ? '…' : 'رفع الإجازة'}
        </button>
        {msg && <p className="rounded-xl bg-stone-100 p-3 text-center text-sm">{msg}</p>}
      </div>
    </div>
  );
}
