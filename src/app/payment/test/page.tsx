"use client";

import PaymentButton from "@/components/PaymentButton";
import PaymentStatusBadge from "@/components/PaymentStatusBadge";

export default function PaymentTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <h1 className="text-2xl font-black text-gray-900 mb-6 text-center">
          Payment Test Page
        </h1>

        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Test Booking Demo</p>
            <PaymentStatusBadge 
              paymentStatus="pending" 
              amount={500} 
              className="mx-auto" 
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">
              Test eSewa Payment (Rs 500)
            </p>
            <PaymentButton 
              bookingId={`test-${Date.now()}`} 
              amount={500} 
            />
          </div>

          <div className="bg-gray-50 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Test Credentials</p>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-500">Mobile:</span>{" "}
                <span className="font-mono">9800000000</span>
              </div>
              <div>
                <span className="text-gray-500">Password:</span>{" "}
                <span className="font-mono">test1234</span>
              </div>
              <div>
                <span className="text-gray-500">MPIN:</span>{" "}
                <span className="font-mono">1111</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-center text-gray-400">
            This is eSewa's test environment.<br />
            No real money will be charged.
          </div>
        </div>
      </div>
    </div>
  );
}