import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // --- Center portal: isolated auth via signed cookie (checked in API) ---
  if (path.startsWith('/center')) {
    const hasSession = req.cookies.has('center_session');
    if (!hasSession && path !== '/center/login') {
      return NextResponse.redirect(new URL('/center/login', req.url));
    }
    return NextResponse.next();
  }
  // Center + import APIs handle their own auth
  if (path.startsWith('/api/center') || path.startsWith('/api/import')) return NextResponse.next();

  // --- Central staff: Supabase Auth ---
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll(); },
        setAll(toSet: { name: string; value: string; options: CookieOptions }[]) {
          toSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isPublic = path.startsWith('/login') || path.startsWith('/_next');
  if (!user && !isPublic) return NextResponse.redirect(new URL('/login', req.url));
  return res;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|brand).*)'] };
