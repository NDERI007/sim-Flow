// /app/api/send-sms/route.ts
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function POST(req: NextRequest) {
  // ✅ Create Supabase client using request cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // You’re using the service role key here (✅ server-only)
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      },
    },
  );

  // Step 1: Authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const user_id = user?.id;

  const body = await req.json();
  const { to_numbers, message } = body;

  // Step 2: Basic validation
  if (!Array.isArray(to_numbers) || to_numbers.length === 0 || !message) {
    return NextResponse.json({ message: 'Invalid input.' }, { status: 400 });
  }

  // Step 3: Calculate SMS segments
  const segmentsPerMessage = Math.ceil((message.length || 0) / 160) || 1;
  const totalSegments = segmentsPerMessage * to_numbers.length;

  // Step 4: Call PostgreSQL function to atomically deduct quota
  const { error: quotaError } = await supabase.rpc('deduct_quota', {
    uid: user.id,
    amount: totalSegments,
  });

  if (quotaError) {
    return NextResponse.json(
      {
        message: 'Quota deduction failed',
        error: quotaError.message,
      },
      { status: 409 },
    );
  }
  // Step 5: Queue messages
  const inserts = to_numbers.map((to: string) => ({
    to_number: to,
    message,
    status: 'queued',
    sent_at: new Date(),
  }));

  const { error: insertError } = await supabase
    .from('messages')
    .insert(inserts);

  console.log('Detailed insert error:', {
    error: insertError,
    message: insertError?.message,
    details: insertError?.details,
    hint: insertError?.hint,
    code: insertError?.code,
  });

  if (insertError) {
    return NextResponse.json(
      {
        message: 'Messages not queued',
        error: insertError.message,
      },
      { status: 500 },
    );
  }

  // ✅ Success
  return NextResponse.json({
    success: true,
    recipients: to_numbers.length,
    totalSegments,
  });
}
