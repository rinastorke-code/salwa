import Image from 'next/image';

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="logo-frame" style={{ width: size + 16, height: size + 16 }}>
      <Image src="/brand/eagle.png" alt="الشؤون الإدارية" width={size} height={size} priority />
    </div>
  );
}

export function OfficialHeader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={compact ? 32 : 44} />
      <div className="leading-tight">
        <div className="text-[11px] text-stone-400">الجمهورية العربية السورية</div>
        <div className="text-sm font-bold text-ink">الشؤون الإدارية</div>
        <div className="text-[11px] text-stone-500">مديرية الشؤون الاجتماعية والعمل — اللاذقية</div>
      </div>
    </div>
  );
}

// Text used in PDF / Excel / print headers
export const OFFICIAL_LINES = [
  'وزارة الشؤون الاجتماعية والعمل',
  'مديرية الشؤون الاجتماعية والعمل في اللاذقية',
];
