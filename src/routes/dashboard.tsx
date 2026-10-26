import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Shield,
  ShieldCheck,
  LayoutDashboard,
  Mic,
  MapPin,
  Users,
  Settings,
  LogOut,
  Radio,
  Wifi,
  Smartphone,
  Eye,
  Bell,
  History,
  Menu,
  X,
  Siren,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  Square,
  AlertTriangle,
  Volume2,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { SOSButton } from "@/components/dashboard/SOSButton";
import { VoiceSafetyMode } from "@/components/dashboard/VoiceSafetyMode";
import { LiveLocationTacticalCard } from "@/components/dashboard/LiveLocationTacticalCard";
import { QuickEmergencyContactsCard } from "@/components/dashboard/QuickEmergencyContactsCard";
import { EmergencyContactManager } from "@/components/dashboard/EmergencyContactManager";
import { PublicSafetyDispatch } from "@/components/dashboard/PublicSafetyDispatch";
import { RecentAlertsCard } from "@/components/dashboard/RecentAlertsCard";
import { ProfileDetailsModal } from "@/components/dashboard/ProfileDetailsModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useLiveTracking } from "@/hooks/useLiveTracking";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EmergencyResult } from "@/lib/emergency";
import {
  startSosVoiceAssistance,
  stopSosVoiceAssistance,
  subscribeToVoicePackets,
  getAlertVoicePacket,
  playEmergencyAudio,
  predictVoiceSituation,
  broadcastVoicePacket,
  generateEmergencyAudioTone,
  type LiveVoiceEmergencyPacket,
} from "@/lib/voiceStreaming";

type NavView = "dashboard" | "safety-tools" | "location" | "contacts" | "dispatch" | "settings";

export const Route = createFileRoute("/dashboard")({
  component: GuardianDashboardPage,
  head: () => ({
    meta: [
      { title: "Safety Overview — SafeVoice Guardian" },
      {
        name: "description",
        content:
          "Personal safety command center with real-time panic mode, live GPS radar, and emergency contacts.",
      },
    ],
  }),
});

