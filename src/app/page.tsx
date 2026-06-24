import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { LateBanner } from '@/components/late-banner';
import { Users, CalendarOff, AlertTriangle, BadgeCheck } from 'lucide-react';

async function getData() {
  const supabase = createClient();
  const { data: stats } = await supabase.rpc('dashboard_stats');
  const { count: pending } = await supabase.from('leaves').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  const today = new Date().toISOString().slice(0, 10);
  const { data: absent } = await supabase
    .from('attendance')
    .select('reason, employees(full_name), locations(name)')
    .eq('day', today).eq('status', 'absent').limit(20);
  return { stats: stats ?? {}, pending: pending ?? 0, absent: absent ?? [] };
}

export default async function Dashboard() {
  const { stats, pending, absent } = await getData();
  const cards = [
    { label: 'إجمالي الموظفين', value: stats.total_employees ?? 0, Icon: Users, c: 'text-gold-dark' },
    { label: 'غياب اليوم', value: absent.length, Icon: CalendarOff, c: 'text-rose-600' },
    { label: 'أرصدة منخفضة', value: stats.low_balance ?? 0, Icon: AlertTriangle, c: 'text-amber-600' },
    { label: 'اعتمادات معلّقة', value: pending, Icon: BadgeCheck, c: 'text-emerald-600' },
  ];
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">لوحة العمليات اليومية</h1>
        <p className="text-sm text-stone-400">حالة الكادر والمراكز اليوم</p>
      </header>
      <LateBanner />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card flex items-center gap-3">
            <c.Icon className={c.c} size={26} />
            <div><div className="text-2xl font-bold">{c.value}</div><div className="text-xs text-stone-400">{c.label}</div></div>
          </div>
        ))}
      </div>
      {pending > 0 && (
        <Link href="/confirmations" className="block rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
          لديك {pending} إجازة بانتظار الاعتماد — اضغط للمراجعة ←
        </Link>
      )}
      <div className="card">
        <h2 className="mb-2 text-sm font-semibold">غياب اليوم</h2>
        <div className="divide-y divide-stone-100">
          {absent.length === 0 && <p className="py-3 text-sm text-stone-400">لا غياب مسجّل اليوم.</p>}
          {absent.map((a: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2 text-sm">
              <span className="font-medium">{a.employees?.full_name}</span>
              <span className="text-xs text-stone-400">{a.locations?.name} · {a.reason === 'administrative' ? 'إدارية' : a.reason === 'sick' ? 'مرضية' : 'إذن'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
