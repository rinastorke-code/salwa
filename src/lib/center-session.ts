import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// جلب مفتاح التشفير الخاص بالمراكز
const secret = () => new TextEncoder().encode(process.env.CENTER_JWT_SECRET || 'super_secret_center_key_for_jose_jwt_2024_do_not_share');
const COOKIE_NAME = 'center_session';

export type CenterSession = { 
  location_id: string; 
  username: string;
};

// دالة إنشاء الجلسة
export async function createCenterSession(payload: CenterSession) {
  const token = await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h') // تنتهي الجلسة بعد 12 ساعة
    .sign(secret());
  
  cookies().set(COOKIE_NAME, token, { 
    httpOnly: true, 
    sameSite: 'lax', 
    secure: process.env.NODE_ENV === 'production',
    path: '/', 
    maxAge: 60 * 60 * 12 
  });
}

// دالة التحقق من الجلسة وفك التشفير
export async function getCenterSession(): Promise<CenterSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as CenterSession;
  } catch (error) {
    // التوكن تالف أو منتهي الصلاحية
    return null;
  }
}

// دالة تسجيل الخروج للمراكز
export async function destroyCenterSession() {
  cookies().delete(COOKIE_NAME);
}
