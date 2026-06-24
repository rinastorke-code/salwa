'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';

type Loc = { id: string; name: string; type: string; parent_id: string | null; annual_cap: number | null };

const TYPES = [
  { v: 'governorate', l: 'محافظة' }, { v: 'directorate', l: 'مديرية' },
  { v: 'department', l: 'مركز/قسم' }, { v: 'office', l: 'مكتب' },
];

function Form({ initial, locations, onSave, onCancel }: {
  initial?: Partial<Loc>; locations: Loc[];
  onSave: (v: { name: string; type: string; parent_id: string; annual_cap: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.type ?? 'department');
  const [parent, setParent] = useState(initial?.parent_id ?? '');
  const [cap, setCap] = useState(initial?.annual_cap?.toString() ?? '');
  return (
    <div className="card w-full max-w-sm space-y-3">
      <h3 className="font-semibold">{initial?.name ? 'تعديل الموقع' : 'موقع جديد'}</h3>
      <div><label className="label">الاسم</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: مركز جبلة" /></div>
      <div><label className="label">النوع</label>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
      </div>
      <div><label className="label">يتبع لـ (اختياري)</label>
        <select className="input" value={parent} onChange={(e) => setParent(e.target.value)}>
          <option value="">بلا (مستوى أعلى)</option>
          {locations.filter((l) => l.id !== initial?.id).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      <div><label className="label">السقف السنوي الافتراضي لهذا الموقع (اختياري)</label>
        <input className="input" type="number" placeholder="30 (افتراضي)" value={cap} onChange={(e) => setCap(e.target.value)} />
        <p className="mt-1 text-[11px] text-stone-400">هذا فقط اقتراح مبدئي؛ سقف كل موظف يُحدَّد ويُعدَّل فردياً من ملفه الشخصي.</p>
      </div>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onCancel}>إلغاء</button>
        <button className="btn-primary" onClick={() => onSave({ name, type, parent_id: parent, annual_cap: cap })} disabled={!name}>حفظ</button>
      </div>
    </div>
  );
}

export function LocationManager({ locations }: { locations: Loc[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Loc | null>(null);
  const [msg, setMsg] = useState('');
  const router = useRouter();

  async function create(v: any) {
    const res = await fetch('/api/admin/locations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    const d = await res.json();
    if (!res.ok) { setMsg(d.error); return; }
    setAdding(false); router.refresh();
  }
  async function update(v: any) {
    const res = await fetch('/api/admin/locations', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing!.id, ...v }) });
    const d = await res.json();
    if (!res.ok) { setMsg(d.error); return; }
    setEditing(null); router.refresh();
  }
  async function remove(l: Loc) {
    if (!confirm(`حذف "${l.name}"؟ لا يمكن التراجع.`)) return;
    const res = await fetch('/api/admin/locations', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id }) });
    const d = await res.json();
    if (!res.ok) { alert(d.error); return; }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">المواقع والمراكز</h2>
        <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={16} /> موقع جديد</button>
      </div>
      {msg && <p className="rounded-xl bg-rose-50 p-2 text-xs text-rose-700">{msg}</p>}
      <div className="card divide-y divide-stone-100 p-0">
        {locations.map((l) => (
          <div key={l.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="font-medium">{l.name}</span>
              <span className="mr-2 badge bg-stone-100 text-stone-500">{TYPES.find((t) => t.v === l.type)?.l ?? l.type}</span>
              {l.annual_cap != null && <span className="mr-2 text-xs text-stone-400">سقف مقترح: {l.annual_cap}</span>}
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost" onClick={() => setEditing(l)}><Pencil size={14} /></button>
              <button className="btn-ghost text-rose-600" onClick={() => remove(l)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {locations.length === 0 && <p className="p-4 text-sm text-stone-400">لا توجد مواقع بعد.</p>}
      </div>

      {(adding || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => { setAdding(false); setEditing(null); }}>
          <div onClick={(e) => e.stopPropagation()}>
            <Form initial={editing ?? undefined} locations={locations}
              onSave={editing ? update : create} onCancel={() => { setAdding(false); setEditing(null); }} />
          </div>
        </div>
      )}
    </div>
  );
}
