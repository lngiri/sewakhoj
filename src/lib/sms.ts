/**
 * Sparrow SMS Integration for SewaKhoj
 * 
 * Config resolution priority:
 * 1. api_integrations table (sms_gateway row) — managed via Admin Dashboard
 * 2. Environment variables (SPARROW_SMS_TOKEN, SPARROW_SMS_IDENTITY)
 * 3. Mock mode — logs to console when no credentials are configured
 * 
 * Sparrow SMS API v2:
 * - Send SMS: GET http://api.sparrowsms.com/v2/sms/?token=...&from=...&to=...&text=...
 * - Check Credit: GET http://api.sparrowsms.com/v2/credit/?token=...
 */

const SPARROW_BASE_URL = "http://api.sparrowsms.com/v2";

export interface SMSOptions {
  /** Phone number (Nepal format: 98XXXXXXXX, 10 digits starting with 9) */
  to: string;
  /** SMS message text */
  text: string;
  /** Sender ID (max 11 chars, alphanumeric). Defaults to configured identity or 'SewaKhoj' */
  from?: string;
}

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  mock?: boolean;
}

export interface CreditResult {
  success: boolean;
  credits?: number;
  error?: string;
  mock?: boolean;
}

/**
 * Validate a Nepal phone number.
 * Accepts: 98XXXXXXXX, 97XXXXXXXX, 96XXXXXXXX (10 digits)
 * Also handles numbers with country code prefix (+977, 977)
 */
export function validatePhone(phone: string): { valid: boolean; clean: string } {
  const cleaned = phone.replace(/[^0-9]/g, "");
  
  // Strip Nepal country code if present
  let normalized = cleaned;
  if (normalized.startsWith("977") && normalized.length === 13) {
    normalized = normalized.slice(3);
  }
  
  // Must be exactly 10 digits starting with 9 (Nepal mobile)
  const valid = normalized.length === 10 && /^9[678]/.test(normalized);
  
  return { valid, clean: normalized };
}

/**
 * Resolve SMS configuration from DB or environment variables.
 * Returns null if no credentials are configured (mock mode).
 */
async function resolveConfig(): Promise<{ token: string; identity: string } | null> {
  // Try DB first (api_integrations table)
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return "" }, set() {}, remove() {} } }
    );

    const { data: smsConfig } = await supabaseAdmin
      .from("api_integrations")
      .select("api_key, merchant_id, is_enabled")
      .eq("service_name", "sms_gateway")
      .single();

    if (smsConfig?.is_enabled && smsConfig?.api_key) {
      return {
        token: smsConfig.api_key,
        identity: smsConfig.merchant_id || "SewaKhoj",
      };
    }
  } catch {
    // DB lookup failed — fall through to env vars
  }

  // Fallback to environment variables
  const token = process.env.SPARROW_SMS_TOKEN;
  if (token) {
    return {
      token,
      identity: process.env.SPARROW_SMS_IDENTITY || "SewaKhoj",
    };
  }

  // No credentials — mock mode
  return null;
}

/**
 * Send an SMS via Sparrow SMS API.
 * Falls back to mock mode (console log) if no credentials are configured.
 */
export async function sendSMS(options: SMSOptions): Promise<SMSResult> {
  const { valid, clean } = validatePhone(options.to);
  if (!valid) {
    await logSMS(clean, 'transactional', options.text, 'failed', 'Invalid phone number');
    return { success: false, error: `Invalid Nepal phone number: ${options.to}` };
  }

  const config = await resolveConfig();

  if (!config) {
    // Mock mode — log to console
    console.log("--- MOCK SMS (Sparrow) ---");
    console.log("To:", clean);
    console.log("From:", options.from || "SewaKhoj");
    console.log("Text:", options.text);
    console.log("---------------------------");
    await logSMS(clean, 'transactional', options.text, 'sent', 'mock mode');
    return { success: true, mock: true };
  }

  try {
    const params = new URLSearchParams({
      token: config.token,
      from: options.from || config.identity,
      to: clean,
      text: options.text,
    });

    const response = await fetch(`${SPARROW_BASE_URL}/sms/?${params.toString()}`);
    const data = await response.json();

    // Sparrow returns: { "count": 1, "response_code": 200, "response": "..." }
    if (data.response_code === 200) {
      await logSMS(clean, 'transactional', options.text, 'sent', JSON.stringify(data));
      return { success: true, messageId: data.response };
    }

    await logSMS(clean, 'transactional', options.text, 'failed', JSON.stringify(data));
    return { success: false, error: data.response || "SMS sending failed" };
  } catch (error: any) {
    console.error("Sparrow SMS error:", error);
    await logSMS(clean, 'transactional', options.text, 'failed', error.message);
    return { success: false, error: error.message || "Network error sending SMS" };
  }
}

/**
 * Log SMS to sms_logs table for cost monitoring (Phase 5.3).
 * Uses service_role client to bypass RLS.
 */
async function logSMS(
  phone: string,
  messageType: string,
  messageText: string | undefined,
  status: string,
  gatewayResponse: string
): Promise<void> {
  try {
    const { createServerClient } = await import("@supabase/ssr");
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { get() { return "" }, set() {}, remove() {} } }
    );
    await supabaseAdmin.from("sms_logs").insert({
      phone,
      message_type: messageType,
      message_text: messageText?.substring(0, 500) || null,
      message_length: messageText?.length || 0,
      status,
      error_message: status === 'failed' ? gatewayResponse : null,
      cost_estimate: 0.25,
      gateway_response: gatewayResponse?.substring(0, 1000) || null
    });
  } catch {
    // Non-critical: don't break SMS flow if logging fails
  }
}

/**
 * Check remaining SMS credits on Sparrow account.
 */
export async function checkBalance(): Promise<CreditResult> {
  const config = await resolveConfig();

  if (!config) {
    console.log("--- MOCK SMS Credit Check ---");
    console.log("Credits: N/A (mock mode)");
    console.log("-----------------------------");
    return { success: true, mock: true };
  }

  try {
    const params = new URLSearchParams({ token: config.token });
    const response = await fetch(`${SPARROW_BASE_URL}/credit/?${params.toString()}`);
    const data = await response.json();

    // Sparrow returns: { "credits": 100, "response_code": 200 }
    if (data.response_code === 200) {
      return { success: true, credits: data.credits };
    }

    return { success: false, error: data.response || "Credit check failed" };
  } catch (error: any) {
    console.error("Sparrow credit check error:", error);
    return { success: false, error: error.message || "Network error checking credits" };
  }
}

/**
 * Send an OTP (One-Time Password) via SMS.
 * Uses a standardized template format.
 */
export async function sendOTP(phone: string, otp: string, purpose: string = "verification"): Promise<SMSResult> {
  const message = `${otp} is your SewaKhoj ${purpose} code. Valid for 5 minutes. Do not share this with anyone.`;
  return sendSMS({ to: phone, text: message });
}

/**
 * Send a booking confirmation SMS to a customer.
 */
export async function sendBookingConfirmation(
  phone: string,
  taskerName: string,
  service: string,
  dateTime: string
): Promise<SMSResult> {
  const message = `Booking confirmed! ${taskerName} will arrive for ${service} on ${dateTime}. Track your booking on SewaKhoj.`;
  return sendSMS({ to: phone, text: message });
}

/**
 * Send a tasker assignment notification.
 */
export async function sendTaskerAlert(
  phone: string,
  customerName: string,
  service: string,
  location: string
): Promise<SMSResult> {
  const message = `New job: ${service} at ${location}. Customer: ${customerName}. Accept now on SewaKhoj.`;
  return sendSMS({ to: phone, text: message });
}