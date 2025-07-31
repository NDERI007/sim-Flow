import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh session (this will auto-refresh tokens if expired)
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  const isAuthenticated = Boolean(data?.claims?.sub); // sub = user id

  const protectedRoutes = [
    '/send',
    '/purchase',
    '/contacts',
    '/Reports',
    '/Quota-Usage',
    '/templates',
    '/dashboard',
    '/scheduled',
    '/mfa',
  ];

  const isProtected = protectedRoutes.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauth';
    url.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  const adminRoutes = ['/admin'];

  if (adminRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    const { data: roleData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .single();

    if (roleData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/unauth', request.url));
    }
  }

  return response;
}
// Matcher: apply to everything except static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
