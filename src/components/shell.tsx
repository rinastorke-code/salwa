'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CalendarDays, Network, History, Upload, BadgeCheck, ClipboardCheck, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OfficialHeader } from '@/components/brand';
import { createClient } from '@/lib/supabase/client';

const items = [
  { href: '/', label: 'العمليات', Icon: LayoutDashboard },
  { href: '/employees', label: 'الموظفون', Icon: Users },
  { href: '/attendance', label: 'التفقّد', Icon: ClipboardCheck },
  { href: '/confirmations', label: 'الاعتمادات', Icon: BadgeCheck },
  { href: '/leaves', label: 'الإجازات', Icon: CalendarDays },
  { href: '/locations', label: 'الهيكل', Icon: Network },
  { href: '/activity', label: 'النشاط', Icon: History },
  { href: '/settings', label: 'الإعدادات', Icon: Settings },
  { href: '/import', label: 'استيراد', Icon: Upload },
] as const;
// Primary items shown in the mobile bottom bar (rest live in the sidebar)
const mobile = items.filter((i) => ['/', '/employees', '/attendance', '/confirmations', '/leaves'].includes(i.href));

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  if (path.startsWith('/login') || path.startsWith('/center')) return <>{children}</>;
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (laptop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-l border-stone-200 bg-white p-4 lg:flex">
        <div className="mb-6"><OfficialHeader /></div>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition',
                active(href) ? 'bg-gold/10 font-medium text-gold-dark' : 'text-stone-600 hover:bg-stone-50')}>
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <button onClick={logout}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-stone-600 transition hover:bg-rose-50 hover:text-rose-600">
          <LogOut size={18} /> تسجيل الخروج
        </button>
        <p className="pt-3 text-center text-[10px] text-stone-400">بإدارة سلوى</p>
      </aside>

      {/* Main */}
      <div className="flex-1">
        <div className="mx-auto max-w-4xl p-3 pb-24 md:p-6 lg:pb-6">{children}</div>
      </div>

      {/* Bottom bar (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex items-stretch justify-around">
          {mobile.map(({ href, label, Icon }) => (
            <Link key={href} href={href}
              className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[10px]',
                active(href) ? 'text-gold-dark' : 'text-stone-500')}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          ))}
          <button onClick={logout} className="flex flex-1 flex-col items-center gap-1 py-2 text-[10px] text-stone-500">
            <LogOut size={19} /><span>خروج</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
