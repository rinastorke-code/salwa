'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Search, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Row = { id: string; full_name: string; national_id: string; location_name: string | null; is_active: boolean };

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const router = useRouter();
  const supabase = createClient();

  // Ctrl/Cmd + K toggles the palette (Employee 360 entry point)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Debounced RPC search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('search_employees', { p_q: q, p_limit: 12 });
      setRows((data as Row[]) ?? []);
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[12vh]"
         onClick={() => setOpen(false)}>
      <Command shouldFilter={false} onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-100 px-3">
          <Search size={18} className="text-slate-400" />
          <Command.Input autoFocus value={q} onValueChange={setQ}
            placeholder="ابحث بالاسم أو الرقم الوطني…"
            className="w-full bg-transparent py-3 text-sm outline-none" />
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-slate-400">لا نتائج</Command.Empty>
          {rows.map((r) => (
            <Command.Item key={r.id} value={r.id}
              onSelect={() => { setOpen(false); router.push(`/employees/${r.id}`); }}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm aria-selected:bg-slate-100">
              <User size={16} className="text-brand" />
              <div className="flex-1">
                <div className="font-medium">{r.full_name}</div>
                <div className="text-xs text-slate-400">{r.national_id} · {r.location_name ?? '—'}</div>
              </div>
              {!r.is_active && <span className="badge bg-rose-50 text-rose-600">موقوف</span>}
            </Command.Item>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
