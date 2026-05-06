"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase-browser';
import { usePathname } from 'next/navigation';

export default function TaskerLocationTracker() {
  const { user } = useAuth();
  const trackingInterval = useRef<number | null>(null);

  const pathname = usePathname();

  useEffect(() => {
    const isTasker = user?.user_metadata?.role === 'tasker';
    const isAdminRoute = pathname?.startsWith('/admin');
    
    if (!isTasker || isAdminRoute) {
      if (trackingInterval.current !== null) {
        window.clearInterval(trackingInterval.current);
        trackingInterval.current = null;
      }
      return;
    }

    const updateLocation = async (position: GeolocationPosition) => {
      try {
        // We do a fast fire-and-forget update.
        // It will only succeed if the tasker exists and has status = 'active'.
        // RLS will ensure taskers can only update their own records.
        await supabase
          .from('taskers')
          .update({
            last_lat: position.coords.latitude,
            last_long: position.coords.longitude
          })
          .eq('user_id', user.id);
      } catch (err) {
        console.error("Failed to update tasker location in background", err);
      }
    };

    const pollLocation = () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(updateLocation, (err) => {
          console.warn("Geolocation polling error:", err);
        }, {
          enableHighAccuracy: false, // Save battery since we poll often
          timeout: 10000,
          maximumAge: 30000
        });
      }
    };

    // Initial poll
    pollLocation();
    
    // Set up polling interval every 60 seconds to balance freshness and battery
    trackingInterval.current = window.setInterval(pollLocation, 60000);

    return () => {
      if (trackingInterval.current !== null) {
        window.clearInterval(trackingInterval.current);
      }
    };
  }, [user]);

  return null; // Invisible component
}
