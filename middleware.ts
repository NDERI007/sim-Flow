import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // 🆕 Cookie jars for compatibility with Supabase future updates
  const cookiesFromRequest = req.cookies;
  const cookiesToSet: {
    name: string;
    value: string;
    options?: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookiesFromRequest.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;
  const protectedRoutes = ['/dashboard', '/admin'];
  const authRoutes = ['/login', '/register'];

  if (!session && protectedRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && authRoutes.includes(pathname)) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = data?.role;

    return NextResponse.redirect(
      new URL(role === 'admin' ? '/admin' : '/dashboard', req.url),
    );
  }

  if (session) {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single();

    const role = data?.role;

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/unAuth', req.url));
    }

    if (pathname.startsWith('/dashboard') && role !== 'user') {
      return NextResponse.redirect(new URL('/unAuth', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/register'],
};
