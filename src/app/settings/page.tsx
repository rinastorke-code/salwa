import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/auth';
import { SettingsClient } from '@/components/settings-client';
import { StaffManager } from '@/components/staff-manager';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const role = await getRole();
  if (role !== 'super_admin') redirect('/');
  const supabase = createClient();
  const [{ data: locations }, { data: centers }] = await Promise.all([
    supabase.from('locations').select('id, name, type, annual_cap').order('name'),
    supabase.rpc('list_centers'),
  ]);
  return (
    <div className="space-y-6">
      <SettingsClient locations={locations ?? []} centers={centers ?? []} />
      <StaffManager />
    </div>
  );
}
