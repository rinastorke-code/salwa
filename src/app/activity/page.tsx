import { createClient } from '@/lib/supabase/server';
import { UserCog, CalendarDays, MapPin, ArrowLeftRight, Upload } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ICON: Record<string, any> = { employee: UserCog, leave: CalendarDays, location: MapPin, transfer: ArrowLeftRight, import: Upload };

export default async function ActivityPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('activity_log')
    .select('id, action, entity_type, summary, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = data ?? [];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">سجل النشاط</h1>
      <div className="card p-0">
        <div className="divide-y divide-slate-100">
          {rows.length === 0 && <p className="p-4 text-sm text-slate-400">لا يوجد نشاط بعد.</p>}
          {rows.map((r: any) => {
            const Icon = ICON[r.entity_type] ?? UserCog;
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 text-sm">
                <Icon size={18} className="shrink-0 text-brand" />
                <span className="flex-1">{r.summary}</span>
                <time className="shrink-0 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' })}
                </time>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
