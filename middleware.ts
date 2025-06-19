import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  //runs before a request reaches a protected route. You define which routes it applies to at the bottom using matcher.
  const res = NextResponse.next(); //Creates a default NextResponse, assuming the request should proceed (unless overridden by a redirect later).

  // 🆕 Cookie jars for compatibility with Supabase future updates
  const cookiesFromRequest = req.cookies;
  const cookiesToSet: {
    name: string;
    value: string;
    options?: CookieOptions;
  }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, //The ! tells TypeScript: “I promise this env var is not undefined.”
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookiesFromRequest.getAll();
        },
        setAll(cookies) {
          //his is necessary because Next.js middleware or API routes must manually set cookies e.g updating sessions, refreshing tokens on the response — Supabase won’t do it automatically.
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const {
    data: { session }, //Fetches the current session (if the user is logged in).

    //session will be null if the user is not authenticated.
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
// a session is the object that:

///Represents the current authentication state of a user.

//Includes tokens used to authenticate API requests.

//session is created after:

//A user signs up or logs in.

//It includes the access token and refresh token.
