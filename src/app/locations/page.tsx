import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Loc = { id: string; name: string; type: string; parent_id: string | null };

function Tree({ nodes, parent = null, depth = 0 }: { nodes: Loc[]; parent?: string | null; depth?: number }) {
  const children = nodes.filter((n) => n.parent_id === parent);
  if (children.length === 0) return null;
  return (
    <ul className={depth === 0 ? '' : 'border-r border-slate-200 pr-3'}>
      {children.map((c) => (
        <li key={c.id} className="py-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="badge bg-slate-100 text-slate-500">{c.type}</span>
            <span className="font-medium">{c.name}</span>
          </div>
          <div className="pr-4"><Tree nodes={nodes} parent={c.id} depth={depth + 1} /></div>
        </li>
      ))}
    </ul>
  );
}

export default async function LocationsPage() {
  const supabase = createClient();
  const { data } = await supabase.from('locations').select('id, name, type, parent_id').order('name');
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">الهيكل الإداري</h1>
      <div className="card">
        <Tree nodes={(data ?? []) as Loc[]} />
      </div>
    </div>
  );
}
