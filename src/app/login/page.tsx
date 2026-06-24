'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function signIn() {
    setErr(''); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr('بيانات الدخول غير صحيحة'); return; }
    router.replace('/');
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink p-4">
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: 'url(/brand/arc.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div className="relative w-full max-w-sm space-y-4 rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo size={56} />
          <div className="text-[11px] text-stone-400">الجمهورية العربية السورية</div>
          <h1 className="text-lg font-bold">الشؤون الإدارية</h1>
          <p className="text-xs text-stone-400">مديرية الشؤون الاجتماعية والعمل — اللاذقية</p>
        </div>
        <div>
          <label className="label">البريد الإلكتروني</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">كلمة المرور</label>
          <input className="input" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && signIn()} />
        </div>
        {err && <p className="text-xs text-rose-600">{err}</p>}
        <button className="btn-primary w-full" onClick={signIn} disabled={loading}>{loading ? '…' : 'تسجيل الدخول'}</button>
        <p className="pt-2 text-center text-[10px] text-stone-400">بإدارة سلوى</p>
      </div>
    </div>
  );
}
