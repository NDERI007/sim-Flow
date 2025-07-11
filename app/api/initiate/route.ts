import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const rawAuth = req.headers.get('authorization');
    const token = rawAuth?.toLowerCase().startsWith('bearer ')
      ? rawAuth.slice(7)
      : null;

    if (!token) {
      console.warn('⚠️ Missing or malformed Authorization header');
      return NextResponse.json(
        { message: 'Missing or invalid token' },
        { status: 401 },
      );
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { credits, method, phone } = await req.json();

    // Validate inputs
    if (!credits || credits < 3) {
      return NextResponse.json(
        { error: 'Invalid credit amount' },
        { status: 400 },
      );
    }

    if (!['card', 'mpesa'].includes(method)) {
      return NextResponse.json(
        { error: 'Invalid payment method' },
        { status: 400 },
      );
    }

    if (method === 'mpesa' && !phone) {
      return NextResponse.json(
        { error: 'Phone number required for MPesa' },
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
      method,
      status: 'pending',
      transaction_ref: transactionRef,
      ...(method === 'mpesa' && { phone_number: phone }),
    });

    if (insertError) {
      console.error('🔴 Failed to insert purchase:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to log purchase' },
        { status: 500 },
      );
    }

    // Call Paystack to initialize transaction
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountcents,
        reference: transactionRef,
        channels: method === 'mpesa' ? ['mpesa'] : ['card'],
        metadata: {
          user_id: user.id,
          credits,
          method,
        },
        ...(method === 'mpesa' && { phone }), // optional for MPesa
        callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments-verif`,
      }),
    });

    const paystackData = await res.json();

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
    console.error('🔴 Payment initiation error:', err);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 },
    );
  }
}
