'use client';
import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) return;
    setBusy(true); setReport(null); setErr('');
    const fd = new FormData(); fd.append('file', file);
    const res = await fetch('/api/import-employees', { method: 'POST', body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) { setErr(data.error ?? 'فشل الاستيراد'); return; }
    setReport(data);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">استيراد الموظفين (Excel)</h1>
      <div className="card space-y-3">
        <p className="text-sm text-slate-500">
          يقرأ النظام العناوين العربية تلقائياً (الاسم · الرقم الوطني · الدائرة/المركز · تاريخ التعيين · الرصيد · المسمى).
          يحوّل الأرقام الهندية، ويتعرّف على المواقع وينشئ الناقص منها.
        </p>
        <input className="input" type="file" accept=".xlsx,.xls"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setReport(null); }} />
        <button className="btn-primary" onClick={upload} disabled={!file || busy}>
          <UploadCloud size={16} /> {busy ? 'جارٍ التحليل والإدراج…' : 'رفع واستيراد'}
        </button>
        {err && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{err}</p>}
      </div>

      {report && (
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={18} />
            <span className="font-semibold">تم استيراد {report.imported} موظف من أصل {report.received}</span>
          </div>
          {report.created_locations?.length > 0 && (
            <p className="text-sm text-slate-600">مواقع أُنشئت: {report.created_locations.join('، ')}</p>
          )}
          {report.unmapped_headers?.length > 0 && (
            <p className="text-xs text-slate-400">أعمدة غير معروفة تم تجاهلها: {report.unmapped_headers.join('، ')}</p>
          )}
          {report.errors?.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3">
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-amber-700">
                <AlertTriangle size={16} /> {report.skipped} صف تم تجاوزه
              </div>
              <ul className="space-y-1 text-xs text-amber-800">
                {report.errors.map((e: any, i: number) => <li key={i}>صف {e.row}: {e.reason}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
