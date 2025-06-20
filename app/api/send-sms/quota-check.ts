// app/api/user/quota/route.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const body = await req.json();
  const { message, recipients = [], user_id } = body;

  if (!user_id || !message || recipients.length === 0) {
    return NextResponse.json({ message: 'Missing data' }, { status: 400 });
  }

  // Calculate total SMS segments
  const segmentsPerMsg = Math.ceil((message.length || 0) / 160) || 1;
  const totalSegments = segmentsPerMsg * recipients.length;

  // ✅ Create Supabase client using request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ANON_KEY!, // You’re using the service role key here (✅ server-only)
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    },
  );

  const { data, error } = await supabase
    .from('users')
    .select('quota')
    .eq('id', user_id)
    .single();

  if (error || !data) {
    return NextResponse.json({ message: 'User not found' }, { status: 401 });
  }

  if (data.quota < totalSegments) {
    return NextResponse.json(
      { message: 'Insufficient quota' },
      { status: 403 },
    );
  }

  return NextResponse.next();
}
