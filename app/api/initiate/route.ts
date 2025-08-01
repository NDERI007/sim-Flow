import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { parsePaystackError } from '../../lib/paystackE/stackErr';
import { ServerClient } from '../../lib/supabase/serverClient';

export async function POST(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = ServerClient(req, res);
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { credits } = await req.json();

    // Validate inputs
    if (!credits || credits < 3) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 },
      );
    }

    // Calculate total amount in KES (e.g., 0.5 per SMS)
    const unitPrice = 0.5;
    const amountKES = Math.floor(credits * unitPrice);
    const amountcents = amountKES * 100; // Convert to kobo

    const transactionRef = `TX-${uuidv4()}`;

    // Insert pending purchase
    const { error: insertError } = await supabase.from('purchases').insert({
      user_id: user.id,
      amount: amountKES,
      credits,
      status: 'pending',
      transaction_ref: transactionRef,
    });

    if (insertError) {
      console.error('Failed to insert purchase:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to log purchase' },
        { status: 500 },
      );
    }
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return NextResponse.json(
        { error: 'Paystack secret key is not configured' },
        { status: 500 },
      );
    }

    // Call Paystack to initialize transaction
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountcents,
        reference: transactionRef,
        metadata: {
          credits,
        },
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/purchase?status=success`,
      }),
    });

    const paystackData = await res.json();
    console.log('📦 Paystack full response:', paystackData);

    if (!paystackData.status || !paystackData.data?.authorization_url) {
      return NextResponse.json(
        { error: 'Paystack failed to initialize' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      authorization_url: paystackData.data.authorization_url,
    });
  } catch (err) {
    const { reason, statusCode, raw } = parsePaystackError(err);
    console.error('Payment initiation error:', reason, raw);
    return NextResponse.json({ error: reason }, { status: statusCode });
  }
}
