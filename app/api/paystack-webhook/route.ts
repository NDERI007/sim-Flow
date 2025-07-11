import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    console.warn('⚠️ Invalid Paystack signature');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  if (event.event === 'charge.success') {
    const { reference, status } = event.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    // ✅ Check if already processed
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('status')
      .eq('transaction_ref', reference)
      .single();

    if (fetchError) {
      console.error('🔴 Failed to fetch purchase:', fetchError.message);
      return NextResponse.json({ message: 'DB error' }, { status: 500 });
    }

    if (!purchase) {
      console.warn('⚠️ No purchase found for reference:', reference);
      return NextResponse.json(
        { message: 'Purchase not found' },
        { status: 404 },
      );
    }

    if (purchase.status === 'success') {
      console.log('✅ Purchase already processed:', reference);
      return NextResponse.json(
        { message: 'Already processed' },
        { status: 200 },
      );
    }

    const { error: updateError } = await supabase
      .from('purchases')
      .update({ status })
      .eq('transaction_ref', reference)
      .eq('status', 'pending');

    if (updateError) {
      console.error(
        '🔴 Failed to update purchase status:',
        updateError.message,
      );
      return NextResponse.json(
        { message: 'Database update failed' },
        { status: 500 },
      );
    }

    if (status === 'success') {
      const { error: rpcError } = await supabase.rpc(
        'apply_quota_by_transaction',
        {
          p_transaction_ref: reference,
        },
      );

      if (rpcError) {
        console.error('🔴 Webhook quota update failed:', rpcError.message);
      }
    }

    return NextResponse.json({ message: 'Processed' }, { status: 200 });
  }

  return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
}
//Simultaneously sends a POST request to your webhook endpoint, usually within a few seconds.
