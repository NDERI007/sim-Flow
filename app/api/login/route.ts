// app/api/login/route.ts
import { NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // ❌ NOTE: signIn from "next-auth/react" is client-side only.
  // ✅ Use credentials directly in client instead, or use NextAuth endpoint.

  return NextResponse.json(
    {
      error: "Use client-side signIn from 'next-auth/react' directly.",
    },
    { status: 400 },
  );
}
