import { useState, useEffect } from "react";
import {
  Mic,
  MicOff,
  AlertCircle,
  Info,
  Volume2,
  Cpu,
  Activity,
  Sparkles,
  Send,
  ShieldAlert,
  CheckCircle2,
  Radio,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { useAuth } from "@/hooks/useAuth";
import { classifyThreat, type ThreatPrediction } from "@/lib/classifier";
import {
  broadcastVoicePacket,
  playEmergencyAudio,
  type LiveVoiceEmergencyPacket,
} from "@/lib/voiceStreaming";
import { toast } from "sonner";

export function VoiceSafetyMode() {
  const {
    isListening,
    isSupported,
    transcript,
    detectedKeywords,
    error,
    browserInfo,
    startListening,
    stopListening,
  } = useVoiceRecognition();

  const { session, profile } = useAuth();
  const [hasTriggeredAlert, setHasTriggeredAlert] = useState(false);
  const [prediction, setPrediction] = useState<ThreatPrediction>({
    label: "NORMAL",
    confidence: 0.98,
    risk_level: "LOW",
    source: "Local AI Engine",
  });
  const [analyzingML, setAnalyzingML] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  const [testText, setTestText] = useState("");
  const [lastAnalyzedPhrase, setLastAnalyzedPhrase] = useState("");
  const [isSosVoiceActive, setIsSosVoiceActive] = useState(false);

  const mlUrl = import.meta.env.VITE_ML_API_URL || "http://127.0.0.1:8001";

  // Automatically start voice recognition on mount so user does not have to click anything
  useEffect(() => {
    try {
      handleStart();
    } catch {
      // Handled if browser blocks autoplay
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Synchronize with active SOS emergency voice assistant and ML updates
  useEffect(() => {
    const handleAutoSosVoice = (e: Event) => {
      setIsSosVoiceActive(true);
      setHasTriggeredAlert(true);
    };

    const handleVoicePacket = (e: Event) => {
      const custom = e as CustomEvent<LiveVoiceEmergencyPacket>;
      if (custom.detail) {
        const p = custom.detail;
        setIsSosVoiceActive(true);
        if (p.transcript) {
          setLastAnalyzedPhrase(p.transcript);
        }
        if (p.situation) {
          setPrediction({
            label: p.situation.label as ThreatPrediction["label"],
            confidence: p.situation.confidence,
            risk_level: p.situation.risk_level,
            source: (p.situation.source as ThreatPrediction["source"]) || "FastAPI Backend",
          });
        }
      }
    };

    window.addEventListener("safevoice_sos_activated", handleAutoSosVoice);
    window.addEventListener("safevoice_auto_start_sos_voice", handleAutoSosVoice);
    window.addEventListener("safevoice_voice_packet_updated", handleVoicePacket);

    return () => {
      window.removeEventListener("safevoice_sos_activated", handleAutoSosVoice);
      window.removeEventListener("safevoice_auto_start_sos_voice", handleAutoSosVoice);
      window.removeEventListener("safevoice_voice_packet_updated", handleVoicePacket);
    };
  }, []);

  // Check ML backend connection on mount
  useEffect(() => {
    fetch(`${mlUrl}/`)
      .then((res) => {
        if (res.ok) setBackendOnline(true);
        else setBackendOnline(false);
      })
      .catch(() => {
        // Fallback check to port 8000
        fetch("http://127.0.0.1:8000/")
          .then((res) => setBackendOnline(res.ok))
          .catch(() => setBackendOnline(false));
      });
  }, [mlUrl]);

  // Dual prediction runner: Fast client inference + Python FastAPI verification
  const runPrediction = async (textToPredict: string) => {
    if (!textToPredict || textToPredict.trim().length < 2) return;
    setAnalyzingML(true);
    setLastAnalyzedPhrase(textToPredict);

    // 1. Instant local AI prediction (0ms latency fallback)
    const localResult = classifyThreat(textToPredict);
    setPrediction(localResult);

    // 2. Query Python FastAPI service
    try {
      let res = await fetch(`${mlUrl}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToPredict }),
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch("http://127.0.0.1:8000/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textToPredict }),
        }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        setBackendOnline(true);
        const mlResult: ThreatPrediction = {
          label: data.label,
          confidence: data.confidence,
          risk_level: data.risk_level,
          source: "FastAPI Backend",
        };
        setPrediction(mlResult);

        // Update active emergency session so contacts get this prediction immediately
        const activeAlertId =
          typeof window !== "undefined" ? localStorage.getItem("safevoice_active_alert_id") : null;
        if (activeAlertId) {
          broadcastVoicePacket({
            alertId: activeAlertId,
            timestamp: Date.now(),
            transcript: textToPredict,
            recentPhrases: [textToPredict],
            hasAudio: false,
            situation: {
              label: data.label,
              confidence: data.confidence,
              risk_level: data.risk_level,
              source: "FastAPI Backend",
              summary: `${data.label} situation detected: ${textToPredict.slice(0, 50)}`,
              signals: [
                `ML Category: ${data.label}`,
                `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
              ],
            },
          });
        }

        // Trigger alert on high threat
        if ((data.risk_level === "CRITICAL" || data.risk_level === "HIGH") && !hasTriggeredAlert) {
          triggerVoiceAlert(data.label);
        }
      } else {
        setBackendOnline(false);
        if (
          (localResult.risk_level === "CRITICAL" || localResult.risk_level === "HIGH") &&
          !hasTriggeredAlert
        ) {
          triggerVoiceAlert(localResult.label);
        }
      }
    } catch {
      setBackendOnline(false);
      if (
        (localResult.risk_level === "CRITICAL" || localResult.risk_level === "HIGH") &&
        !hasTriggeredAlert
      ) {
        triggerVoiceAlert(localResult.label);
      }
    } finally {
      setAnalyzingML(false);
    }
  };

  const triggerVoiceAlert = async (category: string) => {
    if (hasTriggeredAlert) return;
    setHasTriggeredAlert(true);
    if (!session) {
      toast.error(`🎙️ AI Threat Detected (${category})!`, {
        description: "Simulated alert in guest mode. Sign in to notify real emergency contacts.",
        duration: 9000,
      });
      return;
    }
    try {
      const { triggerEmergency } = await import("@/lib/emergency");
      const demo = profile?.demo_mode ?? false;
      const result = await triggerEmergency({ trigger: "VOICE", demo });
      toast.error(`🎙️ Emergency SOS Broadcast Dispatched (${category})!`, {
        description: `Alert #${result.alertId.slice(0, 8)} created. Contacts & location shared.`,
        duration: 10000,
      });
    } catch {
      toast.error("Failed to create emergency alert.");
    }
  };

  // Live voice transcript triggers prediction automatically
  useEffect(() => {
    if (transcript && transcript.trim().length >= 2) {
      void runPrediction(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const handleStart = () => {
    setHasTriggeredAlert(false);
    startListening((keywords) => {
      triggerVoiceAlert(`Keywords: ${keywords.join(", ")}`);
    });
  };

  const handleQuickTest = (phrase: string) => {
    setTestText(phrase);
    void runPrediction(phrase);
  };

  return (
    <Card className="overflow-hidden border border-blue-500/30 bg-gradient-to-br from-slate-900/95 via-[#0b1329] to-slate-950 text-white shadow-2xl relative">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-80 h-40 bg-blue-500/10 blur-[80px] pointer-events-none" />

      <CardHeader className="pb-3 border-b border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2.5 text-base font-bold text-white">
            <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/25">
              <Mic className="size-4.5" />
            </div>
            <div>
              <span className="block text-sm sm:text-base">
                Voice Guardian & Real-Time AI Threat Detection
              </span>
              <span className="text-[11px] font-normal text-slate-400">
                Continuous speech intent analysis for hands-free emergency dispatch
              </span>
            </div>
          </CardTitle>

          {/* Engine Status */}
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                backendOnline === true
                  ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                  : "bg-indigo-400"
              }`}
            />
            <span className="text-xs font-mono font-medium text-slate-300">
              {backendOnline === true ? "Python ML: Connected" : "Local AI Engine Active"}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {/* Main Microphone Interaction Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10 shadow-inner">
          <div className="flex items-center gap-3.5">
            <div
              className={`size-4 rounded-full ${
                isListening || isSosVoiceActive ? "bg-emerald-500 animate-ping" : "bg-slate-600"
              }`}
            />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">
                  {isListening || isSosVoiceActive
                    ? "Voice Assistant Active — Listening & Predicting..."
                    : "Voice Assistant Standby"}
                </p>
                {(isListening || isSosVoiceActive) && (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] uppercase animate-pulse"
                  >
                    <Radio className="size-2.5 mr-1 animate-spin" />{" "}
                    {isSosVoiceActive ? "SOS Live Broadcast" : "Live Stream"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isListening || isSosVoiceActive
                  ? "Speak freely. Every phrase is analyzed by the Machine Learning model in real time."
                  : "Click the button or press SOS to start hands-free voice monitoring."}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {!isListening ? (
              <Button
                id="voice-start-btn"
                onClick={handleStart}
                disabled={!isSupported}
                className="w-full sm:w-auto justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer transition-all hover:scale-105"
              >
                <Mic className="size-4" />
                Start Voice Assistant
              </Button>
            ) : (
              <Button
                id="voice-stop-btn"
                onClick={stopListening}
                variant="destructive"
                className="w-full sm:w-auto justify-center gap-2 text-xs font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                <MicOff className="size-4" />
                Stop Listening
              </Button>
            )}
          </div>
        </div>

        {/* Live Transcript Display */}
        {(transcript || lastAnalyzedPhrase) && (
          <div className="rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/20 to-slate-900 border border-blue-500/30 p-4 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const phrase =
                      transcript || lastAnalyzedPhrase || "Voice safety monitoring active";
                    const played = await playEmergencyAudio(
                      {
                        alertId: "preview",
                        timestamp: Date.now(),
                        transcript: phrase,
                        recentPhrases: [phrase],
                        hasAudio: true,
                        situation: {
                          label: prediction.label,
                          confidence: prediction.confidence,
                          risk_level: prediction.risk_level,
                          source: prediction.source,
                          summary: `${prediction.label} threat detected`,
                          signals: [],
                        },
                      },
                      phrase,
                    );
                    if (played) {
                      toast.success("🔊 Playing transcript & situation aloud through speaker!");
                    } else {
                      toast.info("🔊 Speaker chime broadcasted.");
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-200 font-bold text-xs cursor-pointer transition-colors"
                  title="Click to play transcript aloud through speaker"
                >
                  <Volume2 className="size-3.5 text-blue-400 animate-pulse" />
                  <span>🔊 Speaker Audio</span>
                </button>
                <span className="font-bold text-blue-300">Live Audio Transcript:</span>
              </div>
              {analyzingML ? (
                <span className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold animate-pulse">
                  <Activity className="size-3.5 animate-spin" /> ML Computing...
                </span>
              ) : (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> Transcribed
                </span>
              )}
            </div>
            <p className="text-base font-semibold text-white tracking-wide">
              &ldquo;{transcript || lastAnalyzedPhrase}&rdquo;
            </p>
          </div>
        )}

        {/* ── REAL-TIME AI PREDICTION CARD (Always Visible) ───────── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/50 to-slate-950 border border-indigo-500/30 p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Cpu className="size-5 text-indigo-400" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Real-Time AI Threat Classification
                </h4>
                <p className="text-[11px] text-slate-400">
                  {lastAnalyzedPhrase
                    ? `Input: "${lastAnalyzedPhrase}"`
                    : "System monitoring voice audio & test queries"}
                </p>
              </div>
            </div>

            <Badge
              variant={
                prediction.risk_level === "CRITICAL" || prediction.risk_level === "HIGH"
                  ? "destructive"
                  : prediction.risk_level === "MEDIUM"
                    ? "outline"
                    : "secondary"
              }
              className="text-xs font-extrabold uppercase tracking-wider px-3 py-1 shadow-md"
            >
              {prediction.risk_level} RISK
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Category */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Predicted Category
              </span>
              <p className="text-base font-extrabold text-white font-mono mt-1">
                {prediction.label}
              </p>
            </div>

            {/* Confidence */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Model Confidence
              </span>
              <p className="text-base font-extrabold text-emerald-400 font-mono mt-1">
                {(prediction.confidence * 100).toFixed(1)}%
              </p>
            </div>

            {/* AI Engine */}
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Inference Engine
              </span>
              <p className="text-xs font-semibold text-indigo-300 font-mono mt-1 flex items-center gap-1">
                <Zap className="size-3 text-amber-400" />
                {prediction.source}
              </p>
            </div>
          </div>

          {(prediction.risk_level === "CRITICAL" || prediction.risk_level === "HIGH") && (
            <div className="flex items-start gap-2.5 text-xs text-rose-200 bg-rose-600/15 border border-rose-500/30 p-3 rounded-xl animate-in zoom-in-95">
              <ShieldAlert className="size-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <strong>Emergency Threat Action Triggered:</strong> This pattern matches an active
                crime or distress event. Emergency contacts and live GPS are automatically
                broadcast.
              </span>
            </div>
          )}
        </div>

        {/* Emergency Keywords Detected */}
        {detectedKeywords.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30">
            <span className="text-xs text-rose-300 font-bold mr-1">Detected Keywords:</span>
            {detectedKeywords.map((kw) => (
              <Badge key={kw} variant="destructive" className="text-xs font-bold px-2 py-0.5">
                ⚠ {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* ── Instant Test Phrases & Manual Input ────────────────── */}
        <div className="space-y-2.5 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-400" />
              Test Threat Classifier (Click any phrase to test):
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickTest("Someone is following me, help me please")}
              className="text-left px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-200 transition-all cursor-pointer font-medium hover:border-rose-500/40"
            >
              🚨 &ldquo;Someone is following me, help me please&rdquo;
            </button>
            <button
              onClick={() => handleQuickTest("Emergency call the police right now")}
              className="text-left px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-xs text-rose-200 transition-all cursor-pointer font-medium hover:border-rose-500/40"
            >
              🚨 &ldquo;Emergency call the police right now&rdquo;
            </button>
            <button
              onClick={() => handleQuickTest("Leave me alone, get away from me")}
              className="text-left px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs text-amber-200 transition-all cursor-pointer font-medium hover:border-amber-500/40"
            >
              ⚠️ &ldquo;Leave me alone, get away from me&rdquo;
            </button>
            <button
              onClick={() => handleQuickTest("I just arrived safely at the office, having coffee")}
              className="text-left px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs text-emerald-200 transition-all cursor-pointer font-medium hover:border-emerald-500/40"
            >
              ✅ &ldquo;I just arrived safely at the office, having coffee&rdquo;
            </button>
          </div>

          {/* Custom Text Tester */}
          <div className="flex gap-2 pt-1">
            <Input
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Or type any custom phrase to test AI classification..."
              className="bg-white/5 border-white/10 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl"
              onKeyDown={(e) => {
                if (e.key === "Enter") void runPrediction(testText);
              }}
            />
            <Button
              size="sm"
              onClick={() => void runPrediction(testText)}
              disabled={!testText.trim() || analyzingML}
              className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 rounded-xl font-bold cursor-pointer"
            >
              <Send className="size-3.5 mr-1.5" /> Analyze
            </Button>
          </div>
        </div>

        {/* Browser Permission or Origin Notice */}
        {browserInfo && (
          <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs text-slate-400 border border-white/5">
            <Info className="size-4 text-blue-400 mt-0.5 shrink-0" />
            <span>{browserInfo}</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-500/15 p-3 text-xs text-rose-300 border border-rose-500/30">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
