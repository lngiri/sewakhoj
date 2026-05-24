import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get() { return ''; }, set() {}, remove() {} }
    }
  );

  try {
    const body = await req.json();
    const { request_id, transaction_code, amount } = body;

    if (!request_id || !transaction_code) {
      return NextResponse.json({
        success: false,
        response_code: 1,
        response_message: 'Missing required fields',
        status: 'FAILED'
      }, { status: 400 });
    }

    const { data: booking, error } = await supabaseAdmin
      .from('bookings')
      .select('id, total_price, payment_status')
      .eq('id', request_id)
      .single();

    if (error || !booking) {
      return NextResponse.json({
        success: false,
        response_code: 3,
        response_message: 'Payment not found',
        status: 'NOT FOUND'
      }, { status: 404 });
    }

    let status = 'PENDING';
    let responseCode = 2;

    if (booking.payment_status === 'escrowed') {
      status = 'SUCCESS';
      responseCode = 0;
    } else if (booking.payment_status === 'pending') {
      status = 'PENDING';
      responseCode = 2;
    } else if (booking.payment_status === 'failed' || booking.payment_status === 'cancelled') {
      status = 'FAILED';
      responseCode = 1;
    }

    return NextResponse.json({
      success: true,
      request_id,
      response_code: responseCode,
      status,
      response_message: status === 'SUCCESS' ? 'Payment successful' : status.toLowerCase(),
      amount: booking.total_price,
      reference_code: transaction_code
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      response_code: 1,
      response_message: 'Server error',
      status: 'FAILED'
    }, { status: 500 });
  }
}
