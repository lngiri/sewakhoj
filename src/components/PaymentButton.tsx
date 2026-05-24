"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { CreditCard } from "lucide-react";

interface Props {
  bookingId: string;
  amount: number;
  onSuccess?: () => void;
}

export default function PaymentButton({ bookingId, amount, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleEsewaPayment = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/esewa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, amount }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Payment initiation failed");

      // Create form and submit to eSewa
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.endpoint;
      form.target = "_self";

      Object.entries(data.payload).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = String(value);
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleEsewaPayment}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 transition-all"
      >
        {loading ? (
          <>
            <LoadingSpinner size="sm" variant="white" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay with eSewa
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Test credentials: <br />
        Mobile: <span className="font-mono">9800000000</span> |
        Password: <span className="font-mono">test1234</span>
      </div>
    </div>
  );
}
