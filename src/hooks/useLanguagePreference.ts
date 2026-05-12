"use client";

import { useState, useEffect, useCallback } from "react";

export type Language = "en" | "ne" | "both";

export function useLanguagePreference() {
  const [language, setLanguageState] = useState<Language>("both");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sewakhoj_language_preference");
      if (saved === "en" || saved === "ne" || saved === "both") {
        setLanguageState(saved as Language);
      }
    } catch (e) {
      console.error("Failed to read language preference:", e);
    }
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("sewakhoj_language_preference", lang);
    } catch (e) {
      console.error("Failed to save language preference:", e);
    }
  }, []);

  const getLocalizedText = useCallback((en: string, ne: string) => {
    if (language === "en") return en;
    if (language === "ne") return ne;
    return `${en} · ${ne}`;
  }, [language]);

  return {
    language,
    setLanguage,
    initialized,
    getLocalizedText,
    showEnglish: language === "en" || language === "both",
    showNepali: language === "ne" || language === "both",
  };
}