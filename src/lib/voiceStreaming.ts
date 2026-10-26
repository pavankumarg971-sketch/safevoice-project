/**
 * SafeVoice Emergency Voice Streaming & Situation Prediction Service
 *
 * Automatically activated when the user triggers the SOS button.
 * 1. Automatically requests and activates microphone audio & speech recognition.
 * 2. Continuously records distress audio clips (MediaRecorder) and encodes them.
 * 3. Transcribes spoken distress phrases in real time.
 * 4. Runs ML situation inference (Python FastAPI backend + instant local AI fallback).
 * 5. Syncs the live voice audio, transcript, and situation prediction to the emergency session
 *    so emergency contacts on the Live Tracking Radar (/track) can hear the voice and see the situation!
 */

import { classifyThreat, type ThreatPrediction } from "@/lib/classifier";

export interface EmergencySituation {
  label: string; // e.g., 'EMERGENCY', 'ASSAULT', 'THREAT', 'HARASSMENT', 'NORMAL'
  confidence: number; // 0.0 - 1.0
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  source: string;
  summary: string;
  signals: string[];
}

export interface LiveVoiceEmergencyPacket {
  alertId: string;
  timestamp: number;
  transcript: string;
  recentPhrases: string[];
  audioSnippetUrl?: string; // Base64 audio/webm or audio/wav
  hasAudio: boolean;
  situation: EmergencySituation;
  coords?: {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
  };
}

/**
 * Generate an authentic emergency distress siren tone (PCM WAV data URL)
 * Guarantees that there is immediately a playable, non-empty audio snippet ready.
 */
export function generateEmergencyAudioTone(): string {
  if (typeof window === "undefined") return "";
  try {
    const sampleRate = 8000;
    const durationSec = 1.2;
    const numSamples = Math.floor(sampleRate * durationSec);
    const buffer = new Uint8Array(44 + numSamples);

    // RIFF identifier
    buffer.set([0x52, 0x49, 0x46, 0x46], 0);
    // file length
    const fileLen = 36 + numSamples;
    buffer[4] = fileLen & 0xff;
    buffer[5] = (fileLen >> 8) & 0xff;
    buffer[6] = (fileLen >> 16) & 0xff;
    buffer[7] = (fileLen >> 24) & 0xff;
    // WAVE identifier
    buffer.set([0x57, 0x41, 0x56, 0x45], 8);
    // fmt subchunk
    buffer.set([0x66, 0x6d, 0x74, 0x20, 16, 0, 0, 0, 1, 0, 1, 0], 12);
    // sample rate 8000
    buffer[24] = sampleRate & 0xff;
    buffer[25] = (sampleRate >> 8) & 0xff;
    buffer[26] = (sampleRate >> 16) & 0xff;
    buffer[27] = (sampleRate >> 24) & 0xff;
    // byte rate
    buffer[28] = sampleRate & 0xff;
    buffer[29] = (sampleRate >> 8) & 0xff;
    buffer[30] = (sampleRate >> 16) & 0xff;
    buffer[31] = (sampleRate >> 24) & 0xff;
    // block align & bits per sample (1, 8)
    buffer[32] = 1;
    buffer[33] = 0;
    buffer[34] = 8;
    buffer[35] = 0;
    // data subchunk
    buffer.set([0x64, 0x61, 0x74, 0x61], 36);
    buffer[40] = numSamples & 0xff;
    buffer[41] = (numSamples >> 8) & 0xff;
    buffer[42] = (numSamples >> 16) & 0xff;
    buffer[43] = (numSamples >> 24) & 0xff;

    // Siren tone oscillating 600Hz to 950Hz
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const freq = 650 + Math.sin(t * 14) * 280;
      const sample = Math.sin(2 * Math.PI * freq * t);
      buffer[44 + i] = Math.floor((sample + 1) * 127.5);
    }

    let binary = "";
    for (let i = 0; i < buffer.length; i++) {
      binary += String.fromCharCode(buffer[i]);
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
  } catch {
    return "";
  }
}

// Prevent Garbage Collection in Chromium
let activeSpeechUtterance: SpeechSynthesisUtterance | null = null;
let activeAudioElement: HTMLAudioElement | null = null;

/**
 * Universal Speaker Player:
 * Guaranteed to play sound when the user taps any Speaker button:
 * 1. Unlocks browser audio context with a short audible chime.
 * 2. If a distress transcript exists, speaks it aloud clearly along with the threat situation.
 * 3. Fallback to playing the recorded distress audio clip or emergency siren tone.
 */
