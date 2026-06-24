import { NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { getCenterSession } from '@/lib/center-session';
export const runtime = 'nodejs';

export async function GET() {
  const s = await getCenterSession();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const admin = createAdmin();
  // Scope is the session's location — never a client-supplied value (isolation)
  const { data: roster } = await admin.rpc('center_roster', { p_location: s.locationId });
  const today = new Date().toISOString().slice(0, 10);
  const { data: todayAtt } = await admin
    .from('attendance').select('employee_id, status, reason, hours')
    .eq('location_id', s.locationId).eq('day', today);
  return NextResponse.json({ locationName: s.locationName, roster: roster ?? [], today: todayAtt ?? [] });
}
