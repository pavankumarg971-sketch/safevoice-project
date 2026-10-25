import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  alertId: z.string().uuid(),
  demo: z.boolean().optional().default(false),
  origin: z.string().optional(),
});

export type NotificationLogItem = {
  id?: string;
  recipient: string;
  type: "SMS" | "VOICE_CALL" | "EMAIL";
  status: "SENT" | "FAILED" | "NOT_CONFIGURED" | "SIMULATED" | "PENDING";
  providerMessageId?: string | null;
  errorMessage?: string | null;
  contactName?: string;
};

export type NotificationOutcome = {
  overall: "SENT" | "PARTIAL" | "FAILED" | "NOT_CONFIGURED" | "SIMULATED" | "NO_CONTACTS";
  sent: number;
  failed: number;
  total: number;
  message: string;
  trackingUrl: string | null;
  logs: NotificationLogItem[];
};

/**
 * Sends emergency notifications (SMS, Voice Calls, Email) to the alert owner's emergency contacts.
 * Server credentials remain strictly on the backend.
 * Nothing is ever reported as "Delivered" if the provider only acknowledged receipt (queued).
 */
export const dispatchAlertNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }): Promise<NotificationOutcome> => {
    const { supabase, userId } = context;

    const { data: alert, error: alertError } = await supabase
      .from("alerts")
      .select("id, user_id, trigger_type, created_at, demo, status")
      .eq("id", data.alertId)
      .maybeSingle();

    if (alertError) throw new Error(alertError.message);
    if (!alert || alert.user_id !== userId) throw new Error("Alert not found.");

    const { data: contacts } = await supabase
      .from("emergency_contacts")
      .select("id, name, phone, email, is_primary")
      .eq("user_id", userId)
      .order("is_primary", { ascending: false });

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: loc } = await supabase
      .from("alert_locations")
      .select("latitude, longitude, accuracy, created_at")
      .eq("alert_id", alert.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const demo = Boolean(data.demo || alert.demo);

    // Read provider credentials from server environment
    const twilioSid = process.env["TWILIO_ACCOUNT_SID"];
    const twilioToken = process.env["TWILIO_AUTH_TOKEN"];
    const twilioFrom = process.env["TWILIO_PHONE_NUMBER"];
    const resendKey = process.env["RESEND_API_KEY"];
    const resendFrom = process.env["RESEND_FROM_EMAIL"] ?? "onboarding@resend.dev";

    const smsConfigured = Boolean(twilioSid && twilioToken && twilioFrom);
    const voiceConfigured = Boolean(twilioSid && twilioToken && twilioFrom);
    const emailConfigured = Boolean(resendKey);

    const who = profile?.full_name?.trim() || "Your trusted contact";
    const mapLink = loc
      ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`
      : "Location unavailable";
    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const origin = data.origin || "http://localhost:8081";
    const trackingUrl = `${origin}/track?alertId=${alert.id}`;

    // Exact required emergency message format
    const smsBody =
      `${demo ? "[DEMO/TEST] " : ""}EMERGENCY ALERT: Your trusted contact (${who}) may need urgent assistance.` +
      ` Last reported location: ${mapLink}.` +
      ` Time: ${timeStr}.` +
      ` Live Tracker: ${trackingUrl}.` +
      ` Please contact them and seek appropriate assistance.`;

    type DbLogRow = {
      alert_id: string;
      contact_id: string | null;
      user_id: string;
      notification_type: string;
      recipient: string;
      status: "SENT" | "FAILED" | "NOT_CONFIGURED" | "SIMULATED" | "PENDING";
      provider_message_id: string | null;
      error_message: string | null;
    };

    const dbLogs: DbLogRow[] = [];
    const clientLogs: NotificationLogItem[] = [];

    // 1. Send SMS via Twilio
    async function sendTwilioSms(to: string, contactName: string): Promise<void> {
      if (demo) {
        dbLogs.push({
          alert_id: alert.id,
          contact_id: null,
          user_id: userId,
          notification_type: "SMS",
          recipient: to,
          status: "SIMULATED",
          provider_message_id: "SIM_SMS_" + Math.random().toString(36).substring(2, 9),
          error_message: "TEST MODE — simulated SMS submission.",
        });
        clientLogs.push({
          recipient: to,
          contactName,
          type: "SMS",
          status: "SIMULATED",
          errorMessage: "Simulated in test mode (no real SMS sent).",
        });
        return;
      }

      if (!smsConfigured) {
        dbLogs.push({
          alert_id: alert.id,
          contact_id: null,
          user_id: userId,
          notification_type: "SMS",
          recipient: to,
          status: "NOT_CONFIGURED",
          provider_message_id: null,
          error_message: "Twilio credentials not configured in server environment.",
        });
        clientLogs.push({
          recipient: to,
          contactName,
          type: "SMS",
          status: "NOT_CONFIGURED",
          errorMessage: "Twilio API credentials missing in .env.",
        });
        return;
      }

      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: to, From: twilioFrom!, Body: smsBody }).toString(),
          },
        );
        const json = (await res.json()) as { sid?: string; message?: string; status?: string };
        if (!res.ok) {
          const err = json.message || `HTTP ${res.status}`;
          dbLogs.push({
            alert_id: alert.id,
            contact_id: null,
            user_id: userId,
            notification_type: "SMS",
            recipient: to,
            status: "FAILED",
            provider_message_id: null,
            error_message: err,
          });
          clientLogs.push({
            recipient: to,
            contactName,
            type: "SMS",
            status: "FAILED",
            errorMessage: err,
          });
        } else {
          dbLogs.push({
            alert_id: alert.id,
            contact_id: null,
            user_id: userId,
            notification_type: "SMS",
            recipient: to,
            status: "SENT",
            provider_message_id: json.sid ?? null,
            error_message: null,
          });
          clientLogs.push({
            recipient: to,
            contactName,
            type: "SMS",
            status: "SENT",
            providerMessageId: json.sid,
            errorMessage: "Accepted by Twilio queue for delivery.",
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "SMS request network error";
        dbLogs.push({
          alert_id: alert.id,
          contact_id: null,
          user_id: userId,
          notification_type: "SMS",
          recipient: to,
          status: "FAILED",
          provider_message_id: null,
          error_message: msg,
        });
        clientLogs.push({
          recipient: to,
          contactName,
          type: "SMS",
          status: "FAILED",
          errorMessage: msg,
        });
      }
    }

    // 2. Automated Voice Call via Twilio Voice API
    async function sendTwilioVoiceCall(to: string, contactName: string): Promise<void> {
      const twimlVoice =
        `<Response>` +
        `<Say voice="alice" language="en-US">` +
        `This is an emergency alert from SafeVoice. Your trusted contact, ${who}, has activated SOS. Please check on them immediately.` +
        `</Say>` +
        `<Pause length="1"/>` +
        `<Say voice="alice" language="en-US">Repeating: emergency alert from SafeVoice. Check your text messages for live location.</Say>` +
        `</Response>`;

      if (demo) {
        dbLogs.push({
          alert_id: alert.id,
          contact_id: null,
          user_id: userId,
          notification_type: "VOICE_CALL",
          recipient: to,
          status: "SIMULATED",
          provider_message_id: "SIM_CALL_" + Math.random().toString(36).substring(2, 9),
          error_message: "TEST MODE — simulated automated call.",
        });
        clientLogs.push({
          recipient: to,
          contactName,
          type: "VOICE_CALL",
          status: "SIMULATED",
          errorMessage: "Simulated in test mode (no real call placed).",
        });
        return;
      }

      if (!voiceConfigured) {
        dbLogs.push({
          alert_id: alert.id,
          contact_id: null,
          user_id: userId,
          notification_type: "VOICE_CALL",
          recipient: to,
          status: "NOT_CONFIGURED",
          provider_message_id: null,
          error_message: "Twilio credentials not configured in server environment.",
        });
        clientLogs.push({
          recipient: to,
          contactName,
          type: "VOICE_CALL",
          status: "NOT_CONFIGURED",
          errorMessage: "Twilio voice credentials missing in .env.",
        });
        return;
      }

      try {
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              To: to,
              From: twilioFrom!,
              Twiml: twimlVoice,
            }).toString(),
          },
        );
        const json = (await res.json()) as { sid?: string; message?: string; status?: string };
        if (!res.ok) {
          const err = json.message || `HTTP ${res.status}`;
          dbLogs.push({
            alert_id: alert.id,
            contact_id: null,
            user_id: userId,
            notification_type: "VOICE_CALL",
            recipient: to,
            status: "FAILED",
            provider_message_id: null,
            error_message: err,
          });
          clientLogs.push({
            recipient: to,
            contactName,
            type: "VOICE_CALL",
            status: "FAILED",
            errorMessage: err,
          });
        } else {
          dbLogs.push({
            alert_id: alert.id,
            contact_id: null,
            user_id: userId,
            notification_type: "VOICE_CALL",
            recipient: to,
            status: "SENT",
            provider_message_id: json.sid ?? null,
            error_message: null,
          });
          clientLogs.push({
            recipient: to,
            contactName,
            type: "VOICE_CALL",
            status: "SENT",
            providerMessageId: json.sid,
            errorMessage: "Twilio Voice call initiated.",
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Voice call request network error";
        dbLogs.push({
          alert_id: alert.id,
          contact_id: null,
          user_id: userId,
          notification_type: "VOICE_CALL",
          recipient: to,
          status: "FAILED",
          provider_message_id: null,
          error_message: msg,
        });
        clientLogs.push({
          recipient: to,
          contactName,
          type: "VOICE_CALL",
          status: "FAILED",
          errorMessage: msg,
        });
      }
    }

    // 3. Process every contact (SMS + Voice call)
    for (const contact of contacts ?? []) {
      if (contact.phone) {
        // Send SMS
        await sendTwilioSms(contact.phone, contact.name);
        // Automated Voice Call
        await sendTwilioVoiceCall(contact.phone, contact.name);
      }
    }

    // Persist logs in database using admin client
    if (dbLogs.length > 0) {
      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("notification_logs").insert(dbLogs);
      } catch (logErr) {
        console.error("Failed to insert notification_logs", logErr);
      }
    }

    const sentCount = clientLogs.filter((l) => l.status === "SENT").length;
    const simCount = clientLogs.filter((l) => l.status === "SIMULATED").length;
    const failCount = clientLogs.filter((l) => l.status === "FAILED").length;
    const notConfiguredCount = clientLogs.filter((l) => l.status === "NOT_CONFIGURED").length;

    if (clientLogs.length === 0) {
      return {
        overall: "NO_CONTACTS",
        sent: 0,
        failed: 0,
        total: 0,
        message: "Alert logged. No emergency contacts found to notify.",
        trackingUrl,
        logs: [],
      };
    }

    if (simCount === clientLogs.length) {
      return {
        overall: "SIMULATED",
        sent: 0,
        failed: 0,
        total: clientLogs.length,
        message: `TEST MODE: Notifications simulated for ${contacts?.length || 0} contact(s). Real SMS/Calls require Twilio credentials.`,
        trackingUrl,
        logs: clientLogs,
      };
    }

    if (notConfiguredCount === clientLogs.length) {
      return {
        overall: "NOT_CONFIGURED",
        sent: 0,
        failed: 0,
        total: clientLogs.length,
        message: "Alert created in database. Twilio credentials not set in server .env.",
        trackingUrl,
        logs: clientLogs,
      };
    }

    if (sentCount === clientLogs.length) {
      return {
        overall: "SENT",
        sent: sentCount,
        failed: 0,
        total: clientLogs.length,
        message: `Success: ${sentCount} notification dispatch request(s) submitted to Twilio.`,
        trackingUrl,
        logs: clientLogs,
      };
    }

    return {
      overall: "PARTIAL",
      sent: sentCount,
      failed: failCount,
      total: clientLogs.length,
      message: `Partial dispatch: ${sentCount} succeeded, ${failCount} failed. Check log details.`,
      trackingUrl,
      logs: clientLogs,
    };
  });

/**
 * Public, secure Live Tracking Query:
 * Allows emergency contacts with the difficult-to-guess alert UUID to view real-time location.
 * Does not expose passwords, emails, or unrelated personal info.
 */
export const getLiveAlertTracking = createServerFn({ method: "GET" })
  .validator((alertId: string) => alertId)
  .handler(async ({ data: alertId }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch alert
    const { data: alert, error: alertErr } = await supabaseAdmin
      .from("alerts")
      .select("id, status, created_at, resolved_at, trigger_type, user_id")
      .eq("id", alertId)
      .maybeSingle();

    if (alertErr || !alert) {
      throw new Error("Invalid or expired tracking link.");
    }

    // Fetch caller's first name only
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("user_id", alert.user_id)
      .maybeSingle();

    const firstName = profile?.full_name?.split(" ")[0] || "SafeVoice User";

    // Fetch all recorded coordinates for this alert session
    const { data: locations, error: locErr } = await supabaseAdmin
      .from("alert_locations")
      .select("latitude, longitude, accuracy, created_at")
      .eq("alert_id", alertId)
      .order("created_at", { ascending: true });

    const latest = locations && locations.length > 0 ? locations[locations.length - 1] : null;

    return {
      alertId: alert.id,
      status: alert.status,
      triggerType: alert.trigger_type,
      startedAt: alert.created_at,
      resolvedAt: alert.resolved_at,
      userFirstName: firstName,
      latestLocation: latest,
      locations: locations || [],
    };
  });

/**
 * End Emergency Session:
 * Updates the alert to 'RESOLVED' and stops the active live-tracking session.
 */
export const endEmergencySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((alertId: string) => alertId)
  .handler(async ({ data: alertId, context }) => {
    const { supabase, userId } = context;

    const { data, error } = await supabase
      .from("alerts")
      .update({
        status: "RESOLVED",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", alertId)
      .eq("user_id", userId)
      .select("id, status, resolved_at")
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

export const notificationProviderStatus = createServerFn({ method: "GET" }).handler(async () => ({
  sms: Boolean(
    process.env["TWILIO_ACCOUNT_SID"] &&
      process.env["TWILIO_AUTH_TOKEN"] &&
      process.env["TWILIO_PHONE_NUMBER"],
  ),
  voice: Boolean(
    process.env["TWILIO_ACCOUNT_SID"] &&
      process.env["TWILIO_AUTH_TOKEN"] &&
      process.env["TWILIO_PHONE_NUMBER"],
  ),
  email: Boolean(process.env["RESEND_API_KEY"]),
}));
