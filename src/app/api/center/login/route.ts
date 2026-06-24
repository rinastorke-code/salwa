import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdmin } from '@/lib/supabase/admin';
import { createCenterSession } from '@/lib/center-session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

  const admin = createAdmin();
  const { data: acct } = await admin
    .from('center_accounts')
    .select('id, username, password_hash, is_active, location_id, locations(name)')
    .eq('username', username)
    .single();

  if (!acct || !acct.is_active || !bcrypt.compareSync(password, acct.password_hash)) {
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, { status: 401 });
  }

  const locationName = (acct as any).locations?.name ?? '';
  await createCenterSession({ locationId: acct.location_id, locationName, username: acct.username });
  await admin.rpc('log_center_login', { p_username: acct.username, p_location: locationName });
  return NextResponse.json({ ok: true, locationName });
}
