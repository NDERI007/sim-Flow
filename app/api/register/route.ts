import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { signIn } from "next-auth/react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // not the anon key!
);

export async function POST(req: Request) {
  const { email, password, name } = await req.json();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Signup failed" },
      { status: 400 }
    );
  }

  // Optional: Save extra info to your users table
  await supabase.from("users").insert({
    id: data.user.id,
    email,
    name,
    role: "user",
    quota: 100, // default value
  });

  // Auto login the user
  await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  return NextResponse.json({ success: true });
}
