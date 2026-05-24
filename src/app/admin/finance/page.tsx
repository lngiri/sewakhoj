"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet, PiggyBank, RefreshCw, DollarSign, ShieldAlert } from "lucide-react";
import { useAdminAuth, FINANCE_ROLES } from "@/hooks/useAdminAuth";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Import the consolidated components
import EscrowTab from "./components/EscrowTab";
import RevenueTab from "./components/RevenueTab";
import PayoutsTab from "./components/PayoutsTab";

export default function FinanceHub() {
  const { isAdmin, loading: authLoading, hasAccess, role } = useAdminAuth(FINANCE_ROLES);
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "payouts");
  const highlightId = searchParams.get("id");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  if (!isAdmin) return null;

  // Role-scoped access guard
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Your role ({role}) does not have permission to access the Finance Ledger.
          This section requires {FINANCE_ROLES.join(" or ")} role.
        </p>
        <Link href="/admin">
          <Button variant="brand" size="pill">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "payouts", label: "Tasker Payouts", icon: DollarSign },
    { id: "escrow", label: "eSewa Escrow", icon: Wallet },
    { id: "revenue", label: "Revenue Recovery (Cash)", icon: RefreshCw },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Financial Ledger Hub"
        description="Payouts, Escrow Settlements & Revenue Collection"
        relatedLinks={[
          { label: "Command Center", href: "/admin", description: "Back to dashboard" },
          { label: "Operations", href: "/admin/operations", description: "Tasker & finance overview" },
        ]}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b border-gray-100 hide-scrollbar bg-gray-50/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-[13px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? "text-green-600 border-green-600 bg-white"
                    : "text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-green-600" : "opacity-70"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 md:p-8 bg-white min-h-[60vh]">
          {activeTab === "payouts" && <PayoutsTab />}
          {activeTab === "escrow" && <EscrowTab highlightId={highlightId} />}
          {activeTab === "revenue" && <RevenueTab />}
        </div>
      </div>
    </div>
  );
}
