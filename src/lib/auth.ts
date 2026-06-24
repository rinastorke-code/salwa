import { createClient } from '@/lib/supabase/server';

export async function getRole(): Promise<'super_admin' | 'data_entry' | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users_roles').select('role').eq('user_id', user.id).single();
  return (data?.role as any) ?? 'data_entry';
}
