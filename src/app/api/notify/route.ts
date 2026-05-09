import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@supabase/ssr';

// Only initialize if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const { to, subject, html, phone, smsText } = await req.json();

    if ((!to || !subject || !html) && (!phone || !smsText)) {
      return NextResponse.json({ error: 'Missing required email or SMS fields' }, { status: 400 });
    }

    const results: any = { email: null, sms: null };

    // Setup DB client to fetch integrations
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return '' }, set() {}, remove() {} } }
    );

    // 1. Handle Email
    if (to && subject && html) {
      if (!resend) {
        console.log('--- MOCK EMAIL SENT ---');
        console.log('To:', to);
        console.log('Subject:', subject);
        results.email = 'mock_success';
      } else {
        const data = await resend.emails.send({
          from: 'SewaKhoj <onboarding@resend.dev>', // Use verified domain in production
          to,
          subject,
          html,
        });
        results.email = data;
      }
    }

    // 2. Handle SMS (Sparrow SMS for Nepal)
    if (phone && smsText) {
      // Basic validation for Nepal numbers (10 digits starting with 9)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10 && cleanPhone.startsWith('9')) {
        
        // Fetch SMS API Key dynamically
        const { data: smsConfig } = await supabaseAdmin
          .from('api_integrations')
          .select('api_key, merchant_id')
          .eq('service_name', 'sms_gateway')
          .single();

        const sparrowToken = smsConfig?.api_key || process.env.SPARROW_SMS_TOKEN;
        const sparrowIdentity = smsConfig?.merchant_id || process.env.SPARROW_SMS_IDENTITY || 'Demo';

        if (!sparrowToken) {
          console.log('--- MOCK SMS SENT ---');
          console.log('To:', cleanPhone);
          console.log('Text:', smsText);
          results.sms = 'mock_success';
        } else {
          // Sparrow SMS API Call
          const params = new URLSearchParams({
            token: sparrowToken,
            from: sparrowIdentity,
            to: cleanPhone,
            text: smsText
          });
          
          const smsRes = await fetch(`http://api.sparrowsms.com/v2/sms/?${params.toString()}`);
          const smsData = await smsRes.json();
          results.sms = smsData;
        }
      } else {
        results.sms = { error: 'Invalid phone number format for SMS.' };
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Notification error:', error);
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 });
  }
}
