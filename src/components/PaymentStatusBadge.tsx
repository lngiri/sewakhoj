"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  paymentStatus: string | null;
  amount: number;
  className?: string;
}

export default function PaymentStatusBadge({ paymentStatus, amount, className = "" }: Props) {
  const getStatusConfig = () => {
    switch (paymentStatus) {
      case "escrowed":
        return {
          label: "Paid - Funds Secured",
          color: "bg-green-100 text-green-800 border-green-200",
          icon: "✓",
        };
      case "released":
        return {
          label: "Payment Released to Tasker",
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: "💸",
        };
      case "pending":
        return {
          label: `Pay Rs ${amount}`,
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: "⚠️",
        };
      case "failed":
        return {
          label: "Payment Failed",
          color: "bg-red-100 text-red-800 border-red-200",
          icon: "❌",
        };
      default:
        return {
          label: `Pay Rs ${amount}`,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: "💳",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold ${config.color} ${className}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
