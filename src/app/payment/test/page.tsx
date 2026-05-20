"use client";

import { useState } from "react";
import PaymentButton from "@/components/PaymentButton";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function PaymentTestPage() {
  const { user } = useAuth();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  const createTestBooking = async () => {
    if (!user) {
      setError("Please log in first to create a test booking.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      // Find any active tasker for the test
      const { data: tasker } = await supabase
        .from("taskers")
        .select("id, user_id")
        .eq("status", "active")
        .limit(1)
        .single();

      if (!tasker) {
        setError("No active taskers found. Seed a tasker first.");
        setCreating(false);
        return;
      }

      // Create a test booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          customer_id: user.id,
          tasker_id: tasker.id,
          service_type: "plumbing",
          description: "Test booking for eSewa payment verification",
          total_price: 100,
          payment_status: "pending",
          status: "pending",
        })
        .select("id")
        .single();

      if (bookingError) {
        setError(`Failed to create booking: ${bookingError.message}`);
        setCreating(false);
        return;
      }

      setBookingId(booking.id);
      setBookingStatus("pending");
    } catch (err: any) {
      setError(err.message || "Failed to create test booking");
    } finally {
      setCreating(false);
    }
  };

  const checkBookingStatus = async () => {
    if (!bookingId) return;
    const { data } = await supabase
      .from("bookings")
      .select("payment_status")
      .eq("id", bookingId)
      .single();
    if (data) setBookingStatus(data.payment_status);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-black text-gray-900 mb-2 text-center">
          eSewa Payment Test
        </h1>
        <p className="text-xs text-gray-400 text-center mb-6 uppercase tracking-widest font-bold">
          {process.env.NODE_ENV === "production" ? "⚠️ PRODUCTION MODE" : "🧪 TEST MODE"}
        </p>

        {!user && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 text-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-yellow-800">Login required</p>
            <p className="text-xs text-yellow-600 mt-1">You must be logged in to create a test booking.</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Step 1: Create Test Booking */}
          <div className="bg-gray-50 rounded-2xl p-5">
            <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center text-xs">1</span>
              Create Test Booking (Rs 100)
            </h3>
            
            {!bookingId ? (
              <button
                onClick={createTestBooking}
                disabled={creating || !user}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-black disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {creating ? (
                  <><LoadingSpinner size="xs" variant="white" /> Creating...</>
                ) : (
                  "Create Rs 100 Test Booking"
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-xl p-3">
                <CheckCircle className="w-5 h-5" />
                <div>
                  <p className="text-sm font-bold">Booking Created</p>
                  <p className="text-xs font-mono text-green-700">{bookingId.slice(0, 8)}...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs">
                {error}
              </div>
            )}
          </div>

          {/* Step 2: Pay with eSewa */}
          {bookingId && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center text-xs">2</span>
                Pay with eSewa
              </h3>
              <PaymentButton
                bookingId={bookingId}
                amount={100}
              />
            </div>
          )}

          {/* Step 3: Verify Status */}
          {bookingId && (
            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 bg-sewakhoj-red text-white rounded-full flex items-center justify-center text-xs">3</span>
                Verify Payment Status
              </h3>
              <div className="flex items-center gap-3">
                <PaymentStatusBadge
                  paymentStatus={bookingStatus || "pending"}
                  amount={100}
                />
                <button
                  onClick={checkBookingStatus}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all"
                >
                  Refresh
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                After completing eSewa payment, click Refresh to verify the booking status updated to "escrowed".
              </p>
            </div>
          )}

          {/* Test Credentials */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-xs font-black text-blue-600 uppercase mb-2">eSewa Test Credentials</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-700">Mobile:</span>
                <span className="font-mono text-blue-900 font-bold">9800000000</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Password:</span>
                <span className="font-mono text-blue-900 font-bold">test1234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">MPIN:</span>
                <span className="font-mono text-blue-900 font-bold">1111</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-700">Token:</span>
                <span className="font-mono text-blue-900 font-bold">111111</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-center text-gray-400">
            This is eSewa's test environment (rc-epay).<br />
            No real money will be charged.
          </div>
        </div>
      </div>
    </div>
  );
}
