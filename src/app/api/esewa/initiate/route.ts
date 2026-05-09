import { NextResponse } from 'next/server';
import { generateEsewaPayload } from '@/lib/esewa';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { bookingId, amount } = await req.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ error: 'Missing bookingId or amount' }, { status: 400 });
    }

    // Authenticate user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; }
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify booking belongs to user and is in a state ready to pay
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found or access denied' }, { status: 404 });
    }

    if (booking.payment_status === 'escrowed' || booking.payment_status === 'released') {
      return NextResponse.json({ error: 'Booking already paid' }, { status: 400 });
    }

    // Generate payload
    // We use bookingId as the transaction UUID so we can link it back easily
    const payload = generateEsewaPayload(amount, bookingId);

    // Provide the eSewa endpoint (using test environment by default if not set)
    const esewaEndpoint = process.env.ESEWA_URL || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

    return NextResponse.json({ payload, endpoint: esewaEndpoint });

  } catch (error: any) {
    console.error("eSewa Initiation Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
