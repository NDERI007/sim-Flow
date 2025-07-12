import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  // Must read raw body first
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  type PaystackEvent = {
    event: string;
    data: {
      reference: string;
      status: 'success' | 'failed' | 'abandoned';
    };
  };

  // Validate signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest('hex');

  if (hash !== signature) {
    console.warn('Invalid Paystack signature');
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(rawBody) as PaystackEvent;
  } catch (err) {
    console.error('🔴 Failed to parse webhook body:', err);
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const { event: eventType, data } = event;

  const reference = data?.reference;
  const status = data?.status;

  if (!reference) {
    console.warn('No reference in webhook');
    return NextResponse.json({ message: 'No reference' }, { status: 400 });
  }

  // Common handler for charge.success, charge.failed, and abandoned
  if (['charge.success', 'charge.failed'].includes(eventType)) {
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('status')
      .eq('transaction_ref', reference)
      .single();

    if (fetchError) {
      console.error('Failed to fetch purchase:', fetchError.message);
      return NextResponse.json({ message: 'DB error' }, { status: 500 });
    }

    if (!purchase) {
      console.warn('No purchase found for reference:', reference);
      return NextResponse.json(
        { message: 'Purchase not found' },
        { status: 404 },
      );
    }

    if (purchase.status !== 'pending') {
      console.log('Already finalized:', reference);
      return NextResponse.json(
        { message: 'Already processed' },
        { status: 200 },
      );
    }

    // Normalize status for clarity
    const finalStatus = status === 'success' ? 'success' : 'failed';

    const { error: updateError } = await supabase
      .from('purchases')
      .update({ status: finalStatus })
      .eq('transaction_ref', reference)
      .eq('status', 'pending');

    if (updateError) {
      console.error('Failed to update purchase:', updateError.message);
      return NextResponse.json({ message: 'Update failed' }, { status: 500 });
    }

    //Only apply quota if successful
    if (finalStatus === 'success') {
      const { error: rpcError } = await supabase.rpc(
        'apply_quota_by_transaction',
        {
          p_transaction_ref: reference,
        },
      );

      if (rpcError) {
        console.error('Failed to apply quota:', rpcError.message);
        // optional: retry logic or alerting
      }
    }

    return NextResponse.json({ message: 'Processed' }, { status: 200 });
  }

  //Ignore other events
  console.log('Ignored event type:', eventType);
  return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
}
