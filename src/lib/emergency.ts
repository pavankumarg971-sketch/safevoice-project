import { supabase } from "@/integrations/supabase/client";
import { getCurrentCoords, googleMapsUrl, type Coords } from "@/lib/geolocation";
import {
  dispatchAlertNotifications,
  type NotificationOutcome,
  type NotificationLogItem,
} from "@/lib/notifications.functions";

export type EmergencyResult = {
  alertId: string;
  coords: Coords | null;
  locationError: string | null;
  notification: NotificationOutcome | null;
  notificationError: string | null;
  trackingUrl: string | null;
  recipientsSummary: string;
};

// Local storage helper for guest mode contacts
export function getLocalContacts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("safevoice_emergency_contacts");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn("Could not read local contacts", e);
  }
  return [];
}

/**
 * Full emergency workflow:
 * 1. Read device GPS coordinates (with accuracy)
 * 2. If logged in: insert into Supabase `alerts` & `alert_locations` and call server dispatch
 * 3. If in guest/demo mode: simulate alert and dispatch to all locally configured contacts
 * 4. Return active emergency session ID for live watchPosition streaming
 */
export async function triggerEmergency(opts: {
  trigger: "BUTTON" | "VOICE";
  demo: boolean;
}): Promise<EmergencyResult> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user ?? null;

  // 1. Obtain GPS
  let coords: Coords | null = null;
  let locationError: string | null = null;
  try {
    coords = await getCurrentCoords();
  } catch (err) {
    locationError = (err as Error).message;
    // Default fallback coordinates if browser location permission was blocked
    coords = {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 10,
      timestamp: Date.now(),
    };
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:8081";

  // ── GUEST / PREVIEW MODE (When not logged in) ──────────────────────
  if (!user) {
    const alertId = `demo-${Date.now()}`;
    const trackingUrl = `${origin}/track?alertId=${alertId}`;
    const localContacts = getLocalContacts();

    // Store demo session in localStorage so /track and watchPosition can read it
    if (typeof window !== "undefined") {
      const demoSession = {
        alertId,
        status: "ACTIVE",
        triggerType: opts.trigger,
        startedAt: new Date().toISOString(),
        resolvedAt: null,
        userFirstName: "SafeVoice User",
        latestLocation: coords
          ? {
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              created_at: new Date().toISOString(),
            }
          : null,
        locations: coords
          ? [
              {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy: coords.accuracy,
                created_at: new Date().toISOString(),
              },
            ]
          : [],
      };
      localStorage.setItem(`safevoice_demo_alert_${alertId}`, JSON.stringify(demoSession));
    }

    const logs: NotificationLogItem[] = [];
    localContacts.forEach((c: { name: string; phone: string }) => {
      logs.push({
        recipient: c.phone,
        contactName: c.name,
        type: "SMS",
        status: "SIMULATED",
        errorMessage: "Simulated SOS SMS in Preview Mode",
      });
      logs.push({
        recipient: c.phone,
        contactName: c.name,
        type: "VOICE_CALL",
        status: "SIMULATED",
        errorMessage: "Simulated Automated Emergency Call",
      });
    });

    const contactNames = localContacts.map((c: { name: string }) => c.name).join(", ");
    const notification: NotificationOutcome = {
      overall: "SIMULATED",
      sent: 0,
      failed: 0,
      total: logs.length,
      message: `Alert triggered. Simulated emergency broadcast sent to: ${contactNames || "all contacts"}.`,
      trackingUrl,
      logs,
    };

    return {
      alertId,
      coords,
      locationError,
      notification,
      notificationError: null,
      trackingUrl,
      recipientsSummary: contactNames || "all saved contacts",
    };
  }

  // ── AUTHENTICATED MODE (Logged into Supabase) ─────────────────────
  const userId = user.id;

  const { data: alert, error: alertError } = await supabase
    .from("alerts")
    .insert({ user_id: userId, trigger_type: opts.trigger, status: "ACTIVE", demo: opts.demo })
    .select("id")
    .single();

  if (alertError || !alert) {
    throw new Error(alertError?.message ?? "Unable to create emergency alert in database.");
  }

  if (coords) {
    await supabase.from("alert_locations").insert({
      alert_id: alert.id,
      user_id: userId,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
    });
  }

  let notification: NotificationOutcome | null = null;
  let notificationError: string | null = null;

  try {
    notification = await dispatchAlertNotifications({
      data: { alertId: alert.id, demo: opts.demo, origin },
    });
  } catch (err) {
    notificationError =
      "Alert saved in database, but notification dispatch encountered an error.";
    console.error("Notification dispatch failed:", err);
  }

  const { data: contacts } = await supabase
    .from("emergency_contacts")
    .select("name")
    .eq("user_id", userId);

  const contactNames = contacts?.map((c) => c.name).join(", ") || "your saved contacts";

  return {
    alertId: alert.id,
    coords,
    locationError,
    notification,
    notificationError,
    trackingUrl: notification?.trackingUrl ?? `${origin}/track?alertId=${alert.id}`,
    recipientsSummary: contactNames,
  };
}
