"use client";

import { useState } from "react";
import { Wallet, PiggyBank, RefreshCw } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

// Import the consolidated components
import EscrowTab from "./components/EscrowTab";
import RevenueTab from "./components/RevenueTab";

export default function FinanceHub() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("escrow");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sewakhoj-red" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const tabs = [
    { id: "escrow", label: "eSewa Escrow Payouts", icon: Wallet },
    { id: "revenue", label: "Revenue Recovery (Cash)", icon: RefreshCw },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-600/20">
          <PiggyBank className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Financial Ledger Hub</h1>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Unified Payments & Collections Center</p>
        </div>
      </div>

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
          {activeTab === "escrow" && <EscrowTab />}
          {activeTab === "revenue" && <RevenueTab />}
        </div>
      </div>
    </div>
  );
}
