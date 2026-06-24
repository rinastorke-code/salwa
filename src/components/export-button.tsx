'use client';
import { FileDown } from 'lucide-react';
import { exportEmployeesPdf } from '@/lib/pdf';

export function ExportButton({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <button className="btn-ghost" onClick={() => exportEmployeesPdf(title, head, rows)}>
      <FileDown size={16} /> تصدير PDF
    </button>
  );
}
