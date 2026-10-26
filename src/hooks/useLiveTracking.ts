import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { endEmergencySession } from "@/lib/notifications.functions";
import { toast } from "sonner";

export type LiveCoords = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
};

export function useLiveTracking() {
  const { user } = useAuth();
  const [activeAlertId, setActiveAlertId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("safevoice_active_alert_id");
    }
    return null;
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [latestCoords, setLatestCoords] = useState<LiveCoords | null>(null);
  const [pointsSent, setPointsSent] = useState(0);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const lastSentTimeRef = useRef<number>(0);

  // Upload coordinate to Supabase or localStorage
  const pushLocationUpdate = useCallback(
    async (coords: GeolocationCoordinates, timestamp: number) => {
      if (!activeAlertId) return;

      // Rate limit updates to at most once every 4 seconds
      const now = Date.now();
      if (now - lastSentTimeRef.current < 4000) return;
      lastSentTimeRef.current = now;

      // Update local storage session so /track and tracker tab receive real-time location updates
      if (typeof window !== "undefined") {
        const key = `safevoice_demo_alert_${activeAlertId}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const sessionObj = JSON.parse(raw);
            sessionObj.latestLocation = {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              created_at: new Date().toISOString(),
            };
            sessionObj.locations = sessionObj.locations || [];
            sessionObj.locations.push(sessionObj.latestLocation);
            localStorage.setItem(key, JSON.stringify(sessionObj));
          } catch (e) {
            console.warn(e);
          }
        }
      }

      setLatestCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp,
      });
      setPointsSent((prev) => prev + 1);

      // Also upload to remote Supabase database if authenticated
      if (user && !activeAlertId.startsWith("demo-") && !activeAlertId.startsWith("alert_")) {
        try {
          await supabase.from("alert_locations").insert({
            alert_id: activeAlertId,
            user_id: user.id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
          });
        } catch (err) {
          console.warn("Failed to stream location update to database:", err);
        }
      }
    },
    [activeAlertId, user],
  );

  // Start watchPosition
  const startStreaming = useCallback(
    (alertId: string) => {
      setActiveAlertId(alertId);
      if (typeof window !== "undefined") {
        localStorage.setItem("safevoice_active_alert_id", alertId);
      }

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setGpsError("Geolocation is not supported by this browser.");
        return;
      }

      setGpsError(null);
      setIsStreaming(true);

      const id = navigator.geolocation.watchPosition(
        (position) => {
          pushLocationUpdate(position.coords, position.timestamp);
        },
        (error) => {
          setGpsError(error.message);
          console.warn("watchPosition error:", error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 3000,
        },
      );

      watchIdRef.current = id;
    },
    [pushLocationUpdate],
  );

  // Stop watchPosition
  const stopStreaming = useCallback(async () => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (activeAlertId && typeof window !== "undefined") {
      const key = `safevoice_demo_alert_${activeAlertId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const sessionObj = JSON.parse(raw);
          sessionObj.status = "RESOLVED";
          sessionObj.resolvedAt = new Date().toISOString();
          localStorage.setItem(key, JSON.stringify(sessionObj));
        } catch (e) {
          console.warn(e);
        }
      }
    }

    if (
      activeAlertId &&
      user &&
      !activeAlertId.startsWith("demo-") &&
      !activeAlertId.startsWith("alert_")
    ) {
      try {
        await endEmergencySession({ data: activeAlertId });
      } catch (err) {
        console.warn("Could not mark alert resolved on server:", err);
      }
    }

    setIsStreaming(false);
    setActiveAlertId(null);
    setPointsSent(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem("safevoice_active_alert_id");
    }
    toast.success("Emergency SOS session ended. Live location streaming stopped.");
  }, [activeAlertId, user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    activeAlertId,
    isStreaming,
    latestCoords,
    pointsSent,
    gpsError,
    startStreaming,
    stopStreaming,
  };
}
