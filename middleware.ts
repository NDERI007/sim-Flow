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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id;
  const isAuthenticated = Boolean(userId);

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

  const adminRoutes = ['/admin'];

  const pathname = request.nextUrl.pathname;

  const isProtected = protectedRoutes.some((path) => pathname.startsWith(path));
  const isAdminRoute = adminRoutes.some((path) => pathname.startsWith(path));

  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/unauth';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  if (isAdminRoute) {
    if (!userId) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauth';
      url.searchParams.set('redirectedFrom', pathname);
      return NextResponse.redirect(url);
    }

    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (roleError || roleData?.role !== 'admin') {
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
