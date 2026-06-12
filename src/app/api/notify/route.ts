import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { sendSMS } from '@/lib/sms';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Only initialize if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { to, subject, html, phone, smsText } = await req.json();

    if ((!to || !subject || !html) && (!phone || !smsText)) {
      return NextResponse.json({ success: false, error: 'Missing required email or SMS fields' }, { status: 400 });
    }

    const results: any = { email: null, sms: null };

    // 1. Handle Email (Resend)
    if (to && subject && html) {
      if (!resend) {
        results.email = 'mock_disabled';
      } else {
        const data = await resend.emails.send({
          from: 'SewaKhoj <onboarding@resend.dev>',
          to,
          subject,
          html,
        });
        results.email = data;
      }
    }

    // 2. Handle SMS via Sparrow SMS library
    if (phone && smsText) {
      const smsResult = await sendSMS({ to: phone, text: smsText });
      results.sms = smsResult;
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process notifications' }, { status: 500 });
  }
}
