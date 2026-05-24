import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { get() { return ''; }, set() {}, remove() {} }
    }
  );

  try {
    const url = new URL(req.url);
    const requestId = url.pathname.split('/').pop();

    if (!requestId) {
      return NextResponse.json({
        response_code: 1,
        response_message: 'Invalid token'
      }, { status: 400 });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        total_price,
        customer_id,
        taskers!inner(users!inner(full_name))
      `)
      .eq('id', requestId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({
        response_code: 1,
        response_message: 'Invalid or expired token'
      }, { status: 404 });
    }

    const customerName = booking.taskers?.[0]?.users?.[0]?.full_name || 'Customer';
    return NextResponse.json({
      request_id: requestId,
      response_code: 0,
      response_message: 'success',
      amount: booking.total_price,
      properties: {
        customer_name: customerName,
        service: 'SewaKhoj Task Service',
        booking_id: requestId
      }
    });

  } catch (error) {
    return NextResponse.json({
      response_code: 1,
      response_message: 'Server error'
    }, { status: 500 });
  }
}
