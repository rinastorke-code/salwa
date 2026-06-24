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

// List all central staff accounts (for the settings page)
export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const admin = createAdmin();
  const { data, error } = await admin.from('users_roles').select('user_id, full_name, role, is_active, created_at').order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Pull emails from auth.users via admin API (not exposed in users_roles)
  const { data: authList } = await admin.auth.admin.listUsers();
  const emailOf = new Map((authList?.users ?? []).map((u) => [u.id, u.email]));
  const staff = (data ?? []).map((s) => ({ ...s, email: emailOf.get(s.user_id) ?? '—' }));
  return NextResponse.json({ staff });
}

// Create a new central-staff login (auth user + users_roles row) in one step
export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'هذه الصلاحية للمدير العام فقط' }, { status: 403 });
  const { email, password, full_name, role } = await req.json();
  if (!email || !password || !full_name) return NextResponse.json({ error: 'البريد، كلمة السر، والاسم مطلوبة' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'كلمة السر قصيرة جداً (٦ أحرف على الأقل)' }, { status: 400 });

  const admin = createAdmin();
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authErr || !created.user) return NextResponse.json({ error: authErr?.message ?? 'فشل إنشاء الحساب' }, { status: 500 });

  const { error: roleErr } = await admin.from('users_roles').insert({
    user_id: created.user.id, full_name, role: role === 'super_admin' ? 'super_admin' : 'data_entry',
  });
  if (roleErr) {
    // rollback the auth user so we don't leave an orphaned login with no role
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: roleErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Toggle active / change role for an existing staff member
export async function PATCH(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { user_id, is_active, role } = await req.json();
  const admin = createAdmin();
  const patch: Record<string, unknown> = {};
  if (is_active !== undefined) patch.is_active = is_active;
  if (role) patch.role = role;
  const { error } = await admin.from('users_roles').update(patch).eq('user_id', user_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enforce the flag for real: ban/unban the actual Supabase Auth login,
  // not just a display flag, so a deactivated staff member truly cannot sign in.
  if (is_active !== undefined) {
    await admin.auth.admin.updateUserById(user_id, { ban_duration: is_active ? 'none' : '876000h' });
  }
  return NextResponse.json({ ok: true });
}
