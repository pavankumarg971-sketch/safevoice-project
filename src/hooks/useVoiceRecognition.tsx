import { useState, useRef, useCallback, useEffect } from "react";

// Emergency keywords that trigger an alert
const EMERGENCY_KEYWORDS = [
  "help",
  "help me",
  "save me",
  "emergency",
  "danger",
  "police",
  "fire",
  "ambulance",
  "attack",
  "stop",
  "call 911",
  "call police",
  "someone help",
];

export interface VoiceRecognitionState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  detectedKeywords: string[];
  error: string | null;
  browserInfo: string;
}

/**
 * Hook for browser-based speech recognition (Web Speech API).
 *
 * IMPORTANT LIMITATIONS — read carefully:
 * 1. Only works in Chrome, Edge, and Safari (desktop). Firefox has limited support.
 * 2. Requires an active browser tab — does NOT work when the tab is minimized,
 *    the browser is closed, or the screen is locked.
 * 3. The user MUST explicitly grant microphone permission.
 * 4. This is a FOREGROUND-ONLY feature for demonstration and proof-of-concept.
 *    A production system would need a native mobile app with background audio access.
 */
export function useVoiceRecognition() {
  const [state, setState] = useState<VoiceRecognitionState>({
    isListening: false,
    isSupported: false,
    transcript: "",
    detectedKeywords: [],
    error: null,
    browserInfo: "",
  });

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onKeywordDetectedRef = useRef<((keywords: string[]) => void) | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    const isSupported = !!SpeechRecognition;
    let browserInfo = "";

    if (
      typeof window !== "undefined" &&
      !window.isSecureContext &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      browserInfo =
        "Notice: Chrome restricts microphone access on network IP addresses. Please access via http://localhost:8080";
    } else if (!isSupported) {
      browserInfo =
        "Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.";
    } else {
      browserInfo = "Speech recognition is available. Works while this browser tab is open.";
    }

    setState((prev) => ({ ...prev, isSupported, browserInfo }));
  }, []);

  const startListening = useCallback((onKeywordDetected?: (keywords: string[]) => void) => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition })
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setState((prev) => ({
        ...prev,
        error: "Speech recognition is not supported in this browser.",
      }));
      return;
    }

    if (onKeywordDetected) {
      onKeywordDetectedRef.current = onKeywordDetected;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setState((prev) => ({
          ...prev,
          isListening: true,
          error: null,
          transcript: "",
          detectedKeywords: [],
        }));
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }

        const lowerTranscript = fullTranscript.toLowerCase();
        const matched = EMERGENCY_KEYWORDS.filter((kw) => lowerTranscript.includes(kw));

        setState((prev) => ({
          ...prev,
          transcript: fullTranscript,
          detectedKeywords: matched,
        }));

        if (matched.length > 0 && onKeywordDetectedRef.current) {
          onKeywordDetectedRef.current(matched);
        }
      };

      recognition.onerror = (event) => {
        // 'no-speech' happens naturally during pauses; ignore and do not stop listening
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }

        let errorMsg = "Speech recognition error.";
        if (event.error === "not-allowed") {
          errorMsg =
            "Microphone access was denied. Please allow microphone permission in your browser URL bar (click the lock/tune icon) and reload.";
        } else if (event.error === "network") {
          errorMsg =
            "Network error. Chrome speech recognition requires an active internet connection.";
        } else {
          errorMsg = `Speech recognition error: ${event.error}`;
        }

        setState((prev) => ({ ...prev, error: errorMsg, isListening: false }));
      };

      recognition.onend = () => {
        // If still supposed to be listening, automatically restart
        if (recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // Might already be active or restarting
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: `Failed to start speech recognition: ${err instanceof Error ? err.message : String(err)}`,
      }));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null; // Prevent auto-restart in onend
      recognition.stop();
      setState((prev) => ({ ...prev, isListening: false }));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
  };
}
