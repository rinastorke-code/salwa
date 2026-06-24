import { createClient } from '@/lib/supabase/server';
import { ConfirmList } from '@/components/confirm-list';

export const dynamic = 'force-dynamic';

export default async function ConfirmationsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from('leaves')
    .select('id, type, start_date, end_date, hours_count, status, over_cap, source, employees(full_name, locations(name))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">الاعتمادات المعلّقة</h1>
      <p className="text-sm text-stone-400">إجازات مرفوعة من المراكز أو متجاوِزة للسقف — بانتظار تأكيد أي موظف مركزي.</p>
      <ConfirmList rows={(data ?? []) as any} />
    </div>
  );
}