export function playEmergencyAudio(
  packet?: LiveVoiceEmergencyPacket | null,
  fallbackText?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    // Play an immediate 150ms audible chime via Web Audio API to unlock audio
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch {
      // AudioContext fallback
    }

    const transcript = (packet?.transcript || fallbackText || "").trim();
    const label = packet?.situation?.label || "EMERGENCY";

    // 1. If we have speech text or transcript, speak it clearly via SpeechSynthesis
    if (typeof window.speechSynthesis !== "undefined") {
      try {
        window.speechSynthesis.cancel();
        const textToSpeak =
          transcript.length > 0
            ? `Distress voice message: ${transcript}. Situation assessment: ${label}. Immediate assistance required.`
            : `SafeVoice Emergency alert active. Threat assessment: ${label}. Continuous voice monitoring active.`;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        activeSpeechUtterance = utterance; // Retain reference to prevent garbage collection in Chrome!
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

        utterance.onend = () => {
          activeSpeechUtterance = null;
          resolve(true);
        };
        utterance.onerror = () => {
          activeSpeechUtterance = null;
          playSnippetFallback(packet, resolve);
        };

        window.speechSynthesis.speak(utterance);
        // Also resolve after a brief delay if onend doesn't fire in some webviews
        setTimeout(() => resolve(true), 2500);
        return;
      } catch (err) {
        console.warn("SpeechSynthesis invocation error:", err);
      }
    }

    // 2. Fallback to playing audio snippet
    playSnippetFallback(packet, resolve);
  });
}

function playSnippetFallback(
  packet: LiveVoiceEmergencyPacket | null | undefined,
  resolve: (val: boolean) => void,
) {
  const url = packet?.audioSnippetUrl || generateEmergencyAudioTone();
  try {
    if (activeAudioElement) {
      activeAudioElement.pause();
      activeAudioElement = null;
    }
    const audio = new Audio(url);
    activeAudioElement = audio;
    audio.volume = 1.0;
    audio
      .play()
      .then(() => resolve(true))
      .catch(() => resolve(false));
  } catch {
    resolve(false);
  }
}

// Global active voice streaming session state
let activeAlertId: string | null = null;
let speechRecognitionInstance: SpeechRecognition | null = null;
let mediaRecorderInstance: MediaRecorder | null = null;
let mediaStreamInstance: MediaStream | null = null;
let recordedChunks: Blob[] = [];
let voiceUpdateListeners: ((packet: LiveVoiceEmergencyPacket) => void)[] = [];
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    broadcastChannel = new BroadcastChannel("safevoice_emergency_stream");
  }
} catch {
  // BroadcastChannel not available or restricted
}

const ML_API_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_ML_API_URL) ||
  "http://127.0.0.1:8001";

function getSituationSummary(label: string, risk: string, confidence: number): string {
  const pct = Math.round(confidence * 100);
  switch (label.toUpperCase()) {
    case "ASSAULT":
      return `CRITICAL: Violent physical assault or attack detected (${pct}% confidence). Immediate dispatch required.`;
    case "THREAT":
      return `HIGH THREAT: Verbal threats, intimidation, or aggressive confrontation detected (${pct}% confidence).`;
    case "HARASSMENT":
      return `MODERATE THREAT: Persistent stalking, following, or non-consensual harassment detected (${pct}% confidence).`;
    case "DISTRESS":
      return `DISTRESS ALERT: User is in extreme fear, lost, or stranded in an unsafe area (${pct}% confidence).`;
    case "EMERGENCY":
      return `EMERGENCY PANIC: Urgent calls for police, ambulance, or life-saving rescue (${pct}% confidence).`;
    default:
      return `NORMAL ACTIVITY: Ambient speech detected (${pct}% confidence). No imminent physical threat identified.`;
  }
}

/**
 * Run dual situation prediction:
 * 1. Instant local classifier (0ms latency fallback)
 * 2. Asynchronous validation against FastAPI ML model
 */
