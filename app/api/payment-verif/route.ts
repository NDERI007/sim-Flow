import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get('reference');

  if (!reference) {
    return NextResponse.redirect('/purchase?error=Missing+reference');
  }

  try {
    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const result = await res.json();

    if (!result.status) {
      return NextResponse.redirect(`/purchase?error=Verification+failed`);
    }

    const { status } = result.data;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error: updateError } = await supabase
      .from('purchases')
      .update({ status: status }) // success or failed
      .eq('transaction_ref', reference);

    if (updateError) {
      console.error('🔴 Failed to update purchase:', updateError.message);
    }

    // If successful, update quota
    if (status === 'success') {
      const { error: rpcError } = await supabase.rpc(
        'apply_quota_by_transaction',
        {
          p_transaction_ref: reference,
        },
      );

      if (rpcError) {
        console.error('🔴 Quota RPC failed:', rpcError.message);
      }
    }

    return NextResponse.redirect(`/purchase?status=${status}`);
  } catch (err) {
    console.error('🔴 Verification error:', err);
    return NextResponse.redirect(`/purchase?error=Something+went+wrong`);
  }
}
