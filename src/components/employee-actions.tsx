'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Power, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function EmployeeActions({ employee, isAdmin }: { employee: any; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(employee.full_name);
  const [nid, setNid] = useState(employee.national_id);
  const [title, setTitle] = useState(employee.job_title ?? '');
  const [phone, setPhone] = useState(employee.phone ?? '');
  const [cap, setCap] = useState(employee.annual_cap_override?.toString() ?? '');
  const router = useRouter();
  const supabase = createClient();

  async function save() {
    const { error } = await supabase.rpc('update_employee', {
      p_id: employee.id, p_full_name: name, p_national_id: nid, p_job_title: title || null, p_phone: phone || null,
    });
    if (error) return alert(error.message);
    // Per-employee leave cap is independent of location/department.
    const { error: capErr } = await supabase
      .from('employees')
      .update({ annual_cap_override: cap === '' ? null : Number(cap) })
      .eq('id', employee.id);
    if (capErr) return alert(capErr.message);
    setEditing(false); router.refresh();
  }
  async function toggleActive() {
    if (!confirm(employee.is_active ? 'إيقاف هذا الموظف؟' : 'إعادة تفعيل الموظف؟')) return;
    const { error } = await supabase.rpc('set_employee_active', { p_id: employee.id, p_active: !employee.is_active });
    if (error) return alert(error.message);
    router.refresh();
  }
  async function hardDelete() {
    if (!confirm('حذف نهائي لا يمكن التراجع عنه. متابعة؟')) return;
    const { error } = await supabase.rpc('hard_delete_employee', { p_id: employee.id });
    if (error) return alert(error.message);
    router.push('/employees');
  }

  return (
    <>
      <button className="btn-ghost" onClick={() => setEditing(true)}><Pencil size={16} /> تعديل</button>
      <button className="btn-ghost" onClick={toggleActive}>
        <Power size={16} /> {employee.is_active ? 'إيقاف' : 'تفعيل'}
      </button>
      {isAdmin && <button className="btn-ghost text-rose-600" onClick={hardDelete}><Trash2 size={16} /> حذف نهائي</button>}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(false)}>
          <div className="card w-full max-w-sm space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">تعديل بيانات الموظف</h3>
            <input className="input" placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input" placeholder="الرقم الوطني" value={nid} onChange={(e) => setNid(e.target.value)} />
            <input className="input" placeholder="المسمى الوظيفي" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="input" placeholder="الهاتف" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div>
              <label className="label">السقف السنوي الخاص بهذا الموظف</label>
              <input className="input" type="number" placeholder="30 (افتراضي إن تُرك فارغاً)" value={cap} onChange={(e) => setCap(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setEditing(false)}>إلغاء</button>
              <button className="btn-primary" onClick={save}>حفظ</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
