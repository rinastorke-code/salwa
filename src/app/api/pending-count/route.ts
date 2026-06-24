import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export const runtime = 'nodejs';
export async function GET() {
  const supabase = createClient();
  const { count } = await supabase.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  return NextResponse.json({ count: count ?? 0 });
}
