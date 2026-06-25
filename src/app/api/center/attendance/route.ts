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

  // Verify every employee belongs to THIS center before writing (isolation guard)
  const { data: mine } = await admin.from('employees').select('id').eq('location_id', s.location_id);
  const allowed = new Set((mine ?? []).map((e) => e.id));

  let saved = 0;
  for (const e of entries ?? []) {
    if (!allowed.has(e.employee_id)) continue; // reject foreign ids silently
    const { error } = await admin.rpc('record_center_attendance', {
      p_employee: e.employee_id, p_location: s.locationId, p_day: day,
      p_status: e.status, p_reason: e.reason ?? null, p_hours: e.hours ?? null,
    });
    if (!error) saved++;
  }
  return NextResponse.json({ ok: true, saved });
}
