import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

async function requireSuperAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users_roles').select('role').eq('user_id', user.id).single();
  return data?.role === 'super_admin' ? user : null;
}

// Create a new location (center/department/...)
export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'هذه الصلاحية للمدير العام فقط' }, { status: 403 });
  const { name, type, parent_id, annual_cap } = await req.json();
  if (!name || !type) return NextResponse.json({ error: 'الاسم والنوع مطلوبان' }, { status: 400 });
  const admin = createAdmin();
  const { data, error } = await admin
    .from('locations')
    .insert({ name, type, parent_id: parent_id || null, annual_cap: annual_cap ? Number(annual_cap) : null })
    .select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// Update an existing location
export async function PATCH(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'هذه الصلاحية للمدير العام فقط' }, { status: 403 });
  const { id, name, type, parent_id, annual_cap } = await req.json();
  if (!id) return NextResponse.json({ error: 'المعرّف مطلوب' }, { status: 400 });
  if (parent_id === id) return NextResponse.json({ error: 'لا يمكن أن يكون الموقع أباً لنفسه' }, { status: 400 });
  const admin = createAdmin();
  const { error } = await admin
    .from('locations')
    .update({ name, type, parent_id: parent_id || null, annual_cap: annual_cap === '' || annual_cap == null ? null : Number(annual_cap) })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Delete a location — BLOCKED if employees or child locations still reference it
export async function DELETE(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'هذه الصلاحية للمدير العام فقط' }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'المعرّف مطلوب' }, { status: 400 });
  const admin = createAdmin();

  const { count: empCount } = await admin.from('employees').select('id', { count: 'exact', head: true }).eq('location_id', id);
  if ((empCount ?? 0) > 0) {
    return NextResponse.json({ error: `لا يمكن الحذف: يوجد ${empCount} موظف مرتبط بهذا الموقع. انقلهم أولاً.` }, { status: 409 });
  }
  const { count: childCount } = await admin.from('locations').select('id', { count: 'exact', head: true }).eq('parent_id', id);
  if ((childCount ?? 0) > 0) {
    return NextResponse.json({ error: `لا يمكن الحذف: يوجد ${childCount} موقع فرعي تابع له.` }, { status: 409 });
  }
  // Detach any center account first (FK cascade handles it, but be explicit)
  await admin.from('center_accounts').delete().eq('location_id', id);
  const { error } = await admin.from('locations').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
