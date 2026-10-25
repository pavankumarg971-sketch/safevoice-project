import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestPayload {
  alertId: string;
  demo?: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_PHONE_NUMBER");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { alertId, demo }: RequestPayload = await req.json();
    if (!alertId) {
      return new Response(JSON.stringify({ error: "Missing alertId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch alert & contacts
    const [{ data: alert }, { data: contacts }, { data: profile }, { data: loc }] =
      await Promise.all([
        supabase.from("alerts").select("*").eq("id", alertId).single(),
        supabase.from("emergency_contacts").select("*").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase
          .from("alert_locations")
          .select("*")
          .eq("alert_id", alertId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const isDemo = Boolean(demo || alert?.demo);
    const who = profile?.full_name || "Your trusted contact";
    const mapUrl = loc ? `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}` : "Location unavailable";
    const timeStr = new Date().toLocaleTimeString();

    const smsMessage =
      `${isDemo ? "[DEMO] " : ""}EMERGENCY ALERT: Your trusted contact (${who}) may need urgent assistance.` +
      ` Last reported location: ${mapUrl}. Time: ${timeStr}.` +
      ` Please contact them and seek appropriate assistance.`;

    const twimlVoice =
      `<Response>` +
      `<Say voice="alice">This is an emergency alert from SafeVoice. Your trusted contact, ${who}, has activated SOS. Please check on them immediately.</Say>` +
      `</Response>`;

    const logs: Record<string, unknown>[] = [];

    for (const c of contacts || []) {
      if (!c.phone) continue;

      if (isDemo || !twilioSid || !twilioToken || !twilioFrom) {
        logs.push({
          alert_id: alertId,
          contact_id: c.id,
          user_id: user.id,
          notification_type: "SMS",
          recipient: c.phone,
          status: isDemo ? "SIMULATED" : "NOT_CONFIGURED",
          error_message: isDemo ? "Simulation mode" : "Twilio credentials not configured",
        });
        logs.push({
          alert_id: alertId,
          contact_id: c.id,
          user_id: user.id,
          notification_type: "VOICE_CALL",
          recipient: c.phone,
          status: isDemo ? "SIMULATED" : "NOT_CONFIGURED",
          error_message: isDemo ? "Simulation mode" : "Twilio credentials not configured",
        });
        continue;
      }

      // Send Real Twilio SMS
      try {
        const smsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: c.phone, From: twilioFrom, Body: smsMessage }).toString(),
          }
        );
        const smsData = await smsRes.json();
        logs.push({
          alert_id: alertId,
          contact_id: c.id,
          user_id: user.id,
          notification_type: "SMS",
          recipient: c.phone,
          status: smsRes.ok ? "SENT" : "FAILED",
          provider_message_id: smsData.sid ?? null,
          error_message: smsRes.ok ? null : smsData.message,
        });
      } catch (err: unknown) {
        logs.push({
          alert_id: alertId,
          contact_id: c.id,
          user_id: user.id,
          notification_type: "SMS",
          recipient: c.phone,
          status: "FAILED",
          error_message: err instanceof Error ? err.message : "SMS dispatch error",
        });
      }

      // Send Real Twilio Automated Voice Call
      try {
        const voiceRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({ To: c.phone, From: twilioFrom, Twiml: twimlVoice }).toString(),
          }
        );
        const voiceData = await voiceRes.json();
        logs.push({
          alert_id: alertId,
          contact_id: c.id,
          user_id: user.id,
          notification_type: "VOICE_CALL",
          recipient: c.phone,
          status: voiceRes.ok ? "SENT" : "FAILED",
          provider_message_id: voiceData.sid ?? null,
          error_message: voiceRes.ok ? null : voiceData.message,
        });
      } catch (err: unknown) {
        logs.push({
          alert_id: alertId,
          contact_id: c.id,
          user_id: user.id,
          notification_type: "VOICE_CALL",
          recipient: c.phone,
          status: "FAILED",
          error_message: err instanceof Error ? err.message : "Voice call dispatch error",
        });
      }
    }

    if (logs.length > 0) {
      await supabase.from("notification_logs").insert(logs);
    }

    return new Response(JSON.stringify({ success: true, count: logs.length, logs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
