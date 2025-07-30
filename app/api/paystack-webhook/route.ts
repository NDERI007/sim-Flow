import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { notifyAdmin } from '../../lib/Notify/QuotaFailure';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');
  type ChargeEvent = {
    event: 'charge.success' | 'charge.failed' | 'charge.abandoned';
    data: {
      reference: string;
      status: 'success' | 'failed' | 'abandoned';
    };
  };

  type RefundEvent = {
    event:
      | 'refund.processed'
      | 'refund.processing'
      | 'refund.pending'
      | 'charge.refunded'
      | 'refund.failed'
      | 'charge.refund.failed';
    data: {
      transaction_reference: string;

      status?: string; // Paystack may or may not include status here
    };
  };

  type PaystackEvent = ChargeEvent | RefundEvent;

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
    console.error('Failed to parse webhook body:', err);
    return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
  }

  const { event: eventType, data } = event;

  const reference =
    'reference' in data
      ? data.reference
      : 'transaction_reference' in data &&
          typeof data.transaction_reference === 'string'
        ? data.transaction_reference
        : undefined;

  if (!reference) {
    console.warn('No reference in webhook');
    return NextResponse.json({ message: 'No reference' }, { status: 400 });
  }
  const status = data?.status;
  if (['refund.processed', 'charge.refunded'].includes(eventType)) {
    console.log(`Handling refund for transaction: ${reference}`);
    const { data: refundedPurchase, error: refundFetchError } = await supabase
      .from('purchases')
      .select('id, user_id, credits, status')
      .eq('transaction_ref', reference)
      .eq('status', 'success')
      .single();

    if (refundFetchError || !refundedPurchase) {
      console.error(
        'Failed to fetch purchase for refund:',
        refundFetchError?.message,
      );
      return NextResponse.json(
        { message: 'Refund lookup failed' },
        { status: 404 },
      );
    }

    const { error: refundError } = await supabase.rpc('reverse_quota_direct', {
      p_user_id: refundedPurchase.user_id,
      p_credits: refundedPurchase.credits,
      p_purchase_id: refundedPurchase.id,
    });

    if (['refund.failed', 'charge.refund.failed'].includes(eventType)) {
      console.warn(`Refund failed for ${reference}`);

      return NextResponse.json({ message: 'Refund failed' }, { status: 200 });
    }

    if (refundError) {
      console.error('Failed to reverse quota:', refundError.message);
      //Log the actual error to quota_logs
      await notifyAdmin({
        subject: 'Refund Quota Reversal Failed',
        body: `
    <p>Transaction: <strong>${reference}</strong></p>
    <p>User ID: ${refundedPurchase.user_id}</p>
    <p>Credits: ${refundedPurchase.credits}</p>
    <p>Error: ${refundError.message}</p>
  `,
      });

      return NextResponse.json(
        { message: 'Refund processing failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({ message: 'Refund processed' }, { status: 200 });
  }
  // Common handler for charge.success, charge.failed, and abandoned
  if (['charge.success', 'charge.failed'].includes(eventType)) {
    const { data: purchase, error: fetchError } = await supabase
      .from('purchases')
      .select('id, user_id, credits, status')
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
    async function retryApplyQuota(
      user_id: string,
      credits: number,
      purchase_id: string,
      maxRetries = 3,
      delay = 500,
    ) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const { error } = await supabase.rpc('apply_quota_direct', {
          p_user_id: user_id,
          p_credits: credits,
          p_purchase_id: purchase_id,
        });

        if (!error) {
          console.log(`Quota applied successfully on attempt ${attempt}`);
          return true;
        }

        console.warn(`Attempt ${attempt} failed:`, error.message);

        // Exponential backoff
        await new Promise((res) => setTimeout(res, delay * attempt));
      }

      // Log failure if all attempts failed
      console.error(
        `All ${maxRetries} quota application attempts failed for transaction: ${reference}`,
      );

      const { error: logError } = await supabase.from('quota_logs').insert({
        user_id,
        amount: credits,
        reason: 'quota_apply_failed',
        related_id: purchase_id,
        error_message: `Quota RPC failed after ${maxRetries} attempts for ref: ${reference}`,
      });

      if (logError) {
        console.error(
          'Failed to log quota application failure:',
          logError.message,
        );
      }

      return false;
    }

    //Only apply quota if successful
    if (finalStatus === 'success') {
      const success = await retryApplyQuota(
        purchase.user_id,
        purchase.credits,
        purchase.id,
      );

      if (!success) {
        console.warn(
          `Manual intervention may be needed for quota on tx: ${purchase.id}`,
        );
        await notifyAdmin({
          subject: 'Quota Application Failed After Purchase',
          body: `
    <p>Transaction: <strong>${reference}</strong></p>
    <p>User ID: ${purchase.user_id}</p>
    <p>Credits: ${purchase.credits}</p>
    <p>Purchase ID: ${purchase.id}</p>
    <p>Quota application failed after multiple retries.</p>
  `,
        });
      }
    }

    return NextResponse.json({ message: 'Processed' }, { status: 200 });
  }

  //Ignore other events
  console.log(`Ignored event type: ${eventType} for reference: ${reference}`);

  return NextResponse.json({ message: 'Event ignored' }, { status: 200 });
}
