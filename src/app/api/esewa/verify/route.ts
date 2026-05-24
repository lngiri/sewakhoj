import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const data = searchParams.get('data');

    if (!data) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_payment_callback`);
    }

    // Decode base64 data from eSewa
    const decodedDataStr = Buffer.from(data, 'base64').toString('utf-8');
    const decodedData = JSON.parse(decodedDataStr);

    const { transaction_uuid, status, total_amount, transaction_code } = decodedData;

    if (status !== 'COMPLETE') {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=payment_not_complete`);
    }

    // Setup Supabase admin client to update records safely
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: { get() { return '' }, set() {}, remove() {} }
      }
    );

    // Verify booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', transaction_uuid)
      .single();

    if (bookingError || !booking) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=booking_not_found`);
    }

    if (booking.payment_status === 'escrowed') {
      // Already processed
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=payment_already_processed`);
    }

    // 1. Update booking payment status
    await supabaseAdmin
      .from('bookings')
      .update({ payment_status: 'escrowed', payment_method: 'esewa' })
      .eq('id', booking.id);

    // 2. Fetch platform commission rate (with fallback)
    const { data: sData } = await supabaseAdmin.from('platform_settings').select('commission_rate_percentage').maybeSingle();
    const rate = sData ? Number(sData.commission_rate_percentage) / 100 : 0.10;

    const commissionAmount = Number(total_amount) * rate;

    // 3. Create commission ledger entry (payable to tasker)
    const { error: ledgerError } = await supabaseAdmin
      .from('commission_ledger')
      .insert({
        booking_id: booking.id,
        tasker_id: booking.tasker_id,
        total_amount: Number(total_amount),
        commission_amount: commissionAmount,
        type: 'payable', // We owe the tasker this money minus commission
        payment_method: 'esewa',
        status: 'pending' // Pending until task is marked complete
      });

    if (ledgerError) {
      console.error("Ledger insert error:", ledgerError);
    }

    // 4. Notify tasker & customer
    const { data: tData } = await supabaseAdmin.from('taskers').select('user_id').eq('id', booking.tasker_id).single();

    const notifications: any[] = [];

    if (tData?.user_id) {
      notifications.push({
        user_id: tData.user_id,
        title: "Payment Secured in Escrow 💰",
        message: `Customer has paid Rs ${total_amount} via eSewa. The funds are secured in escrow and will be released to your wallet upon task completion.`,
        type: 'info',
        link: `/dashboard`
      });
    }

    notifications.push({
      user_id: booking.customer_id,
      title: "Payment Successful",
      message: `Your payment of Rs ${total_amount} via eSewa has been secured in escrow.`,
      type: 'info',
      link: `/booking/${booking.id}/tracking`
    });

    if (notifications.length > 0) {
      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=payment_secured`);

  } catch (error: any) {
    console.error("eSewa Verify Error:", error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=payment_verification_failed`);
  }
}
