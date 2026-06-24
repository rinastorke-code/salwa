'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ClipboardCheck, CalendarPlus, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CenterNav() {
  const path = usePathname();
  const router = useRouter();
  if (path === '/center/login') return null;
  async function logout() {
    await fetch('/api/center/logout', { method: 'POST' });
    router.replace('/center/login');
  }
  const link = (href: string, label: string, Icon: any) => (
    <Link href={href} className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px]',
      path === href ? 'text-gold-dark' : 'text-stone-500')}>
      <Icon size={20} /><span>{label}</span>
    </Link>
  );
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-stretch justify-around">
        {link('/center/attendance', 'التفقّد', ClipboardCheck)}
        {link('/center/leaves', 'إجازة', CalendarPlus)}
        <button onClick={logout} className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-stone-500">
          <LogOut size={20} /><span>خروج</span>
        </button>
      </div>
    </nav>
  );
}
