import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Only initialize if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(req: Request) {
  try {
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!resend) {
      // If no API key, just log it out (good for development)
      console.log('--- MOCK EMAIL SENT ---');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('HTML:', html);
      return NextResponse.json({ success: true, message: 'Mock email sent (No API key found)' });
    }

    const data = await resend.emails.send({
      from: 'SewaKhoj <onboarding@resend.dev>', // Use verified domain in production
      to,
      subject,
      html,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Email error:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
