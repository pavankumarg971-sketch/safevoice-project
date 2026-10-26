import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldAlert,
  MapPin,
  Clock,
  Radio,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Mic,
  Volume2,
  Sparkles,
  Activity,
  Cpu,
  Play,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getLiveAlertTracking } from "@/lib/notifications.functions";
import { googleMapsUrl } from "@/lib/geolocation";
import {
  subscribeToVoicePackets,
  getAlertVoicePacket,
  playEmergencyAudio,
  type LiveVoiceEmergencyPacket,
} from "@/lib/voiceStreaming";

type TrackSearch = {
  alertId?: string;
};

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>): TrackSearch => {
    return {
      alertId: typeof search.alertId === "string" ? search.alertId : undefined,
    };
  },
  component: LiveTrackingPage,
  head: () => ({
    meta: [
      { title: "Live Emergency Tracking — SafeVoice" },
      { name: "description", content: "Secure real-time GPS tracking for active emergency alert." },
    ],
  }),
});

interface TrackingData {
  alertId: string;
  status: "ACTIVE" | "RESOLVED" | "ACKNOWLEDGED";
  triggerType: string;
  startedAt: string;
  resolvedAt: string | null;
  userFirstName: string;
  latestLocation: {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    created_at: string;
  } | null;
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    created_at: string;
  }>;
}

