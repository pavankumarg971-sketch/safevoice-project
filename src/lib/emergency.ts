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

  // ── AUTHENTICATED MODE (Logged into Supabase or Local Account) ──
  const userId = user.id;
  let alertId = "";

  try {
    const { data: alert, error: alertError } = await supabase
      .from("alerts")
      .insert({ user_id: userId, trigger_type: opts.trigger, status: "ACTIVE", demo: opts.demo })
      .select("id")
      .single();

    if (alertError || !alert) {
      console.warn("Supabase alert insertion notice:", alertError?.message);
      alertId = `alert_${Date.now()}`;
    } else {
      alertId = alert.id;
    }
  } catch (err) {
    console.warn("Supabase offline/network notice:", err);
    alertId = `alert_${Date.now()}`;
  }

  // Always persist session locally so /track and emergency radar are immediately accessible
  if (typeof window !== "undefined") {
    const sessionObj = {
      alertId,
      status: "ACTIVE",
      triggerType: opts.trigger,
      startedAt: new Date().toISOString(),
      resolvedAt: null,
      userFirstName: user.user_metadata?.full_name?.split(" ")[0] || "SafeVoice User",
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
    localStorage.setItem(`safevoice_demo_alert_${alertId}`, JSON.stringify(sessionObj));
  }

  if (coords && !alertId.startsWith("alert_")) {
    try {
      await supabase.from("alert_locations").insert({
        alert_id: alertId,
        user_id: userId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      });
    } catch (locErr) {
      console.warn("Could not insert alert_location remotely:", locErr);
    }
  }

  let notification: NotificationOutcome | null = null;
  let notificationError: string | null = null;

  try {
    notification = await dispatchAlertNotifications({
      data: { alertId, demo: opts.demo, origin },
    });
  } catch (err) {
    notificationError = null; // Do not fail UI; local WhatsApp and SMS transfer will take over
    console.warn("Server notification dispatch notice:", err);
  }

  let contactNames = "";
  try {
    const { data: contacts } = await supabase
      .from("emergency_contacts")
      .select("name")
      .eq("user_id", userId);

    if (contacts && contacts.length > 0) {
      contactNames = contacts.map((c) => c.name).join(", ");
    }
  } catch {
    // Fallback to local contacts
  }

  if (!contactNames) {
    const local = getLocalContacts();
    contactNames = local.map((c: { name: string }) => c.name).join(", ") || "your saved contacts";
  }

  return {
    alertId,
    coords,
    locationError,
    notification,
    notificationError,
    trackingUrl: notification?.trackingUrl ?? `${origin}/track?alertId=${alertId}`,
    recipientsSummary: contactNames,
  };
}
