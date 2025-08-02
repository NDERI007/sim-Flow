import { NextRequest, NextResponse } from 'next/server';

// This function will handle the GET request from Paystack's callback
export async function GET(req: NextRequest) {
  // Define redirect URLs for success and failure
  // These URLs are where the user will be sent after the check.
  const successUrl = new URL(
    '/purchase?status=success', //relative path
    process.env.NEXT_PUBLIC_BASE_URL!, //base URL
  );
  const errorUrl = new URL(
    '/purchase?status=error',
    process.env.NEXT_PUBLIC_BASE_URL!,
  );

  try {
    // 1. Get the transaction reference from the URL query params
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get('reference');

    if (!reference) {
      console.error('Paystack callback: No reference found in URL.');
      errorUrl.searchParams.set('reason', 'no_reference');
      return NextResponse.redirect(errorUrl);
    }

    // 2. Call Paystack's verification endpoint to confirm the transaction status
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY!}`,
        },
      },
    );

    const verifyData = await verifyRes.json();

    // 3. Check if the transaction was successful according to Paystack
    if (verifyData.status && verifyData.data?.status === 'success') {
      // If successful, redirect the user to the success page.
      // The auth session will be maintained because this is a server-side redirect.
      return NextResponse.redirect(successUrl);
    } else {
      // If the payment was not successful, redirect to an error page.
      console.error(
        'Paystack verification failed:',
        verifyData.data?.gateway_response,
      );
      const reason =
        verifyData.data?.gateway_response ??
        verifyData.message ??
        'transaction failed';
      errorUrl.searchParams.set('reason', reason);
      return NextResponse.redirect(errorUrl);
    }
  } catch (error) {
    console.error(
      'An unexpected error occurred in the Paystack callback handler:',
      error,
    );
    // Redirect to a generic error page in case of an unexpected exception
    errorUrl.searchParams.set('reason', 'internal_server_error');
    return NextResponse.redirect(errorUrl);
  }
}