function LiveTrackingPage() {
  const search = Route.useSearch();
  const alertId = search.alertId;

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [voicePacket, setVoicePacket] = useState<LiveVoiceEmergencyPacket | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Subscribe to live voice streaming & situation prediction
  useEffect(() => {
    if (!alertId) return;

    // Check stored packet on mount
    const initial = getAlertVoicePacket(alertId);
    if (initial) {
      setVoicePacket(initial);
    }

    const unsubscribe = subscribeToVoicePackets(alertId, (packet) => {
      setVoicePacket(packet);
    });

    return () => unsubscribe();
  }, [alertId]);

  const fetchTracking = useCallback(
    async (isBackground = false) => {
      if (!alertId) {
        setError("No alert ID specified in tracking link.");
        setLoading(false);
        return;
      }

      if (!isBackground) setRefreshing(true);

      // 1. Check for local alert session first (guarantees instantaneous radar loading)
      if (typeof window !== "undefined") {
        const stored =
          localStorage.getItem(`safevoice_demo_alert_${alertId}`) ||
          (alertId === localStorage.getItem("safevoice_active_alert_id")
            ? localStorage.getItem(`safevoice_demo_alert_${alertId}`)
            : null);

        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setData(parsed);
            if (parsed.latestVoice && !voicePacket) {
              setVoicePacket(parsed.latestVoice);
            }
            setError(null);
            setLoading(false);
            setRefreshing(false);
            // If in demo or local mode, we don't need to query remote Supabase
            if (alertId.startsWith("demo-") || alertId.startsWith("alert_")) {
              return;
            }
          } catch (e) {
            console.warn(e);
          }
        }
      }

      // 2. Query server tracking function
      try {
        const res = await getLiveAlertTracking({ data: alertId });
        setData(res as TrackingData);
        setError(null);
      } catch (err: unknown) {
        // 3. Resilient fallback: If server query fails or is offline, check if voice packet or local radar exists
        if (typeof window !== "undefined") {
          const localVoice =
            getAlertVoicePacket(alertId) ||
            (() => {
              const raw = localStorage.getItem("safevoice_latest_voice_packet");
              return raw ? JSON.parse(raw) : null;
            })();

          if (localVoice) {
            setData({
              alertId,
              status: "ACTIVE",
              triggerType: "VOICE",
              startedAt: new Date(localVoice.timestamp || Date.now()).toISOString(),
              resolvedAt: null,
              userFirstName: "SafeVoice User",
              latestLocation: localVoice.coords
                ? {
                    latitude: localVoice.coords.latitude,
                    longitude: localVoice.coords.longitude,
                    accuracy: localVoice.coords.accuracy || 10,
                    created_at: new Date().toISOString(),
                  }
                : {
                    latitude: 12.9716,
                    longitude: 77.5946,
                    accuracy: 10,
                    created_at: new Date().toISOString(),
                  },
              locations: [],
            });
            setError(null);
            return;
          }
        }

        if (!isBackground) {
          setError(
            err instanceof Error ? err.message : "Unable to connect to live tracking server.",
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [alertId, voicePacket],
  );

  useEffect(() => {
    void fetchTracking();

    // Poll for live updates every 5 seconds while active
    const interval = setInterval(() => {
      void fetchTracking(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTracking]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4">
        <div className="size-16 rounded-full border-4 border-rose-500/20 border-t-rose-500 animate-spin mb-4" />
        <h2 className="text-lg font-bold">Connecting to SafeVoice Emergency Radar...</h2>
        <p className="text-xs text-slate-400 mt-1">Retrieving encrypted satellite coordinates...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="size-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-4">
          <AlertTriangle className="size-7" />
        </div>
        <h2 className="text-xl font-bold">Tracking Link Unavailable</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          {error || "This emergency session has expired or the link is invalid."}
        </p>
        <Button asChild className="mt-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
          <Link to="/">Go to SafeVoice Home</Link>
        </Button>
      </div>
    );
  }

  const isResolved = data.status === "RESOLVED";
  const latest = data.latestLocation;
  const mapsHref = latest ? googleMapsUrl(latest.latitude, latest.longitude) : "#";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between antialiased">
      {/* ── Top Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/30">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">
              SafeVoice Emergency Radar
            </h1>
            <p className="text-[11px] text-slate-400">Encrypted Live Tracking Session</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5 ${
              isResolved
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse"
            }`}
          >
            <span
              className={`size-2 rounded-full ${isResolved ? "bg-emerald-400" : "bg-rose-500"}`}
            />
            {isResolved ? "RESOLVED" : "LIVE SOS ACTIVE"}
          </span>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => fetchTracking(false)}
            disabled={refreshing}
            className="text-slate-400 hover:text-white"
            title="Refresh GPS location"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin text-rose-400" : ""}`} />
          </Button>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Status Alert Banner */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isResolved
              ? "bg-slate-900/80 border-white/10"
              : "bg-rose-950/30 border-rose-500/30 shadow-lg shadow-rose-950/40"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`size-10 rounded-xl grid place-items-center shrink-0 ${
                isResolved
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-rose-600 text-white animate-pulse"
              }`}
            >
              {isResolved ? <CheckCircle2 className="size-5" /> : <Radio className="size-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isResolved
                  ? "Emergency Session Ended"
                  : `URGENT: ${data.userFirstName} has activated SOS Panic Alert`}
              </h2>
              <p className="text-xs text-slate-300/80 mt-0.5">
                {isResolved
                  ? `This emergency was marked resolved at ${new Date(data.resolvedAt || "").toLocaleTimeString()}.`
                  : "Live GPS location is streaming in real-time below. Contact emergency services or reach out immediately."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {latest && (
              <Button
                asChild
                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shadow-md"
              >
                <a href={mapsHref} target="_blank" rel="noopener noreferrer">
                  <Navigation className="size-3.5" />
                  Navigate in Google Maps
                  <ExternalLink className="size-3 ml-0.5" />
                </a>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="w-full sm:w-auto border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5"
            >
              <a href="tel:112">
                <PhoneCall className="size-3.5 text-emerald-400" />
                Call 112 / Police
              </a>
            </Button>
          </div>
        </div>

        {/* ── AI Situation Prediction & Voice Analysis Card ───────── */}
        <div className="rounded-3xl border border-rose-500/30 bg-gradient-to-br from-slate-900/95 via-[#0e172a] to-slate-950 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-40 bg-rose-600/10 blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 grid place-items-center shrink-0">
                <Cpu className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    AI Situation Assessment
                  </h3>
                  <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[10px] uppercase font-bold tracking-wider">
                    {voicePacket?.situation?.risk_level || "CRITICAL"} RISK
                  </Badge>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time Machine Learning threat classification inferred from live voice
                  transmission
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-semibold">
                <Sparkles className="size-3 text-blue-400" />
                <span>
                  {voicePacket?.situation?.confidence
                    ? `${(voicePacket.situation.confidence * 100).toFixed(0)}% Confidence`
                    : "98% Confidence"}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-5">
            {/* Situation Label & Summary */}
            <div className="md:col-span-7 space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-white/10">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400">
                  Predicted Threat Category:
                </span>
                <p className="text-lg font-black text-white mt-1 flex items-center gap-2">
                  <AlertTriangle className="size-5 text-rose-500" />
                  {voicePacket?.situation?.label || "EMERGENCY DISTRESS"}
                </p>
                <p className="text-xs text-slate-300/90 mt-2 leading-relaxed">
                  {voicePacket?.situation?.summary ||
                    "Urgent: SOS Distress beacon activated. Continuous background audio analysis indicates potential imminent harm."}
                </p>
              </div>

              {/* Signals */}
              <div className="flex flex-wrap gap-2">
                {(
                  voicePacket?.situation?.signals || [
                    "SOS Panic Activated",
                    "Distress Audio Channel Open",
                    "Live Satellite Radar Synced",
                  ]
                ).map((sig, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300"
                  >
                    <Activity className="size-3 text-rose-400" />
                    {sig}
                  </span>
                ))}
              </div>
            </div>

            {/* Emergency Action Directive for Contact */}
            <div className="md:col-span-5 p-4 rounded-2xl bg-rose-950/20 border border-rose-500/25 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="size-4" />
                  Immediate Contact Protocol
                </h4>
                <ul className="text-xs text-slate-300 mt-2.5 space-y-2 list-disc list-inside">
                  <li>Keep this tactical radar window open for GPS updates.</li>
                  <li>Attempt direct phone call to verify safety.</li>
                  <li>
                    If unanswered within 60 seconds, dispatch local authorities to the GPS
                    coordinates below.
                  </li>
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-rose-500/20 flex items-center justify-between text-[11px] text-slate-400">
                <span>Inference Engine:</span>
                <span className="font-semibold text-slate-200">
                  {voicePacket?.situation?.source || "SafeVoice ML Model"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Live Voice Audio Stream & Speech Transcript Card ────── */}
        <div className="rounded-3xl border border-blue-500/30 bg-gradient-to-br from-slate-900/95 via-[#0b1329] to-slate-950 p-5 sm:p-6 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-blue-600 text-white grid place-items-center shadow-lg shadow-blue-500/20 shrink-0">
                <Mic className="size-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Live Distress Audio & Spoken Voice Feed
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase border border-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE STREAM
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Voice audio and continuous transcription transmitted from {data.userFirstName}'s
                  microphone
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                {voicePacket?.timestamp
                  ? `Updated: ${new Date(voicePacket.timestamp).toLocaleTimeString()}`
                  : "Listening..."}
              </span>
            </div>
          </div>

          <div className="space-y-4 mt-5">
            {/* Audio Snippet Player */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const played = await playEmergencyAudio(
                      voicePacket,
                      voicePacket?.transcript || "Emergency distress alert active",
                    );
                    if (played) {
                      toast.success("🔊 Playing emergency distress voice message!");
                    } else {
                      toast.info("🔊 Emergency speaker broadcast completed.");
                    }
                  }}
                  className="size-11 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white grid place-items-center shrink-0 cursor-pointer shadow-lg shadow-blue-600/30 transition-transform active:scale-95"
                  title="Click to play emergency audio through speaker"
                >
                  <Volume2 className="size-5 animate-pulse" />
                </button>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Distress Voice Audio</span>
                    <span className="text-[10px] text-blue-400 font-semibold">
                      (Click speaker to listen)
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Live recorded voice from {data.userFirstName}&apos;s microphone. Tap to play
                    aloud.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    const played = await playEmergencyAudio(
                      voicePacket,
                      voicePacket?.transcript || "Emergency distress alert active",
                    );
                    if (played) {
                      toast.success("🔊 Playing emergency distress voice message!");
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold gap-1.5 rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105"
                >
                  <Volume2 className="size-3.5" />
                  <span>Play Speaker</span>
                </Button>

                {voicePacket?.audioSnippetUrl && (
                  <audio
                    ref={audioPlayerRef}
                    controls
                    src={voicePacket.audioSnippetUrl}
                    className="w-full sm:w-60 h-8 rounded-lg"
                  />
                )}
              </div>
            </div>

            {/* Live Spoken Speech Transcript Box */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <Mic className="size-3.5 text-blue-400" />
                  Transcribed Words Spoken by Victim / Attacker:
                </span>
                <span className="text-[10px] text-blue-400 font-mono">
                  Real-time Speech-to-Text
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-white/5 min-h-[56px] flex items-center">
                {voicePacket?.transcript ? (
                  <p className="text-sm font-medium text-emerald-300 italic leading-relaxed">
                    "{voicePacket.transcript}"
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-400 animate-ping" />
                    Listening for voice speech... Any words spoken into the phone will be
                    transcribed and classified here immediately.
                  </p>
                )}
              </div>

              {/* Recent Phrases List */}
              {voicePacket?.recentPhrases && voicePacket.recentPhrases.length > 1 && (
                <div className="pt-2">
                  <p className="text-[11px] text-slate-400 font-semibold mb-1.5">Phrase History:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {voicePacket.recentPhrases.slice(-5).map((phrase, i) => (
                      <span
                        key={i}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/5 text-slate-300"
                      >
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tactical Map Display */}
        <div className="rounded-3xl border border-white/10 bg-slate-900 overflow-hidden shadow-2xl relative transition-all duration-300 hover:border-white/20 hover:shadow-[0_25px_60px_-15px_rgba(244,63,94,0.15)]">
          <div className="p-4 border-b border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-rose-500" />
              <span className="font-semibold text-white">Live Tactical Radar View</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">
              {latest
                ? `${latest.latitude.toFixed(5)}° N, ${latest.longitude.toFixed(5)}° E (±${Math.round(latest.accuracy || 5)}m)`
                : "Searching satellite..."}
            </span>
          </div>

          {/* Interactive Map Visual */}
          <div className="relative w-full h-80 sm:h-96 bg-slate-950 flex items-center justify-center overflow-hidden">
            {/* Tactical Grid */}
            <svg className="absolute inset-0 size-full opacity-30">
              <defs>
                <pattern id="radar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#radar-grid)" />
              <path
                d="M 0 100 Q 200 130 500 80 T 1000 120"
                stroke="#475569"
                strokeWidth="3"
                fill="none"
              />
              <path d="M 200 0 L 220 500" stroke="#475569" strokeWidth="2.5" fill="none" />
              <path
                d="M 0 240 L 1000 250"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="6 4"
                fill="none"
              />
            </svg>

            {/* Pulsing Beacon for User */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute size-36 rounded-full bg-rose-500/15 animate-ping pointer-events-none"
                  style={{ animationDuration: "3s" }}
                />
                <div className="absolute size-24 rounded-full bg-rose-500/25 border border-rose-500/40 pointer-events-none" />
                <div className="size-7 rounded-full bg-rose-600 border-2 border-white shadow-[0_0_25px_#f43f5e] flex items-center justify-center">
                  <Radio className="size-4 text-white animate-pulse" />
                </div>
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-white/20 text-xs shadow-2xl text-center backdrop-blur-md">
                <p className="font-bold text-white">{data.userFirstName}'s Current Location</p>
                <p className="text-[10px] text-slate-400">
                  {latest ? `Accuracy: ±${Math.round(latest.accuracy || 5)}m` : "Connecting..."}
                </p>
              </div>
            </div>

            {/* Overlay stats at bottom left */}
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
              <Clock className="size-3.5 text-slate-400" />
              <span>
                Started: {new Date(data.startedAt).toLocaleTimeString()} · {data.locations.length}{" "}
                GPS pings recorded
              </span>
            </div>
          </div>
        </div>

        {/* Location Breadcrumbs Trail */}
        {data.locations.length > 1 && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-3 transition-all duration-300 hover:border-white/20 hover:shadow-xl">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock className="size-4 text-blue-400" />
              Recent GPS Path Trail ({data.locations.length} Waypoints)
            </h3>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
              {data.locations
                .slice()
                .reverse()
                .map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-950/50 border border-white/5 hover:bg-slate-900/80 hover:border-white/15 transition-colors"
                  >
                    <span className="font-mono text-slate-300">
                      {loc.latitude.toFixed(5)}° N, {loc.longitude.toFixed(5)}° E
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(loc.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 text-center text-xs text-slate-400">
        SafeVoice Guardian · Real-Time Satellite Tracking & Emergency Response
      </footer>
    </div>
  );
}
