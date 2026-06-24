'use client';
import { useEffect, useState } from 'react';
import { UserPlus, Power } from 'lucide-react';

type Staff = { user_id: string; email: string; full_name: string; role: string; is_active: boolean };

export function StaffManager() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'data_entry' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/staff');
    const d = await res.json();
    setStaff(d.staff ?? []); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!form.email || !form.password || !form.full_name) return;
    setBusy(true); setMsg('');
    const res = await fetch('/api/admin/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) { setMsg(d.error); return; }
    setForm({ email: '', password: '', full_name: '', role: 'data_entry' });
    setMsg('تم إنشاء الحساب بنجاح'); load();
  }
  async function toggle(s: Staff) {
    if (!confirm(s.is_active ? `إيقاف حساب ${s.full_name}؟ لن يستطيع تسجيل الدخول.` : `إعادة تفعيل ${s.full_name}؟`)) return;
    await fetch('/api/admin/staff', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: s.user_id, is_active: !s.is_active }) });
    load();
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">موظفو الشؤون الإدارية (حسابات الدخول)</h2>
      <div className="card space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="الاسم الكامل" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="data_entry">مساعد إدخال</option>
            <option value="super_admin">مدير عام</option>
          </select>
          <input className="input" placeholder="البريد الإلكتروني" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className="input" type="password" placeholder="كلمة السر (٦ أحرف فأكثر)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={create} disabled={busy}><UserPlus size={16} /> {busy ? '…' : 'إنشاء حساب'}</button>
        {msg && <p className="rounded-xl bg-stone-100 p-2 text-xs">{msg}</p>}
      </div>

      <div className="card divide-y divide-stone-100 p-0">
        {loading && <p className="p-4 text-sm text-stone-400">…</p>}
        {!loading && staff.length === 0 && <p className="p-4 text-sm text-stone-400">لا يوجد موظفون بعد.</p>}
        {staff.map((s) => (
          <div key={s.user_id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <div className="font-medium">{s.full_name} <span className="text-xs text-stone-400">({s.email})</span></div>
              <div className="text-xs text-stone-400">{s.role === 'super_admin' ? 'مدير عام' : 'مساعد إدخال'}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${s.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{s.is_active ? 'فعّال' : 'موقوف'}</span>
              <button className="btn-ghost" onClick={() => toggle(s)}><Power size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
