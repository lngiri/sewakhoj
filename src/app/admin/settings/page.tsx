"use client";

import { useState } from "react";
import { Settings, CreditCard, Map, Link as LinkIcon, Database } from "lucide-react";

// Import the consolidated components
import FinancialTab from "./components/FinancialTab";
import IntegrationsTab from "./components/IntegrationsTab";
import CitiesTab from "./components/CitiesTab";
import CategoriesTab from "./components/CategoriesTab";

export default function PlatformSettingsHub() {
  const [activeTab, setActiveTab] = useState("finance");

  const tabs = [
    { id: "finance", label: "Financial Core", icon: CreditCard },
    { id: "integrations", label: "Connect Hub", icon: LinkIcon },
    { id: "cities", label: "Geographies", icon: Map },
    { id: "services", label: "Task Categories", icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gray-900 text-white flex items-center justify-center shadow-lg">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Platform Settings Hub</h1>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-0.5">Unified Configuration Center</p>
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
          {activeTab === "finance" && <FinancialTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "cities" && <CitiesTab />}
          {activeTab === "services" && <CategoriesTab />}
        </div>
      </div>
    </div>
  );
}
