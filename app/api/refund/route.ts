import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { parsePaystackError } from '../../lib/paystackE/stackErr';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const transaction_ref = body.transaction_ref;

  if (!transaction_ref) {
    return NextResponse.json(
      { error: 'Missing transaction_ref' },
      { status: 400 },
    );
  }

  // Fetch transaction from DB
  const { data: purchase, error } = await supabase
    .from('purchases')
    .select('status, created_at')
    .eq('transaction_ref', transaction_ref)
    .single();

  if (error || !purchase) {
    return NextResponse.json(
      { error: 'Transaction not found' },
      { status: 404 },
    );
  }

  // Check refund eligibility
  const createdAt = new Date(purchase.created_at);
  const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince > 365) {
    return NextResponse.json(
      { error: 'Refund period has expired' },
      { status: 400 },
    );
  }

  if (purchase.status !== 'success') {
    return NextResponse.json(
      { error: 'Only successful transactions can be refunded' },
      { status: 400 },
    );
  }

  try {
    // Call Paystack refund API
    await axios.post(
      'https://api.paystack.co/refund',
      { transaction: transaction_ref },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return NextResponse.json({
      message: 'Refund request sent to Paystack. Await webhook confirmation.',
    });
  } catch (err: unknown) {
    const parsed = parsePaystackError(err);
    console.error('❌ Refund error:', parsed);

    return NextResponse.json(
      {
        error: parsed.reason,
        details: parsed.raw,
      },
      { status: parsed.statusCode },
    );
  }
}
