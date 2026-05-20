import { NextResponse } from 'next/server';
import { generateEsewaPayload } from '@/lib/esewa';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { bookingId, amount } = await req.json();

    if (!bookingId || !amount) {
      return NextResponse.json({ success: false, error: 'Missing bookingId or amount' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify booking belongs to user and is in a state ready to pay
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .eq('customer_id', user.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ success: false, error: 'Booking not found or access denied' }, { status: 404 });
    }

    if (booking.payment_status === 'escrowed' || booking.payment_status === 'released') {
      return NextResponse.json({ success: false, error: 'Booking already paid' }, { status: 400 });
    }

    // Generate payload by fetching live keys from database
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return '' }, set() {}, remove() {} } }
    );
    
    // We use bookingId as the transaction UUID so we can link it back easily
    const { payload, endpoint } = await generateEsewaPayload(supabaseAdmin, amount, bookingId);

    return NextResponse.json({ success: true, payload, endpoint });

  } catch (error: any) {
    console.error("eSewa Initiation Error:", error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
