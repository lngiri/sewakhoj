"use client";

import { useState } from "react";
import { Megaphone, Tag, Link as LinkIcon, BarChart } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

// Import the consolidated components
import PromoTab from "./components/PromoTab";
import AnnouncementsTab from "./components/AnnouncementsTab";

export default function MarketingHub() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("promo");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sewakhoj-red" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const tabs = [
    { id: "promo", label: "Promo Codes", icon: Tag },
    { id: "announcements", label: "Global Banners", icon: Megaphone },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-sewakhoj-red text-white flex items-center justify-center shadow-lg shadow-sewakhoj-red/20">
          <BarChart className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Marketing & Growth Hub</h1>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Unified Promotions Center</p>
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
                    ? "text-sewakhoj-red border-sewakhoj-red bg-white" 
                    : "text-gray-400 border-transparent hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-sewakhoj-red" : "opacity-70"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Area */}
        <div className="p-6 md:p-8 bg-white min-h-[60vh]">
          {activeTab === "promo" && <PromoTab />}
          {activeTab === "announcements" && <AnnouncementsTab />}
        </div>
      </div>
    </div>
  );
}
