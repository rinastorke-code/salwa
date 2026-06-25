import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { getCenterSession } from '@/lib/center-session';
export const runtime = 'nodejs';

// Body: { day, entries: [{ employee_id, status, reason?, hours? }] }
export async function POST(req: NextRequest) {
  const s = await getCenterSession();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { day, entries } = await req.json();
  const admin = createAdmin();

  // تم تصحيح s.locationId إلى s.location_id ليتطابق مع نوع الجلسة الصحيح
  const { data: emp } = await admin
    .from('employees')
    .select('id')
    .eq('id', employee_id)
    .eq('location_id', s.location_id)
    .single();

  if (!emp) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let p_type = type, p_end = null as string | null, p_hours = null as number | null;

  let saved = 0;
  for (const e of entries ?? []) {
    if (!allowed.has(e.employee_id)) continue; // reject foreign ids silently
    const { error } = await admin.rpc('record_center_attendance', {
      p_employee: e.employee_id, p_location: s.location_id, p_day: day,
      p_status: e.status, p_reason: e.reason ?? null, p_hours: e.hours ?? null,
    });
    if (!error) saved++;
  }
  return NextResponse.json({ ok: true, saved });
}
