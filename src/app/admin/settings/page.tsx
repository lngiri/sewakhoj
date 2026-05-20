"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings, CreditCard, Map, Link as LinkIcon, Database, ShieldAlert } from "lucide-react";
import { useAdminAuth, SETTINGS_ROLES } from "@/hooks/useAdminAuth";
import PageHeader from "@/components/navigation/PageHeader";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";

// Import the consolidated components
import FinancialTab from "./components/FinancialTab";
import IntegrationsTab from "./components/IntegrationsTab";
import CitiesTab from "./components/CitiesTab";
import CategoriesTab from "./components/CategoriesTab";

export default function PlatformSettingsHub() {
  const { isAdmin, loading: authLoading, hasAccess, role } = useAdminAuth(SETTINGS_ROLES);
  const [activeTab, setActiveTab] = useState("finance");

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="md" />
      </div>
    );
  }
  if (!isAdmin) return null;

  // Role-scoped access guard: only super_admin and admin can access settings
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          Your role ({role}) does not have permission to access Platform Settings.
          This section requires super_admin or admin role.
        </p>
        <Link href="/admin">
          <Button variant="brand" size="pill">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const tabs = [
    { id: "finance", label: "Financial Core", icon: CreditCard },
    { id: "integrations", label: "Connect Hub", icon: LinkIcon },
    { id: "cities", label: "Geographies", icon: Map },
    { id: "services", label: "Task Categories", icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Platform Settings Hub"
        description="Unified Configuration Center"
        relatedLinks={[
          { label: "Command Center", href: "/admin", description: "Back to dashboard" },
          { label: "Finance", href: "/admin/finance", description: "Ledger & payouts" },
          { label: "Operations", href: "/admin/operations", description: "Tasker management" },
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
          {activeTab === "finance" && <FinancialTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "cities" && <CitiesTab />}
          {activeTab === "services" && <CategoriesTab />}
        </div>
      </div>
    </div>
  );
}
