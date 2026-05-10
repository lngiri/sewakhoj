"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';

/**
 * TaskerLocationTracker
 * Synchronizes the tasker's current GPS coordinates to Supabase.
 * Rendered globally in the RootLayout but only active for Taskers.
 */
export default function TaskerLocationTracker() {
  const { user } = useAuth();
  const [confirmedTaskerId, setConfirmedTaskerId] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function checkTaskerStatus() {
      if (!user) {
        setConfirmedTaskerId(null);
        return;
      }
      
      // Check metadata first (fast)
      if (user.user_metadata?.role === 'tasker') {
        setConfirmedTaskerId(user.id);
        return;
      }

      // Fallback: Check database (reliable for new taskers)
      const { data } = await supabase.from('taskers').select('id').eq('user_id', user.id).single();
      if (data) {
        setConfirmedTaskerId(data.id);
      }
    }
    checkTaskerStatus();
  }, [user]);

  useEffect(() => {
    if (!confirmedTaskerId || !user) {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
      return;
    }

    const updateLocation = async (position: GeolocationPosition) => {
      try {
        const { latitude: lat, longitude: lng, accuracy } = position.coords;
        const now = new Date().toISOString();

        // 1. Update dedicated tracking table (for high-freq history/realtime)
        await supabase
          .from('tasker_locations')
          .upsert({
            tasker_id: user.id,
            lat,
            lng,
            accuracy,
            last_updated: now
          }, { onConflict: 'tasker_id' });

        // 2. Sync to taskers table (for legacy admin map compatibility & easy filtering)
        await supabase
          .from('taskers')
          .update({
            last_lat: lat,
            last_long: lng,
            last_seen_at: now
          })
          .eq('user_id', user.id);

      } catch (err) {
        console.error("Failed to sync live location", err);
      }
    };

    if ('geolocation' in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        updateLocation,
        (err) => console.warn("Geo Watch Error:", err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    }

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [user, confirmedTaskerId]);

  return null; 
}
