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
    const { token, amount, bookingId } = body;

    if (!token || !amount || !bookingId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const khaltiSecretKey = process.env.KHALTI_SECRET_KEY || 'test_secret_key_00000000000000000000000000000000';

    const verifyResponse = await fetch('https://khalti.com/api/v2/payment/verify/', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${khaltiSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token,
        amount: Number(amount) * 100
      })
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      return NextResponse.json({ error: 'Payment verification failed', details: verifyData }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'escrowed',
        payment_method: 'khalti',
        payment_reference: token
      })
      .eq('id', bookingId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
    }

    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('tasker_id, total_price, customer_id')
      .eq('id', bookingId)
      .single();

    const { data: sData } = await supabaseAdmin.from('platform_settings').select('commission_rate_percentage').single();
    const rate = sData ? Number(sData.commission_rate_percentage) / 100 : 0.10;
    const commissionAmount = Number(amount) * rate;

    await supabaseAdmin.from('commission_ledger').insert({
      booking_id: bookingId,
      tasker_id: booking?.tasker_id,
      total_amount: Number(amount),
      commission_amount: commissionAmount,
      type: 'payable',
      payment_method: 'khalti',
      status: 'pending'
    });

    await supabaseAdmin.from('notifications').insert([
      {
        user_id: booking?.tasker_id,
        title: 'Payment Secured in Escrow 💰',
        message: `Customer has paid Rs ${amount} via Khalti. Funds are secured in escrow.`,
        type: 'info',
        link: '/dashboard/tasker'
      },
      {
        user_id: booking?.customer_id,
        title: 'Payment Successful',
        message: `Your payment of Rs ${amount} via Khalti has been secured in escrow.`,
        type: 'info',
        link: `/booking/${bookingId}/tracking`
      }
    ]);

    return NextResponse.json({ success: true, data: verifyData });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}