import { NextResponse } from "next/server";
import { sendSMS, sendOTP, checkBalance, validatePhone } from "@/lib/sms";

/**
 * POST /api/sms
 * 
 * Send SMS messages via Sparrow SMS.
 * 
 * Body:
 * - { action: "send", phone: "98XXXXXXXX", text: "message" }
 * - { action: "otp", phone: "98XXXXXXXX", otp: "123456", purpose: "login" }
 * - { action: "balance" }
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, phone, text, otp, purpose } = body;

    switch (action) {
      case "send": {
        if (!phone || !text) {
          return NextResponse.json(
            { error: "phone and text are required for send action" },
            { status: 400 }
          );
        }
        const result = await sendSMS({ to: phone, text });
        return NextResponse.json(result);
      }

      case "otp": {
        if (!phone || !otp) {
          return NextResponse.json(
            { error: "phone and otp are required for otp action" },
            { status: 400 }
          );
        }
        const result = await sendOTP(phone, otp, purpose || "verification");
        return NextResponse.json(result);
      }

      case "balance": {
        const result = await checkBalance();
        return NextResponse.json(result);
      }

      case "validate": {
        if (!phone) {
          return NextResponse.json(
            { error: "phone is required for validate action" },
            { status: 400 }
          );
        }
        const validation = validatePhone(phone);
        return NextResponse.json(validation);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use 'send', 'otp', 'balance', or 'validate'` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("SMS API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}