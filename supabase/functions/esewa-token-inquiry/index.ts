import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    // eSewa Token API calls our endpoint with request_id (token)
    const url = new URL(req.url);
    const requestId = url.pathname.split("/").pop();

    if (!requestId) {
      return new Response(JSON.stringify({
        response_code: 1,
        response_message: "Invalid token"
      }), { status: 400 });
    }

    // Look up booking by token/request_id
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        id,
        total_price,
        customer_id,
        taskers!inner(users!inner(full_name))
      `)
      .eq("id", requestId)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({
        response_code: 1,
        response_message: "Invalid or expired token"
      }), { status: 404 });
    }

    // Return payment details to eSewa
    return new Response(JSON.stringify({
      request_id: requestId,
      response_code: 0,
      response_message: "success",
      amount: booking.total_price,
      properties: {
        customer_name: booking.taskers?.users?.full_name || "Customer",
        service: "SewaKhoj Task Service",
        booking_id: requestId
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      response_code: 1,
      response_message: "Server error"
    }), { status: 500 });
  }
});
