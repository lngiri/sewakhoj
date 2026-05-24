import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const { request_id, transaction_code, amount } = body;

    if (!request_id || !transaction_code) {
      return new Response(JSON.stringify({
        response_code: 1,
        response_message: "Missing required fields",
        status: "FAILED"
      }), { status: 400 });
    }

    // Look up booking by token
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, total_price, payment_status")
      .eq("id", request_id)
      .single();

    if (error || !booking) {
      return new Response(JSON.stringify({
        response_code: 3,
        response_message: "Payment not found",
        status: "NOT FOUND"
      }), { status: 404 });
    }

    // Determine status based on payment_status
    let status = "PENDING";
    let responseCode = 2;

    if (booking.payment_status === "escrowed") {
      status = "SUCCESS";
      responseCode = 0;
    } else if (booking.payment_status === "pending") {
      status = "PENDING";
      responseCode = 2;
    } else if (booking.payment_status === "failed" || booking.payment_status === "cancelled") {
      status = "FAILED";
      responseCode = 1;
    }

    return new Response(JSON.stringify({
      request_id,
      response_code: responseCode,
      status,
      response_message: status === "SUCCESS" ? "Payment successful" : status.toLowerCase(),
      amount: booking.total_price,
      reference_code: transaction_code
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      response_code: 1,
      response_message: "Server error",
      status: "FAILED"
    }), { status: 500 });
  }
});
