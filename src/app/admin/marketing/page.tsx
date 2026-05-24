"use client";

import { useState } from "react";
import { Megaphone, Tag, Users, BarChart } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

// Import the consolidated components
import PromoTab from "./components/PromoTab";
import AnnouncementsTab from "./components/AnnouncementsTab";
import ReengagementTab from "./components/ReengagementTab";

export default function MarketingHub() {
  const { isAdmin, loading: authLoading } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("promo");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  if (!isAdmin) return null;

  const tabs = [
    { id: "promo", label: "Promo Codes", icon: Tag },
    { id: "announcements", label: "Global Banners", icon: Megaphone },
    { id: "reengagement", label: "Re-engagement", icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Marketing & Growth Hub"
        description="Unified Promotions Center"
        relatedLinks={[
          { label: "Command Center", href: "/admin", description: "Back to dashboard" },
          { label: "Finance", href: "/admin/finance", description: "Revenue & payouts" },
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
          {activeTab === "reengagement" && <ReengagementTab />}
        </div>
      </div>
    </div>
  );
}
