'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Loc = { id: string; name: string; type: string; annual_cap: number | null };
type Center = { id: string; location_id: string; location_name: string; username: string; is_active: boolean };

export function SettingsClient({ locations, centers }: { locations: Loc[]; centers: Center[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [caps, setCaps] = useState<Record<string, string>>(
    Object.fromEntries(locations.map((l) => [l.id, l.annual_cap?.toString() ?? '']))
  );
  const [form, setForm] = useState({ location_id: '', username: '', password: '' });
  const [msg, setMsg] = useState('');

  async function saveCap(id: string) {
    const v = caps[id] === '' ? null : Number(caps[id]);
    const { error } = await supabase.from('locations').update({ annual_cap: v }).eq('id', id);
    setMsg(error ? error.message : 'تم حفظ السقف');
    router.refresh();
  }
  async function saveCenter() {
    if (!form.location_id || !form.username || !form.password) return;
    const res = await fetch('/api/admin/center', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    });
    const d = await res.json();
    setMsg(res.ok ? 'تم إنشاء/تحديث حساب المركز' : d.error);
    if (res.ok) { setForm({ location_id: '', username: '', password: '' }); router.refresh(); }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">الإعدادات</h1>

      <section className="card space-y-3">
        <h2 className="font-semibold">السقف الافتراضي المقترح حسب الموقع</h2>
        <p className="text-xs text-stone-400">
          هذا سقف افتراضي يُقترح فقط عند إضافة موظف جديد في هذا الموقع. السقف الفعلي
          لكل موظف يُحدَّد ويُعدَّل بشكل فردي ومستقل من ملفه الشخصي (لأنه قد يختلف
          من شخص لآخر حتى داخل نفس المركز).
        </p>
        <div className="divide-y divide-stone-100">
          {locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm">{l.name}</span>
              <div className="flex items-center gap-2">
                <input className="input w-24" type="number" placeholder="30"
                  value={caps[l.id]} onChange={(e) => setCaps((c) => ({ ...c, [l.id]: e.target.value }))} />
                <button className="btn-ghost" onClick={() => saveCap(l.id)}><Save size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">حسابات بوابات المراكز</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          <select className="input" value={form.location_id} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
            <option value="">اختر المركز…</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <input className="input" placeholder="اسم المستخدم" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="input" placeholder="كلمة السر" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={saveCenter}><KeyRound size={16} /> إنشاء / إعادة تعيين</button>

        <div className="divide-y divide-stone-100 pt-2">
          {centers.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span>{c.location_name} — <span className="text-stone-500">{c.username}</span></span>
              <span className={`badge ${c.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {c.is_active ? 'مفعّل' : 'موقوف'}
              </span>
            </div>
          ))}
          {centers.length === 0 && <p className="py-2 text-sm text-stone-400">لا توجد مراكز بعد.</p>}
        </div>
      </section>

      {msg && <p className="rounded-xl bg-stone-100 p-3 text-center text-sm">{msg}</p>}
    </div>
  );
}
