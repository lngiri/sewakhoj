import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const { token, amount, bookingId } = body;

    if (!token || !amount || !bookingId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Verify payment with Khalti API
    const khaltiSecretKey = Deno.env.get("KHALTI_SECRET_KEY") ?? "test_secret_key_00000000000000000000000000000000";

    const verifyResponse = await fetch("https://khalti.com/api/v2/payment/verify/", {
      method: "POST",
      headers: {
        "Authorization": `Key ${khaltiSecretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        token,
        amount: Number(amount) * 100 // Khalti uses paisa
      })
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      return new Response(JSON.stringify({ error: "Payment verification failed", details: verifyData }), { status: 400 });
    }

    // Update booking payment status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        payment_status: "escrowed",
        payment_method: "khalti",
        payment_reference: token
      })
      .eq("id", bookingId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update booking" }), { status: 500 });
    }

    // Create commission ledger entry
    const { data: booking } = await supabase
      .from("bookings")
      .select("tasker_id, total_price")
      .eq("id", bookingId)
      .single();

    const { data: sData } = await supabase.from("platform_settings").select("commission_rate_percentage").single();
    const rate = sData ? Number(sData.commission_rate_percentage) / 100 : 0.10;
    const commissionAmount = Number(amount) * rate;

    await supabase.from("commission_ledger").insert({
      booking_id: bookingId,
      tasker_id: booking?.tasker_id,
      total_amount: Number(amount),
      commission_amount: commissionAmount,
      type: "payable",
      payment_method: "khalti",
      status: "pending"
    });

    // Notify stakeholders
    await supabase.from("notifications").insert([
      {
        user_id: booking?.tasker_id,
        title: "Payment Secured in Escrow 💰",
        message: `Customer has paid Rs ${amount} via Khalti. Funds are secured in escrow.`,
        type: "info",
        link: "/dashboard/tasker"
      },
      {
        user_id: booking?.customer_id,
        title: "Payment Successful",
        message: `Your payment of Rs ${amount} via Khalti has been secured in escrow.`,
        type: "info",
        link: `/booking/${bookingId}/tracking`
      }
    ]);

    return new Response(JSON.stringify({ success: true, data: verifyData }), { status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
