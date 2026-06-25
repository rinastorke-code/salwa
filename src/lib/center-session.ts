import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secret = () => new TextEncoder().encode(process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-secret');
const COOKIE = 'center_session';

export type CenterSession = { locationId: string; locationName: string; username: string };

export async function createCenterSession(s: CenterSession) {
  const token = await new SignJWT(s as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function getCenterSession(): Promise<CenterSession | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return { locationId: payload.locationId as string, locationName: payload.locationName as string, username: payload.username as string };
  } catch { return null; }
}

export function clearCenterSession() {
  cookies().delete(COOKIE);
}