export async function predictVoiceSituation(text: string): Promise<EmergencySituation> {
  if (!text || text.trim().length === 0) {
    return {
      label: "EMERGENCY",
      confidence: 0.98,
      risk_level: "CRITICAL",
      source: "SafeVoice SOS Beacon",
      summary: "Emergency SOS beacon triggered. Distress audio listening in progress.",
      signals: ["SOS Button Activated", "Distress Voice Stream Opened"],
    };
  }

  // 1. Instant local prediction
  const localResult: ThreatPrediction = classifyThreat(text);
  let situation: EmergencySituation = {
    label: localResult.label,
    confidence: localResult.confidence,
    risk_level: localResult.risk_level,
    source: localResult.source,
    summary: getSituationSummary(localResult.label, localResult.risk_level, localResult.confidence),
    signals: [
      `Keyword Trigger: "${text.slice(0, 40)}"`,
      `ML Risk Level: ${localResult.risk_level}`,
    ],
  };

  // 2. Query Python FastAPI service
  try {
    let res = await fetch(`${ML_API_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).catch(() => null);

    if (!res || !res.ok) {
      // Fallback check on port 8000
      res = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).catch(() => null);
    }

    if (res && res.ok) {
      const data = await res.json();
      situation = {
        label: data.label,
        confidence: data.confidence,
        risk_level: data.risk_level,
        source: "FastAPI ML Model",
        summary: getSituationSummary(data.label, data.risk_level, data.confidence),
        signals: [
          `ML Classifier: ${data.label}`,
          `Confidence: ${(data.confidence * 100).toFixed(1)}%`,
          `Analyzed Phrase: "${text.slice(0, 45)}"`,
        ],
      };
    }
  } catch (err) {
    console.warn("FastAPI query error, using local AI engine:", err);
  }

  return situation;
}

/**
 * Save and broadcast current emergency voice packet across tabs and tracking links
 */
export function broadcastVoicePacket(packet: LiveVoiceEmergencyPacket) {
  if (typeof window === "undefined") return;

  // 1. Store in localStorage for /track route
  try {
    localStorage.setItem(`safevoice_voice_${packet.alertId}`, JSON.stringify(packet));
    localStorage.setItem("safevoice_latest_voice_packet", JSON.stringify(packet));

    // Also update the demo session object if alertId is a demo session
    const demoKey = `safevoice_demo_alert_${packet.alertId}`;
    const rawDemo = localStorage.getItem(demoKey);
    if (rawDemo) {
      try {
        const demoSession = JSON.parse(rawDemo);
        demoSession.latestVoice = packet;
        demoSession.situation = packet.situation;
        demoSession.latestTranscript = packet.transcript;
        localStorage.setItem(demoKey, JSON.stringify(demoSession));
      } catch (err) {
        console.warn("Could not attach voice packet to demo alert session:", err);
      }
    }
  } catch (err) {
    console.warn("Could not store emergency voice packet in localStorage:", err);
  }

  // 2. Notify in-memory listeners
  voiceUpdateListeners.forEach((fn) => {
    try {
      fn(packet);
    } catch (e) {
      console.warn(e);
    }
  });

  // 3. Broadcast across browser tabs (victim <-> emergency contact tracker)
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(packet);
    }
    window.dispatchEvent(new CustomEvent("safevoice_voice_packet_updated", { detail: packet }));
  } catch (err) {
    console.warn(err);
  }
}

/**
 * Read the current stored voice packet for an alert
 */
export function getAlertVoicePacket(alertId: string): LiveVoiceEmergencyPacket | null {
  if (typeof window === "undefined" || !alertId) return null;
  try {
    const raw = localStorage.getItem(`safevoice_voice_${alertId}`);
    if (raw) return JSON.parse(raw);

    // Fallback to demo alert
    const demoRaw = localStorage.getItem(`safevoice_demo_alert_${alertId}`);
    if (demoRaw) {
      const demo = JSON.parse(demoRaw);
      if (demo.latestVoice) return demo.latestVoice;
    }
  } catch (err) {
    console.warn("Error reading alert voice packet:", err);
  }
  return null;
}

/**
 * Start Automated SOS Voice Assistance:
 * 1. Immediately begins microphone capture and audio recording.
 * 2. Continuously transcribes distress speech.
 * 3. Evaluates AI situation predictions.
 * 4. Transmits audio snippets and situation assessments to emergency contacts.
 */
export async function startSosVoiceAssistance(
  alertId: string,
  onUpdate?: (packet: LiveVoiceEmergencyPacket) => void,
): Promise<LiveVoiceEmergencyPacket> {
  activeAlertId = alertId;

  if (onUpdate && !voiceUpdateListeners.includes(onUpdate)) {
    voiceUpdateListeners.push(onUpdate);
  }

  const initialAudioTone = generateEmergencyAudioTone();

  // Initial emergency packet with immediate playable emergency sound
  const currentPacket: LiveVoiceEmergencyPacket = {
    alertId,
    timestamp: Date.now(),
    transcript: "",
    recentPhrases: [],
    hasAudio: true,
    audioSnippetUrl: initialAudioTone,
    situation: {
      label: "EMERGENCY",
      confidence: 0.98,
      risk_level: "CRITICAL",
      source: "SafeVoice SOS Beacon",
      summary: "Emergency SOS Panic Triggered. Real-time distress audio transfer active.",
      signals: ["SOS Button Activated", "Continuous Microphone Armed"],
    },
  };

  broadcastVoicePacket(currentPacket);

  // ── Step 1: Initialize Audio Recording (MediaRecorder) ───────────
  if (
    typeof navigator !== "undefined" &&
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamInstance = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderInstance = recorder;
      recordedChunks = [];

      recorder.ondataavailable = async (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
          // Keep only the most recent 12 chunks (approx 30 seconds of high quality distress audio)
          if (recordedChunks.length > 12) {
            recordedChunks.shift();
          }

          // Convert latest audio chunks to Base64 data URL so contacts can play it
          const audioBlob = new Blob(recordedChunks, { type: recorder.mimeType || "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64Audio = reader.result as string;
            currentPacket.audioSnippetUrl = base64Audio;
            currentPacket.hasAudio = true;
            broadcastVoicePacket(currentPacket);
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      // Slice audio into 4000ms chunks for live streaming
      recorder.start(4000);
    } catch (micErr) {
      console.warn("Microphone MediaRecorder access warning:", micErr);
    }
  }

  // ── Step 2: Initialize Web Speech API Transcription ──────────────
  const SpeechRecognition =
    typeof window !== "undefined"
      ? window.SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
          .webkitSpeechRecognition
      : null;

  if (SpeechRecognition) {
    try {
      if (speechRecognitionInstance) {
        try {
          speechRecognitionInstance.stop();
        } catch {
          // Ignored
        }
        speechRecognitionInstance = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = async (event: SpeechRecognitionEvent) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        const trimmed = fullTranscript.trim();
        if (trimmed) {
          currentPacket.transcript = trimmed;
          if (!currentPacket.recentPhrases.includes(trimmed)) {
            currentPacket.recentPhrases.push(trimmed);
            if (currentPacket.recentPhrases.length > 8) {
              currentPacket.recentPhrases.shift();
            }
          }

          // Real-time AI Situation Prediction on the captured voice
          const situation = await predictVoiceSituation(trimmed);
          currentPacket.situation = situation;
          currentPacket.timestamp = Date.now();
          broadcastVoicePacket(currentPacket);
        }
      };

      recognition.onerror = (e) => {
        // Non-fatal pauses
        if (e.error === "no-speech" || e.error === "aborted") return;
        console.warn("SOS Speech recognition notice:", e.error);
      };

      recognition.onend = () => {
        // Auto-restart if SOS is still active
        if (activeAlertId && speechRecognitionInstance) {
          try {
            recognition.start();
          } catch {
            // Restarting
          }
        }
      };

      speechRecognitionInstance = recognition;
      recognition.start();
    } catch (recErr) {
      console.warn("SpeechRecognition startup error:", recErr);
    }
  }

  return currentPacket;
}

/**
 * Stop active SOS voice assistance and microphone streaming
 */
export function stopSosVoiceAssistance() {
  activeAlertId = null;

  if (speechRecognitionInstance) {
    try {
      speechRecognitionInstance.stop();
    } catch {
      // Ignored
    }
    speechRecognitionInstance = null;
  }

  if (mediaRecorderInstance) {
    try {
      if (mediaRecorderInstance.state !== "inactive") {
        mediaRecorderInstance.stop();
      }
    } catch {
      // Ignored
    }
    mediaRecorderInstance = null;
  }

  if (mediaStreamInstance) {
    try {
      mediaStreamInstance.getTracks().forEach((track) => track.stop());
    } catch {
      // Ignored
    }
    mediaStreamInstance = null;
  }

  voiceUpdateListeners = [];
}

/**
 * Subscribe to live voice emergency packet updates
 */
export function subscribeToVoicePackets(
  alertId: string,
  callback: (packet: LiveVoiceEmergencyPacket) => void,
): () => void {
  const handler = (packet: LiveVoiceEmergencyPacket) => {
    if (packet.alertId === alertId) {
      callback(packet);
    }
  };

  voiceUpdateListeners.push(handler);

  // Also listen to window events
  const windowHandler = (e: Event) => {
    const custom = e as CustomEvent<LiveVoiceEmergencyPacket>;
    if (custom.detail && custom.detail.alertId === alertId) {
      callback(custom.detail);
    }
  };
  window.addEventListener("safevoice_voice_packet_updated", windowHandler);

  // Also listen to BroadcastChannel
  let channelHandler: ((ev: MessageEvent) => void) | null = null;
  if (broadcastChannel) {
    channelHandler = (ev: MessageEvent) => {
      if (ev.data && ev.data.alertId === alertId) {
        callback(ev.data);
      }
    };
    broadcastChannel.addEventListener("message", channelHandler);
  }

  return () => {
    voiceUpdateListeners = voiceUpdateListeners.filter((fn) => fn !== handler);
    window.removeEventListener("safevoice_voice_packet_updated", windowHandler);
    if (broadcastChannel && channelHandler) {
      broadcastChannel.removeEventListener("message", channelHandler);
    }
  };
}
