import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getCenterSession } from '@/lib/center-session';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ==========================================
  // 1. حماية بوابات المراكز (عبر Jose JWT)
  // ==========================================
  if (path.startsWith('/center')) {
    // السماح بالوصول لصفحة تسجيل الدخول ومسار الـ API الخاص بها
    if (path === '/center/login' || path === '/api/center/login') {
      return NextResponse.next();
    }
    
    // التحقق من صحة توكن المركز
    const session = await getCenterSession();
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/center/login';
      const response = NextResponse.redirect(url);
      response.cookies.delete('center_session'); // تنظيف التوكن التالف
      return response;
    }
    return NextResponse.next();
  }

  // ==========================================
  // 2. حماية لوحة تحكم الإدارة (عبر Supabase Auth)
  // ==========================================
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isPublicRoute = path.startsWith('/login') || path.startsWith('/api/') || path.startsWith('/_next') || path === '/sw.js';

  // إذا لم يكن المستخدم مسجلاً ومسار الصفحة ليس عاماً، وجهه لتسجيل دخول الإدارة
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /* تطابق جميع المسارات باستثناء الملفات الثابتة والصور */
    '/((?!_next/static|_next/image|favicon.ico|brand|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
