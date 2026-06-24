'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand';

export default function CenterLogin() {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login() {
    setErr(''); setBusy(true);
    const res = await fetch('/api/center/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    setBusy(false);
    if (!res.ok) { const d = await res.json(); setErr(d.error || 'تعذّر الدخول'); return; }
    router.replace('/center/attendance');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-4">
      <div className="absolute inset-0 opacity-25"
        style={{ backgroundImage: 'url(/brand/arc.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={56} />
          <h1 className="text-lg font-bold">بوابة المركز</h1>
          <p className="text-xs text-stone-400">الشؤون الإدارية — اللاذقية</p>
        </div>
        <div>
          <label className="label">اسم المركز</label>
          <input className="input" value={username} onChange={(e) => setU(e.target.value)} />
        </div>
        <div>
          <label className="label">كلمة السر</label>
          <input className="input" type="password" value={password} onChange={(e) => setP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && login()} />
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <button className="btn-primary w-full" onClick={login} disabled={busy}>{busy ? '…' : 'دخول'}</button>
      </div>
    </div>
  );
}
