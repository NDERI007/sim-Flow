import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const createSupabaseClient = (token: string) =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

async function getSupabaseClientFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { error: 'Missing token' };
  }

  const supabase = createSupabaseClient(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: 'Invalid user' };
  }

  return { supabase, user };
}
export async function POST(req: NextRequest) {
  const { supabase, user, error } = await getSupabaseClientFromRequest(req);

  if (error) {
    return NextResponse.json({ error }, { status: 401 });
  }

  const { transactionRef } = await req.json();
  if (!transactionRef) {
    return NextResponse.json(
      { error: 'Missing transactionRef' },
      { status: 400 },
    );
  }

  // Check if the purchase exists and is still pending
  const { data: purchase, error: fetchError } = await supabase
    .from('purchases')
    .select('id, status, credits')
    .eq('transaction_ref', transactionRef)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !purchase) {
    return NextResponse.json({ error: 'Purchase not found' }, { status: 404 });
  }

  if (purchase.status !== 'pending') {
    return NextResponse.json({ error: 'Already processed' }, { status: 400 });
  }

  // Update user quota
  const { error: quotaError } = await supabase.rpc('credit_quota_and_log', {
    uid: user.id,
    amount: purchase.credits,
    reason: 'purchase',
    related_id: purchase.id,
  });

  if (quotaError) {
    return NextResponse.json({ error: 'Quota update failed' }, { status: 500 });
  }

  // Update purchase status
  const { error: updateError } = await supabase
    .from('purchases')
    .update({ status: 'completed' })
    .eq('id', purchase.id);

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to mark purchase complete' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
