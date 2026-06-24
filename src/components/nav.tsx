'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LayoutDashboard, Users, CalendarDays, Network, Upload, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', label: 'العمليات', Icon: LayoutDashboard },
  { href: '/employees', label: 'الموظفون', Icon: Users },
  { href: '/leaves', label: 'الإجازات', Icon: CalendarDays },
  { href: '/locations', label: 'الهيكل', Icon: Network },
  { href: '/activity', label: 'النشاط', Icon: History },
  { href: '/import', label: 'استيراد', Icon: Upload },
] as const;

export function Nav() {
  const path = usePathname();
  if (path.startsWith('/login')) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-stretch justify-around">
        {items.map(({ href, label, Icon }) => {
          const active = href === '/' ? path === '/' : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[10px]', active ? 'text-brand' : 'text-slate-500')}>
              <Icon size={19} /><span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
