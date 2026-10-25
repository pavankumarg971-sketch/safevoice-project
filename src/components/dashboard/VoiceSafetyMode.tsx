import { useState } from 'react';
import { Mic, MicOff, AlertCircle, Info, Volume2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

  const handleStart = () => {
    setHasTriggeredAlert(false);
    startListening(async (keywords) => {
      if (hasTriggeredAlert) return;
      setHasTriggeredAlert(true);

      if (!session) {
        toast.info('🎙️ Keywords detected in demo mode', {
          description: `Detected: "${keywords.join(', ')}". Sign in to trigger a real alert.`,
          duration: 8000,
        });
        return;
      }

      try {
        const { triggerEmergency } = await import('@/lib/emergency');
        const demo = profile?.demo_mode ?? false;
        const result = await triggerEmergency({ trigger: 'VOICE', demo });
        toast.error('🎙️ Voice Emergency Detected!', {
          description: `Keywords: "${keywords.join(', ')}". Alert #${result.alertId.slice(0, 8)} created.`,
          duration: 10000,
        });
      } catch {
        toast.error('Failed to create voice-triggered alert.');
      }
    });
  };

  return (
    <Card className="overflow-hidden border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Volume2 className="h-5 w-5 text-blue-400" />
          Hidden Voice Safety Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <div
            className={`h-3 w-3 rounded-full ${
              isListening ? 'bg-green-500 animate-pulse' : 'bg-white/20'
            }`}
          />
          <span className="text-sm font-medium text-white/80">
            {isListening ? 'Listening for distress keywords...' : 'Voice monitoring is off'}
          </span>
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          {!isListening ? (
            <Button
              id="voice-start-btn"
              onClick={handleStart}
              disabled={!isSupported}
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Mic className="h-4 w-4" />
              Start Listening
            </Button>
          ) : (
            <Button
              id="voice-stop-btn"
              onClick={stopListening}
              variant="destructive"
              className="flex-1 gap-2"
            >
              <MicOff className="h-4 w-4" />
              Stop Listening
            </Button>
          )}
        </div>

        {/* Live transcript */}
        {isListening && transcript && (
          <div className="rounded-lg bg-white/5 p-3 border border-white/10">
            <p className="text-xs font-medium text-white/50 mb-1">Live transcript:</p>
            <p className="text-sm text-white/90">{transcript}</p>
          </div>
        )}

        {/* Detected keywords */}
        {detectedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {detectedKeywords.map((kw) => (
              <Badge key={kw} variant="destructive" className="text-xs">
                ⚠ {kw}
              </Badge>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Browser support info */}
        <div className="flex items-start gap-2 rounded-lg bg-white/5 p-3 text-xs text-white/40">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            {browserInfo || 'Checking browser support...'} This feature only works while the
            browser tab is open and active. It cannot listen in the background or when the phone
            is locked.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
