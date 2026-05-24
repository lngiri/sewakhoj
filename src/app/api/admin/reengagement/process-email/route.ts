import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createServerClient } from "@supabase/ssr";
import { sendEmail, getWelcomeEmail } from "@/lib/email";
import { validateAdminApiAccess, SETTINGS_ROLES } from "@/lib/admin-auth";

// POST /api/admin/reengagement/process-email - Process pending email queue entries
export async function POST(req: NextRequest) {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const limit = Math.min(body.limit || 20, 100);

    // Use service role client to read the queue
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return ""; },
          set() {},
          remove() {},
        },
      }
    );

    // Fetch pending emails
    const { data: pending, error: fetchError } = await supabaseAdmin
      .from("email_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!pending || pending.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, failed: 0, remaining: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const entry of pending) {
      try {
        // Build email HTML from template
        let html: string;
        const data = entry.template_data || {};

        switch (entry.template_name) {
          case "reengagement_customer":
            html = getReengagementEmail(
              data.name || "there",
              "customer",
              data.days_inactive || 30
            );
            break;
          case "reengagement_tasker":
            html = getReengagementEmail(
              data.name || "there",
              "tasker",
              data.days_inactive || 30
            );
            break;
          default:
            html = getReengagementEmail(data.name || "there", "customer", 30);
        }

        const result = await sendEmail({
          to: entry.email,
          subject: entry.subject,
          html,
        });

        if (result.success) {
          await supabaseAdmin
            .from("email_queue")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", entry.id);
          sent++;
        } else {
          await supabaseAdmin
            .from("email_queue")
            .update({
              status: "failed",
              error_message: (result.error as string) || "Unknown error",
            })
            .eq("id", entry.id);
          failed++;
        }
      } catch (err: any) {
        await supabaseAdmin
          .from("email_queue")
            .update({
              status: "failed",
              error_message: err.message || "Unknown error",
            })
          .eq("id", entry.id);
        failed++;
      }
    }

    // Count remaining
    const { count } = await supabaseAdmin
      .from("email_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      processed: pending.length,
      sent,
      failed,
      remaining: count || 0,
    });
  } catch (error: any) {
    console.error("Email queue processor error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/admin/reengagement/process-email - Check queue status
export async function GET() {
  try {
    const auth = await validateAdminApiAccess(SETTINGS_ROLES);
    if (auth instanceof NextResponse) return auth;

    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() { return ""; },
          set() {},
          remove() {},
        },
      }
    );

    const { count: pending } = await supabaseAdmin
      .from("email_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending");

    const { count: sent } = await supabaseAdmin
      .from("email_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent");

    const { count: failed } = await supabaseAdmin
      .from("email_queue")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed");

    return NextResponse.json({
      pending: pending || 0,
      sent: sent || 0,
      failed: failed || 0,
      total: (pending || 0) + (sent || 0) + (failed || 0),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Email template builder for re-engagement
function getReengagementEmail(
  name: string,
  role: "customer" | "tasker",
  daysInactive: number
): string {
  const roleText = role === "tasker" ? "साथी (Tasker)" : "ग्राहक (Customer)";
  const ctaLink = process.env.NEXT_PUBLIC_APP_URL || "https://sewakhoj.com";
  const ctaLabel = role === "tasker" ? "View Opportunities" : "Browse Taskers";

  const bodyContent =
    role === "tasker"
      ? `
        <p>It's been <strong>${daysInactive} days</strong> since your last visit.</p>
        <p>Customers in your area are actively looking for skilled professionals.
        Don't miss out on new booking opportunities!</p>
        <ul>
          <li>Check your pending booking requests</li>
          <li>Update your availability and service areas</li>
          <li>Respond to customer inquiries quickly</li>
        </ul>
      `
      : `
        <p>It's been <strong>${daysInactive} days</strong> since your last visit.</p>
        <p>Need help with chores, repairs, or services? Browse our trusted taskers
        and book the right professional for your needs.</p>
        <ul>
          <li>Browse top-rated taskers in your area</li>
          <li>Book trusted professionals for any service</li>
          <li>Track your bookings in real-time</li>
        </ul>
      `;

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
            <h1>We Miss You at SewaKhoj!</h1>
          </div>
          <div class="content">
            <p>नमस्ते ${name} / Hello ${name},</p>
            ${bodyContent}
            <a href="${ctaLink}" class="button">${ctaLabel}</a>
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
