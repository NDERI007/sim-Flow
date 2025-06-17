import { NextResponse } from "next/server";
import { signIn } from "next-auth/react";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const res = await signIn("credentials", {
    redirect: false,
    email,
    password,
  });

  if (res?.ok) return NextResponse.json({ success: true });
  return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
}
