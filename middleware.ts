import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const pathname = req.nextUrl.pathname;

  const url = req.nextUrl.clone();

  // Redirect logged-in users away from /login or /register
  if (token && (pathname === "/login" || pathname === "/register")) {
    url.pathname = token.role === "admin" ? "/admin" : "/dashboard";
    return NextResponse.redirect(url);
  }

  // Protect /admin: only allow admins
  if (pathname.startsWith("/admin")) {
    if (!token) {
      url.pathname = "/login"; // not logged in
      return NextResponse.redirect(url);
    }
    if (token.role !== "admin") {
      url.pathname = "/unAuth"; // logged in, but not admin
      return NextResponse.redirect(url);
    }
  }

  // Protect /dashboard: only allow users
  if (pathname.startsWith("/dashboard")) {
    if (!token) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (token.role !== "user") {
      url.pathname = "/unAuth";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/register", "/dashboard/:path*", "/admin/:path*"],
};
