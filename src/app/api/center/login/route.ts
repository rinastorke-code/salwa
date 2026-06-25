import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createAdmin } from '@/lib/supabase/admin';
import { createCenterSession } from '@/lib/center-session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();
  if (!username || !password) return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });

  const cleanUsername = String(username).trim();
  const admin = createAdmin();

  // NOTE: intentionally NOT using the `locations(name)` embed here.
  // PostgREST embeds depend on its schema-relationship cache, which can be
  // stale right after running new migrations (09/10). When that happens
  // `.single()` throws an error instead of returning a row, and that error
  // was previously being silently discarded — making a perfectly valid
  // username/password look like "incorrect credentials". We fetch the
  // account and the location name as two plain queries instead, and we log
  // (and surface) any real DB error so this doesn't fail silently again.
  const { data: acct, error: acctErr } = await admin
    .from('center_accounts')
    .select('id, username, password_hash, is_active, location_id')
    .eq('username', cleanUsername)
    .maybeSingle();

  if (acctErr) {
    console.error('center login: center_accounts query failed:', acctErr.message);
    return NextResponse.json({ error: 'تعذّر الاتصال بقاعدة البيانات، حاول مجدداً' }, { status: 500 });
  }

  if (!acct || !acct.is_active || !bcrypt.compareSync(password, acct.password_hash)) {
    return NextResponse.json({ error: 'اسم المستخدم أو كلمة السر غير صحيحة' }, { status: 401 });
  }

  const { data: loc } = await admin
    .from('locations')
    .select('name')
    .eq('id', acct.location_id)
    .maybeSingle();
  const locationName = loc?.name ?? '';

  await createCenterSession({ locationId: acct.location_id, locationName, username: acct.username });
  await admin.rpc('log_center_login', { p_username: acct.username, p_location: locationName });
  return NextResponse.json({ ok: true, locationName });
}
