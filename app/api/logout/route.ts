import { NextResponse } from 'next/server';

export async function POST() {
  // You can clear the cookie if using cookies, but since we're using localStorage, just return success
  return NextResponse.json({ message: 'Logged out successfully' });
}
