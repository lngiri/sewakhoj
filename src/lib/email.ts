import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: EmailOptions) {
  try {
    const { data, error } = await resend.emails.send({
      from: from || 'SewaKhoj <hello@sewakhoj.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error('Resend email error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error };
  }
}

// Email templates
export function getWelcomeEmail(name: string, role: 'customer' | 'tasker') {
  const roleText = role === 'tasker' ? 'साथी (Tasker)' : 'ग्राहक (Customer)';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #C0392B, #E74C3C); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #C0392B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>स्वागत छ! Welcome to SewaKhoj!</h1>
          </div>
          <div class="content">
            <p>नमस्ते ${name} / Hello ${name},</p>
            <p>Thank you for joining SewaKhoj as a <strong>${roleText}</strong>. We're excited to have you on board!</p>

            <h3>What's Next?</h3>
            ${role === 'tasker' ? `
              <ul>
                <li>Complete your profile setup</li>
                <li>Add your skills and service areas</li>
                <li>Set your availability hours</li>
                <li>Start receiving booking requests</li>
              </ul>
            ` : `
              <ul>
                <li>Browse available taskers in your area</li>
                <li>Book trusted professionals for your needs</li>
                <li>Track your bookings in real-time</li>
                <li>Rate and review your experience</li>
              </ul>
            `}

            <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button">Get Started</a>

            <p>If you have any questions, feel free to contact our support team.</p>
            <p>धन्यवाद! Thank you!</p>
          </div>
          <div class="footer">
            <p>© 2024 SewaKhoj - सेवा खोज. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getBookingConfirmationEmail(
  customerName: string,
  taskerName: string,
  service: string,
  date: string,
  time: string,
  address: string
) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #C0392B, #E74C3C); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed! / बुकिङ पुष्टि भयो!</h1>
          </div>
          <div class="content">
            <p>नमस्ते ${customerName} / Hello ${customerName},</p>
            <p>Your booking has been successfully confirmed.</p>

            <div class="details">
              <h3>Booking Details:</h3>
              <p><strong>Service:</strong> ${service}</p>
              <p><strong>Tasker:</strong> ${taskerName}</p>
              <p><strong>Date:</strong> ${date}</p>
              <p><strong>Time:</strong> ${time}</p>
              <p><strong>Address:</strong> ${address}</p>
            </div>

            <p>You can track your booking status in the app.</p>
            <p>धन्यवाद! Thank you for using SewaKhoj!</p>
          </div>
          <div class="footer">
            <p>© 2024 SewaKhoj - सेवा खोज. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getOTPEmail(otp: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #C0392B, #E74C3C); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; text-align: center; }
          .otp { font-size: 32px; font-weight: bold; color: #C0392B; letter-spacing: 5px; margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your OTP Code / तपाईंको OTP कोड</h1>
          </div>
          <div class="content">
            <p>Use the following OTP to verify your phone number:</p>
            <div class="otp">${otp}</div>
            <p>This code will expire in 5 minutes.</p>
            <p>यो कोड ५ मिनेटमा समाप्त हुनेछ।</p>
          </div>
          <div class="footer">
            <p>© 2024 SewaKhoj - सेवा खोज. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}
