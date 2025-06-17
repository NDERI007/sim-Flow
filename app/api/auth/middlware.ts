import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only protect paths that start with /admin
export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");

  if (isAdminRoute) {
    if (!token || token.role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// Apply middleware to /admin routes only
export const config = {
  matcher: ["/admin/:path*"],
};
