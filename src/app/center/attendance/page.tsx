'use client';
import { useEffect, useState } from 'react';
import { Check, X, Save } from 'lucide-react';

type Worker = { id: string; full_name: string; national_id: string; remaining_days: number };
type State = Record<string, { status: 'present' | 'absent'; reason?: string; hours?: number }>;

const REASONS = [
  { v: 'administrative', l: 'إجازة إدارية' },
  { v: 'sick', l: 'مرضية' },
  { v: 'permission', l: 'إذن' },
];

export default function CenterAttendance() {
  const [loc, setLoc] = useState('');
  const [roster, setRoster] = useState<Worker[]>([]);
  const [state, setState] = useState<State>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState('');
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetch('/api/center/roster').then((r) => r.json()).then((d) => {
      setLoc(d.locationName); setRoster(d.roster ?? []);
      const init: State = {};
      (d.roster ?? []).forEach((w: Worker) => (init[w.id] = { status: 'present' }));
      (d.today ?? []).forEach((a: any) => (init[a.employee_id] = { status: a.status, reason: a.reason, hours: a.hours }));
      setState(init); setLoading(false);
    });
  }, []);

  const set = (id: string, patch: any) => setState((s) => ({ ...s, [id]: { ...s[id], ...patch } }));

  async function save() {
    setSaved('');
    const entries = roster.map((w) => ({
      employee_id: w.id, status: state[w.id].status,
      reason: state[w.id].status === 'absent' ? state[w.id].reason ?? 'administrative' : null,
      hours: state[w.id].reason === 'administrative' ? state[w.id].hours ?? null : null,
    }));
    const res = await fetch('/api/center/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day: today, entries }),
    });
    const d = await res.json();
    setSaved(res.ok ? `تم حفظ تفقّد ${d.saved} عامل` : 'تعذّر الحفظ');
  }

  if (loading) return <p className="p-6 text-center text-sm text-stone-400">…جارٍ التحميل</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">تفقّد اليوم — {loc}</h1>
          <p className="text-xs text-stone-400">{today}</p>
        </div>
      </div>

      {roster.length === 0 && <p className="card text-sm text-stone-400">لا يوجد عمال مسجّلون لهذا المركز. تُضاف الأسماء من الإدارة المركزية.</p>}

      <div className="space-y-2">
        {roster.map((w) => {
          const st = state[w.id];
          const absent = st?.status === 'absent';
          return (
            <div key={w.id} className="card p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{w.full_name}</div>
                  <div className="text-[11px] text-stone-400">متبقٍ {w.remaining_days} يوم</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => set(w.id, { status: 'present' })}
                    className={`btn px-3 ${!absent ? 'bg-emerald-600 text-white' : 'border border-stone-200 bg-white text-stone-500'}`}>
                    <Check size={16} /> حاضر
                  </button>
                  <button onClick={() => set(w.id, { status: 'absent', reason: st?.reason ?? 'administrative' })}
                    className={`btn px-3 ${absent ? 'bg-rose-600 text-white' : 'border border-stone-200 bg-white text-stone-500'}`}>
                    <X size={16} /> غائب
                  </button>
                </div>
              </div>
              {absent && (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-2">
                  <select className="input flex-1" value={st.reason ?? 'administrative'}
                    onChange={(e) => set(w.id, { reason: e.target.value })}>
                    {REASONS.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                  {st.reason === 'administrative' && (
                    <input className="input w-28" type="number" min={1} max={8} placeholder="ساعات (اختياري)"
                      value={st.hours ?? ''} onChange={(e) => set(w.id, { hours: e.target.value ? Number(e.target.value) : undefined })} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {roster.length > 0 && (
        <button className="btn-primary sticky bottom-20 w-full" onClick={save}><Save size={16} /> حفظ التفقّد</button>
      )}
      {saved && <p className="rounded-xl bg-emerald-50 p-3 text-center text-sm text-emerald-700">{saved}</p>}
    </div>
  );
}
