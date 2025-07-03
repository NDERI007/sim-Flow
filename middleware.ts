import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Use the ANON key here!
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        // This setAll function is crucial for refreshing the session
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value); // Update request cookies for current lifecycle
            response.cookies.set(name, value, options); // Set response cookies for client
          });
        },
      },
    },
  );

  // IMPORTANT: Avoid calling `await supabase.auth.getSession()` here.
  // It's recommended to let page components and API routes handle session retrieval.
  // The primary role of middleware here is to refresh the session token if it's expired.
  // We can achieve this by getting the user, which will perform the refresh if needed.
  await supabase.auth.getUser();

  return response;
}

// Ensure the middleware is only called for relevant paths.
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
