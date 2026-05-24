"use client";

import { useEffect, useState } from "react";

type SWStatus = "loading" | "registered" | "unsupported" | "error";

/**
 * Registers the standalone push notification service worker (sw-push.js).
 * This runs alongside the Workbox-generated sw.js (precache/routing).
 * Must be called from a client component.
 */
export function useRegisterSW(): { status: SWStatus; error?: string } {
  const [status, setStatus] = useState<SWStatus>("loading");

  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;

    const register = async () => {
      try {
        // Check if already registered
        const registrations = await navigator.serviceWorker.getRegistrations();
        const hasPushSW = registrations.some(
          (reg) => reg.active?.scriptURL?.includes("sw-push.js")
        );

        if (hasPushSW) {
          if (!cancelled) setStatus("registered");
          return;
        }

        // Register the push service worker with scope "/"
        await navigator.serviceWorker.register("/sw-push.js", {
          scope: "/",
        });

        if (!cancelled) setStatus("registered");
      } catch (err: any) {
        if (!cancelled) {
          setStatus("error");
          console.error("Failed to register push service worker:", err);
        }
      }
    };

    // Wait for the page to be fully loaded before registering SW
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return { status };
}

/**
 * Client component that registers the push service worker on mount.
 * Renders nothing — purely a side-effect component.
 */
export default function ServiceWorkerRegistrar() {
  useRegisterSW();
  return null;
}