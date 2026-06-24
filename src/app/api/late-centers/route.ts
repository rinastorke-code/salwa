import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const runtime = 'nodejs';
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data } = await supabase.rpc('late_centers', { p_enforce_time: true });
  return NextResponse.json({ centers: data ?? [] });
}
