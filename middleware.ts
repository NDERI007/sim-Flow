// middleware.ts
//Next.js only recognizes middleware.ts (or .js) at the root level for it to work globally,
//  based on the matcher config you define.
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin');
  const isDashboardRoute = pathname.startsWith('/dashboard');

  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.split(' ')[1] || req.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (isAdminRoute && decoded.role !== 'admin') {
      return NextResponse.redirect(new URL('/unAuth', req.url));
    }

    if (isDashboardRoute && decoded.role !== 'user') {
      return NextResponse.redirect(new URL('/unAuth', req.url));
    }

    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
