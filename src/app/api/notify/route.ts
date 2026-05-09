import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only initialize if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SPARROW_SMS_TOKEN = process.env.SPARROW_SMS_TOKEN;
const SPARROW_SMS_IDENTITY = process.env.SPARROW_SMS_IDENTITY || 'Demo';

export async function POST(req: Request) {
  try {
    const { to, subject, html, phone, smsText } = await req.json();

    if ((!to || !subject || !html) && (!phone || !smsText)) {
      return NextResponse.json({ error: 'Missing required email or SMS fields' }, { status: 400 });
    }

    const results: any = { email: null, sms: null };

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
        if (!SPARROW_SMS_TOKEN) {
          console.log('--- MOCK SMS SENT ---');
          console.log('To:', cleanPhone);
          console.log('Text:', smsText);
          results.sms = 'mock_success';
        } else {
          // Sparrow SMS API Call
          const params = new URLSearchParams({
            token: SPARROW_SMS_TOKEN,
            from: SPARROW_SMS_IDENTITY,
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