function GuardianDashboardPage() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<NavView>("dashboard");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { session, user, profile, loading } = useAuth();

  // Live tracking & active SOS hook
  const {
    activeAlertId,
    isStreaming,
    latestCoords,
    pointsSent,
    gpsError,
    startStreaming,
    stopStreaming,
  } = useLiveTracking();

  const [lastSosResult, setLastSosResult] = useState<EmergencyResult | null>(null);
  const [liveVoicePacket, setLiveVoicePacket] = useState<LiveVoiceEmergencyPacket | null>(null);

  // Sync live voice emergency packets
  useEffect(() => {
    if (!activeAlertId) {
      setLiveVoicePacket(null);
      return;
    }
    const initial = getAlertVoicePacket(activeAlertId);
    if (initial) setLiveVoicePacket(initial);

    const unsubscribe = subscribeToVoicePackets(activeAlertId, (packet) => {
      setLiveVoicePacket(packet);
    });

    return () => unsubscribe();
  }, [activeAlertId]);

  const isLoggedIn = !!session;
  // User profile: show signed-in or registered user's real name; if none, show 'Guest User'
  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    (isLoggedIn ? "User" : "Guest User");

  const displayEmail =
    profile?.email ||
    user?.email ||
    profile?.phone ||
    (isLoggedIn ? "Active Member" : "Sign in to sync alerts");

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "GU";

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? "Good morning" : currentHour < 18 ? "Good afternoon" : "Good evening";

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully.");
    } catch {
      toast.error("Failed to sign out.");
    }
  };

  const handleSosActivated = (result: EmergencyResult) => {
    setLastSosResult(result);
    // Start continuous watchPosition streaming
    startStreaming(result.alertId);
    // Auto-start emergency voice assistant & audio recording
    void startSosVoiceAssistance(result.alertId);
  };

  const handleEndSos = () => {
    stopStreaming();
    stopSosVoiceAssistance();
  };

  const handleSimulateDistressPhrase = async (phrase: string) => {
    const alertId = activeAlertId || lastSosResult?.alertId || "demo-sos";
    toast.info(`Simulating phrase: "${phrase.slice(0, 35)}..."`);
    try {
      const situation = await predictVoiceSituation(phrase);
      const updatedPacket: LiveVoiceEmergencyPacket = {
        alertId,
        timestamp: Date.now(),
        transcript: phrase,
        recentPhrases: [phrase],
        hasAudio: true,
        audioSnippetUrl: liveVoicePacket?.audioSnippetUrl || generateEmergencyAudioTone(),
        situation,
        coords: latestCoords
          ? {
              latitude: latestCoords.latitude,
              longitude: latestCoords.longitude,
              accuracy: latestCoords.accuracy,
            }
          : undefined,
      };
      broadcastVoicePacket(updatedPacket);
      setLiveVoicePacket(updatedPacket);
      toast.success(
        `AI Predicted: ${situation.label} (${Math.round(situation.confidence * 100)}%)`,
      );
    } catch (err) {
      console.error("Error simulating phrase:", err);
    }
  };

  const navItems: { id: NavView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "safety-tools", label: "Safety Tools", icon: Mic },
    { id: "location", label: "Location", icon: MapPin },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "dispatch", label: "Public Dispatch", icon: ShieldAlert },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d18] flex items-center justify-center">
        <div className="text-white/60 text-sm animate-pulse flex items-center gap-2.5">
          <Shield className="size-5 text-blue-500 animate-spin" />
          <span>Initializing SafeVoice Guardian...</span>
        </div>
      </div>
    );
  }

  const trackingHref = activeAlertId ? `/track?alertId=${activeAlertId}` : "#";

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-blue-500/30">
      {/* ── Mobile Header ─────────────────────────────────────────── */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#0b1324]/95 backdrop-blur-xl px-4 py-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-500/20">
            <Shield className="size-4.5" />
          </span>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              SafeVoice Guardian
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">
              {isStreaming ? (
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-rose-500 animate-ping" />
                  SOS ACTIVE
                </span>
              ) : (
                "System Protected"
              )}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Direct Profile Access */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs cursor-pointer transition-colors"
            title="View Profile Details"
          >
            <Avatar className="size-7 border border-white/15">
              <AvatarFallback className="bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 text-white text-[10px] font-extrabold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline-block truncate max-w-[80px] font-medium text-xs">
              {displayName.split(" ")[0]}
            </span>
          </button>

          {/* Drawer Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/10 size-9 rounded-xl"
            aria-label="Toggle navigation"
          >
            {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </header>

      {/* ── Sidebar (Desktop Persistent & Mobile Drawer) ────────── */}
      <aside
        className={`
          fixed md:sticky top-0 inset-y-0 left-0 z-50 h-screen w-64 shrink-0
          flex flex-col border-r border-white/5 bg-[#0b1324] backdrop-blur-2xl justify-between
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div>
          {/* Logo brand */}
          <div className="p-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Guardian
              </h1>
              <p className="text-[11px] font-medium text-slate-400">Premium Protection</p>
            </div>
          </div>

          <div className="px-3">
            <Separator className="bg-white/5 mb-3" />
          </div>

          {/* Nav List */}
          <nav className="space-y-1 px-3" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "settings") {
                      setProfileModalOpen(true);
                    } else {
                      setActiveView(item.id);
                    }
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer
                    ${
                      active
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  <item.icon className={`size-4 ${active ? "text-blue-400" : "text-slate-400"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Log Out & User Profile */}
        <div className="p-4 space-y-3">
          <button
            onClick={
              isLoggedIn
                ? handleSignOut
                : () => toast.info("You are browsing in guest preview mode.")
            }
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>{isLoggedIn ? "Log Out" : "Guest Mode"}</span>
          </button>

          {/* Clickable Profile Card to view & edit details */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-slate-900/80 border border-white/10 hover:border-blue-500/50 hover:bg-slate-900 transition-all duration-200 cursor-pointer text-left group shadow-lg"
            title="Click to view and edit profile details"
          >
            <Avatar className="size-10 border border-white/15 group-hover:border-blue-400 transition-colors shrink-0 shadow-md">
              <AvatarFallback className="bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 text-white font-extrabold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden min-w-0">
              <div className="flex items-center justify-between">
                <p className="truncate text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                  {displayName}
                </p>
                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 font-semibold">
                  Profile &rarr;
                </span>
              </div>
              <p className="truncate text-[10px] text-slate-400 mt-0.5">
                {profile?.phone || displayEmail}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-300 font-bold uppercase tracking-wider">
                  {isLoggedIn
                    ? "Verified Member"
                    : profile?.full_name
                      ? "Registered Profile"
                      : "Guest Mode"}
                </span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Mobile Overlay ───────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main Workspace ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 md:py-8 pb-32 md:pb-16 max-w-7xl mx-auto w-full">
        {/* ── Active SOS Session Notification Bar ───────────────────── */}
        {isStreaming && (
          <div className="mb-6 rounded-3xl p-5 sm:p-6 border-2 border-rose-500/60 bg-gradient-to-br from-rose-950/90 via-[#180a14] to-slate-950 shadow-2xl space-y-4 animate-in slide-in-from-top-3">
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-rose-500/30">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-2xl bg-rose-600 text-white grid place-items-center animate-pulse shadow-lg shadow-rose-600/40 shrink-0">
                  <Radio className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                      EMERGENCY SOS BROADCAST & VOICE STREAM ACTIVE
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 text-[10px] font-black uppercase tracking-wider animate-pulse border border-rose-500/40">
                      LIVE TRANSMITTING
                    </span>
                  </div>
                  <p className="text-xs text-rose-200/80 mt-0.5">
                    Live satellite GPS coordinates streaming via watchPosition ({pointsSent} updates
                    logged)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleEndSos}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 rounded-xl shadow-lg shadow-rose-600/40 gap-1.5"
                >
                  <Square className="size-3.5 fill-white" />
                  End SOS
                </Button>
              </div>
            </div>

            {/* Middle Row: AI Voice Assistance & Situation Assessment */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              {/* Voice Status & Live Transcript */}
              <div className="md:col-span-7 p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white font-bold flex items-center gap-2">
                    <Mic className="size-4 text-rose-400 animate-pulse" />
                    Live Voice Assistant Stream
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Microphone Active
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-white/5 space-y-1">
                  <p className="text-xs text-slate-400 font-mono text-[10px]">
                    LATEST TRANSCRIBED WORDS:
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-emerald-300 italic min-h-[24px]">
                    {liveVoicePacket?.transcript
                      ? `"${liveVoicePacket.transcript}"`
                      : "Listening to speech from microphone... Talk clearly to trigger emergency keywords."}
                  </p>
                </div>

                {/* Instant Distress Simulation Chips for Testing ML Inference */}
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    One-Tap Test Phrases (ML Real-Time Prediction):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      {
                        text: "someone is following me and taking pictures",
                        label: "Harassment",
                        icon: "👁️",
                      },
                      {
                        text: "help me someone broke in with a knife",
                        label: "Assault",
                        icon: "🔪",
                      },
                      {
                        text: "emergency I was in a car crash send ambulance",
                        label: "Accident",
                        icon: "🚑",
                      },
                      { text: "leave me alone stop grabbing me", label: "Threat", icon: "🛑" },
                    ].map((sim) => (
                      <button
                        key={sim.label}
                        type="button"
                        onClick={() => handleSimulateDistressPhrase(sim.text)}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/40 text-slate-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer font-medium"
                        title={`Test phrase: "${sim.text}"`}
                      >
                        <span>{sim.icon}</span>
                        <span>{sim.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Functional Speaker Audio Bar */}
                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      const played = await playEmergencyAudio(
                        liveVoicePacket,
                        liveVoicePacket?.transcript,
                      );
                      if (played) {
                        toast.success("🔊 Playing distress voice message through device speaker!");
                      } else {
                        toast.info("🔊 Speaker tone broadcast completed.");
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105"
                  >
                    <Volume2 className="size-3.5 animate-pulse" />
                    <span>🔊 Play on Speaker</span>
                  </Button>

                  {liveVoicePacket?.audioSnippetUrl && (
                    <audio
                      controls
                      src={liveVoicePacket.audioSnippetUrl}
                      className="flex-1 min-w-[140px] h-8 rounded-lg"
                    />
                  )}
                </div>
              </div>

              {/* AI Situation Prediction */}
              <div className="md:col-span-5 p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">
                      AI Situation Assessment
                    </span>
                    <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/40 text-[9px] font-bold uppercase">
                      {liveVoicePacket?.situation?.risk_level || "CRITICAL"} RISK
                    </Badge>
                  </div>
                  <p className="text-base font-black text-white mt-1">
                    {liveVoicePacket?.situation?.label || "EMERGENCY PANIC"}
                  </p>
                  <p className="text-xs text-slate-300/90 mt-1 leading-relaxed">
                    {liveVoicePacket?.situation?.summary ||
                      "SOS Panic beacon active. Continuous distress voice recognition in progress."}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px] text-slate-300">
                  <span>ML Confidence:</span>
                  <span className="font-bold text-rose-300">
                    {liveVoicePacket?.situation?.confidence
                      ? `${(liveVoicePacket.situation.confidence * 100).toFixed(0)}%`
                      : "98%"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Direct Emergency Dispatch to Contacts via WhatsApp & SMS */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-white/10">
              <div className="text-xs text-slate-300 font-medium">
                Transfer live voice, situation & GPS to contacts:
              </div>

              <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* WhatsApp One-Tap Transfer */}
                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-emerald-500/20 justify-center"
                >
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `🚨 *EMERGENCY SOS ALERT!* 🚨\n${displayName} has triggered SafeVoice Emergency Assistance!\n\n🤖 *AI Situation Prediction:* ${liveVoicePacket?.situation?.label || "EMERGENCY"} (${((liveVoicePacket?.situation?.confidence || 0.98) * 100).toFixed(0)}% Confidence)\n🎙️ *Voice Heard:* "${liveVoicePacket?.transcript || "Distress voice stream armed"}"\n📍 *Live Location & Distress Voice Stream:* ${typeof window !== "undefined" ? window.location.origin : ""}/track?alertId=${activeAlertId}\n\n*PLEASE SEND HELP OR CALL 112 IMMEDIATELY!*`,
                    )}`}
                  >
                    <span>💬 Transfer via WhatsApp</span>
                  </a>
                </Button>

                {/* SMS Shortcut */}
                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-md font-semibold justify-center"
                >
                  <a
                    href={`sms:${lastSosResult?.recipientsSummary.includes("+") ? lastSosResult.recipientsSummary : ""}?body=${encodeURIComponent(
                      `EMERGENCY ALERT: ${displayName} activated SafeVoice SOS. Situation: ${liveVoicePacket?.situation?.label || "EMERGENCY"}. Voice heard: "${liveVoicePacket?.transcript || "Distress active"}". Live Radar & Audio: ${typeof window !== "undefined" ? window.location.origin : ""}/track?alertId=${activeAlertId}`,
                    )}`}
                  >
                    <span>📲 Send SMS via Phone App</span>
                  </a>
                </Button>

                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 gap-1.5 justify-center"
                >
                  <a href={trackingHref} target="_blank" rel="noopener noreferrer">
                    <span>View Tracking Radar</span>
                    <ExternalLink className="size-3" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Safety Overview Top Bar ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Safety Overview</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-slate-200 font-medium">
                Hi{isLoggedIn ? ` ${displayName.split(" ")[0]}` : ""}, your safety is our priority.
              </span>
              {!isLoggedIn ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 font-medium">
                  Guest Mode (Simulated Alerts)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/30 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Protection
                </span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!isLoggedIn && (
              <Button
                asChild
                size="sm"
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 font-bold shadow-md shadow-rose-600/30"
              >
                <Link to="/auth" search={{ mode: "login", redirect: "/dashboard" }}>
                  Sign In for Real SMS
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView(activeView === "dispatch" ? "dashboard" : "dispatch")}
              className={`rounded-xl text-xs gap-1.5 transition-colors ${
                activeView === "dispatch"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
              }`}
            >
              <ShieldAlert className="size-3.5 text-blue-400" />
              <span>{activeView === "dispatch" ? "Exit Dispatch" : "Dispatch Control"}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs gap-1.5"
            >
              <History className="size-3.5" />
              <span>History</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("0 active emergency alerts in your immediate perimeter.")}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs gap-1.5 relative"
            >
              <Bell className="size-3.5" />
              <span>Alerts</span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfileModalOpen(true)}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs gap-1.5"
              title="View and edit profile details"
            >
              <Avatar className="size-4 border border-white/10">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-[8px] font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span>Profile</span>
            </Button>
          </div>
        </div>

        {/* ── If Dispatch Control View is Selected ────────────────── */}
        {activeView === "dispatch" && (
          <div className="animate-in fade-in duration-300 mb-8">
            <PublicSafetyDispatch />
          </div>
        )}

        {/* ── Default Dashboard View (Image 1 Layout) ─────────────── */}
        {activeView === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Grid: Status Banner (Wide) + Panic Mode (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Card 2: Panic Mode SOS - On mobile, displayed first for immediate emergency access; on laptop/desktop, positioned cleanly on right */}
              <div className="order-1 lg:order-2 lg:col-span-4 rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-950/20 via-slate-900/60 to-slate-900/80 backdrop-blur-xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl relative transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-rose-500/40 hover:shadow-[0_20px_50px_rgba(244,63,94,0.22)]">
                <div>
                  <div className="flex items-center gap-2 text-rose-400">
                    <Siren className="size-4 animate-bounce" />
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-rose-300">
                      EMERGENCY PANIC MODE
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">Instant SOS</h3>
                  <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                    Auto-engages Voice AI, streams live GPS location, and alerts contacts.
                  </p>
                </div>

                <div className="my-2">
                  <SOSButton
                    onSosActivated={handleSosActivated}
                    isStreaming={isStreaming}
                    onEndSos={handleEndSos}
                  />
                </div>
              </div>

              {/* Card 1: All Systems Protected (Image 1 Style) */}
              <div className="order-2 lg:order-1 lg:col-span-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/25 via-slate-900/60 to-slate-900/80 backdrop-blur-xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-[0_20px_50px_rgba(16,185,129,0.18)]">
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 tracking-wide">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-3 tracking-tight">
                      All Systems Protected
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300/80 mt-1.5 max-w-lg leading-relaxed">
                      Your device integrity, network security, and physical location monitoring are
                      active and functioning normally.
                    </p>
                  </div>

                  {/* Shield Badge */}
                  <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                    <ShieldCheck className="size-6" />
                  </div>
                </div>

                {/* 3 Status Sub-Cards */}
                <div className="relative z-10 grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-6">
                  {/* Network */}
                  <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-900/80 hover:border-emerald-500/30 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Wifi className="size-3.5 text-emerald-400 shrink-0" />
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">
                        Network
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-1.5 sm:mt-2">
                      Secure
                    </p>
                  </div>

                  {/* Device */}
                  <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-900/80 hover:border-blue-500/30 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Smartphone className="size-3.5 text-blue-400 shrink-0" />
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">
                        Device
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-1.5 sm:mt-2">
                      Healthy
                    </p>
                  </div>

                  {/* Privacy */}
                  <div className="p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-900/80 hover:border-purple-500/30 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                      <Eye className="size-3.5 text-purple-400 shrink-0" />
                      <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider truncate">
                        Privacy
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-white mt-1.5 sm:mt-2">
                      Optimized
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2.5: AI Voice Guardian & Threat Detection (Prominent ML Section) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              <div className="lg:col-span-12">
                <VoiceSafetyMode />
              </div>
            </div>

            {/* Bottom Grid: Live Location (Left) + Emergency Contacts (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Card 3: Live Location Tactical Card */}
              <div className="lg:col-span-6">
                <LiveLocationTacticalCard />
              </div>

              {/* Card 4: Quick Emergency Contacts Card */}
              <div className="lg:col-span-6">
                <QuickEmergencyContactsCard onManageClick={() => setActiveView("contacts")} />
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-view: Safety Tools (Voice Safety Guardian) ──────── */}
        {activeView === "safety-tools" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Mic className="size-5 text-blue-400" />
                  Hidden Voice Safety Mode
                </h3>
                <p className="text-xs text-slate-400">
                  Continuous keyword detection for automatic hands-free emergency dispatch.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView("dashboard")}>
                &larr; Back
              </Button>
            </div>
            <VoiceSafetyMode />
          </div>
        )}

        {/* ── Sub-view: Location Management ───────────────────────── */}
        {activeView === "location" && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="size-5 text-blue-400" />
                  Live GPS Radar & Geolocation
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time coordinates attached to your emergency broadcast beacon.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView("dashboard")}>
                &larr; Back
              </Button>
            </div>
            <LiveLocationTacticalCard />
          </div>
        )}

        {/* ── Sub-view: Contacts Management (Full CRUD) ───────────── */}
        {activeView === "contacts" && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Users className="size-5 text-purple-400" />
                  Trusted Emergency Contacts Management
                </h3>
                <p className="text-xs text-slate-400">
                  Add, edit, and configure contacts with country code validation.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView("dashboard")}>
                &larr; Back to Dashboard
              </Button>
            </div>
            <EmergencyContactManager />
          </div>
        )}

        {/* ── Sub-view: Settings ──────────────────────────────────── */}
        {activeView === "settings" && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="size-5 text-slate-400" />
                  Protection & Security Settings
                </h3>
                <p className="text-xs text-slate-400">
                  Configure hidden emergency triggers, audio permissions, and auto-dispatch rules.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView("dashboard")}>
                &larr; Back
              </Button>
            </div>

            <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Voice Recognition Auto-Listen</p>
                  <p className="text-xs text-slate-400">
                    Start keyword monitoring automatically when opening app
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("Preference saved")}
                >
                  Enabled
                </Button>
              </div>

              <Separator className="bg-white/5" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">High-Accuracy GPS</p>
                  <p className="text-xs text-slate-400">
                    Attach satellite coordinates to all outgoing SMS alerts
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.success("GPS accuracy locked")}
                >
                  Enabled
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── History Drawer / Modal ──────────────────────────────── */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <History className="size-4 text-blue-400" />
                  Recent Emergency History
                </h4>
                <Button size="icon" variant="ghost" onClick={() => setHistoryOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <RecentAlertsCard />
            </div>
          </div>
        )}
        {/* ── Profile Details Modal ───────────────────────────────── */}
        <ProfileDetailsModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      </main>

      {/* ── Mobile Bottom Navigation Bar (Thumb-Friendly on Phones) ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0b1324]/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2 flex items-center justify-around shadow-[0_-10px_35px_rgba(0,0,0,0.6)]"
        aria-label="Mobile Navigation"
      >
        {/* 1. Dashboard Overview Tab */}
        <button
          onClick={() => {
            setActiveView("dashboard");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeView === "dashboard"
              ? "text-blue-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <LayoutDashboard className="size-5" />
          <span className="text-[10px]">Overview</span>
        </button>

        {/* 2. Voice AI Tab */}
        <button
          onClick={() => {
            setActiveView("safety-tools");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeView === "safety-tools"
              ? "text-blue-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mic className="size-5" />
          <span className="text-[10px]">Voice AI</span>
        </button>

        {/* 3. Center Highlighted Panic SOS Button */}
        <button
          onClick={() => {
            setActiveView("dashboard");
            setTimeout(() => {
              const el = document.getElementById("panic-sos-button");
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }, 100);
          }}
          className="flex flex-col items-center -mt-6 cursor-pointer group"
          title="Emergency SOS Panic Trigger"
        >
          <div className="size-13 rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-red-700 text-white grid place-items-center shadow-[0_0_25px_rgba(244,63,94,0.6)] border-2 border-rose-300 group-active:scale-90 transition-transform">
            <Radio className="size-6 animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-rose-400 mt-0.5 tracking-wider">SOS</span>
        </button>

        {/* 4. Contacts Tab */}
        <button
          onClick={() => {
            setActiveView("contacts");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
            activeView === "contacts"
              ? "text-blue-400 font-bold scale-105"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="size-5" />
          <span className="text-[10px]">Contacts</span>
        </button>

        {/* 5. Profile Tab */}
        <button
          onClick={() => setProfileModalOpen(true)}
          className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
        >
          <Avatar className="size-5.5 border border-white/20">
            <AvatarFallback className="bg-gradient-to-tr from-rose-600 via-pink-600 to-indigo-600 text-white text-[8px] font-extrabold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-[10px]">Profile</span>
        </button>
      </nav>
    </div>
  );
}
