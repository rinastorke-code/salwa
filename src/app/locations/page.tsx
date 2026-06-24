import { createClient } from '@/lib/supabase/server';
import { getRole } from '@/lib/auth';
import { LocationManager } from '@/components/location-manager';

export const dynamic = 'force-dynamic';

type Loc = { id: string; name: string; type: string; parent_id: string | null; annual_cap: number | null };

function Tree({ nodes, parent = null, depth = 0 }: { nodes: Loc[]; parent?: string | null; depth?: number }) {
  const children = nodes.filter((n) => n.parent_id === parent);
  if (children.length === 0) return null;
  return (
    <ul className={depth === 0 ? '' : 'border-r border-stone-200 pr-3'}>
      {children.map((c) => (
        <li key={c.id} className="py-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="badge bg-stone-100 text-stone-500">{c.type}</span>
            <span className="font-medium">{c.name}</span>
          </div>
          <div className="pr-4"><Tree nodes={nodes} parent={c.id} depth={depth + 1} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function LocationsPage() {
  const role = await getRole();
  const supabase = createClient();
  const { data } = await supabase.from('locations').select('id, name, type, parent_id, annual_cap').order('name');
  const locs = (data ?? []) as Loc[];

  if (role === 'super_admin') {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">الهيكل الإداري</h1>
        <LocationManager locations={locs} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">الهيكل الإداري</h1>
      <div className="card"><Tree nodes={locs} /></div>
    </div>
  );
}
