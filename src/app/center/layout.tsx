import { OfficialHeader } from '@/components/brand';
import { CenterNav } from '@/components/center-nav';

export default function CenterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white px-4 py-3">
        <OfficialHeader compact />
      </header>
      <main className="mx-auto max-w-2xl p-3 pb-24">{children}</main>
      <CenterNav />
    </div>
  );
}
