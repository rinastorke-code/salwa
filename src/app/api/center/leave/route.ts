import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/admin';
import { getCenterSession } from '@/lib/center-session';
export const runtime = 'nodejs';

// Body: { employee_id, type: 'administrative'|'sick', mode: 'day'|'hourly', days?, hours?, start }
export async function POST(req: NextRequest) {
  const s = await getCenterSession();
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { employee_id, type, mode, days, hours, start } = await req.json();
  const admin = createAdmin();

  const { data: emp } = await admin.from('employees').select('id').eq('id', employee_id).eq('location_id', s.locationId).single();
  if (!emp) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let p_type = type, p_end = null as string | null, p_hours = null as number | null;
  if (type === 'administrative' && mode === 'hourly') { p_type = 'hourly'; p_hours = Number(hours); }
  else if (type === 'administrative') {
    const d = Math.max(1, Number(days) || 1);
    const end = new Date(start); end.setDate(end.getDate() + d - 1);
    p_end = end.toISOString().slice(0, 10);
  } else { p_end = start; } // sick single day default

  // record_leave runs as definer; created leaves from centers are pending by source via API flag.
  const { data, error } = await admin.rpc('record_leave', {
    p_employee: employee_id, p_type, p_start: start, p_end, p_hours, p_doc: null, p_force: false,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // mark as center-sourced + pending (so central staff confirm it)
  await admin.from('leaves').update({ source: 'center', status: 'pending' }).eq('id', data);
  return NextResponse.json({ ok: true });
}
