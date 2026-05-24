"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";

export function useSiteSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Fallbacks
  const FALLBACK_WHATSAPP = "9779763650737";
  const FALLBACK_CONTACT = "+977 9763650737";

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("id, value");

        if (error) throw error;

        const settingsMap = (data || []).reduce((acc: Record<string, string>, curr: any) => {
          acc[curr.id] = curr.value;
          return acc;
        }, {});

        setSettings(settingsMap);
      } catch (err) {
        console.error("Failed to fetch site settings:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const getWhatsAppNumber = () => {
    return settings['whatsapp_number'] || FALLBACK_WHATSAPP;
  };

  const getWhatsAppLink = () => {
    const num = getWhatsAppNumber().replace(/\D/g, "");
    return `https://wa.me/${num}`;
  };

  return {
    settings,
    loading,
    getWhatsAppNumber,
    getWhatsAppLink
  };
}
