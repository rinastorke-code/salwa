import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

// Create or reset a center account (super_admin only)
export async function POST(req: NextRequest) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { location_id, username, password, is_active } = await req.json();
  if (!location_id || !username || !password) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
  const cleanUsername = String(username).trim();
  const admin = createAdmin();
  const password_hash = bcrypt.hashSync(password, 10);
  const { error } = await admin.from('center_accounts')
    .upsert({ location_id, username: cleanUsername, password_hash, is_active: is_active ?? true }, { onConflict: 'location_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
