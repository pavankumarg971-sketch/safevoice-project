import { useState, useRef } from 'react';
import { Loader2, Radio, ShieldAlert, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { triggerEmergency, type EmergencyResult } from '@/lib/emergency';

interface SOSButtonProps {
  onSosActivated?: (result: EmergencyResult) => void;
  isStreaming?: boolean;
  onEndSos?: () => void;
}

export function SOSButton({ onSosActivated, isStreaming, onEndSos }: SOSButtonProps) {
  const { session, profile } = useAuth();
  const [isTriggering, setIsTriggering] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [testMode, setTestMode] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState<EmergencyResult | null>(null);

  // Hold timer logic
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeSOS = async () => {
    if (isTriggering || cooldown) return;

    setIsTriggering(true);
    try {
      const demo = testMode || (profile?.demo_mode ?? false);
      const result = await triggerEmergency({ trigger: 'BUTTON', demo });

      setLastResult(result);
      if (onSosActivated) {
        onSosActivated(result);
      }

      if (demo) {
        toast.info('🚨 [TEST MODE] SOS Alert Activated!', {
          description: `Simulated alert for: ${result.recipientsSummary}. (Test Mode is ON — no real SMS sent).`,
          duration: 9000,
        });
      } else if (result.notification?.overall === 'NOT_CONFIGURED') {
        toast.warning('⚠️ Real SMS Gateway Not Configured', {
          description: `Twilio keys are missing in your .env file. Use the 'Send SMS via Phone App' button or add Twilio credentials to send real cellular SMS.`,
          duration: 12000,
        });
      } else {
        toast.error('🚨 REAL EMERGENCY SOS ACTIVATED!', {
          description: `Dispatched live SMS & Voice call to: ${result.recipientsSummary}. Live GPS tracking active.`,
          duration: 10000,
        });
      }

      setCooldown(true);
      setTimeout(() => setCooldown(false), 8000);
    } catch (err) {
      toast.error('SOS Activation Failed', {
        description: err instanceof Error ? err.message : 'Could not trigger emergency alert.',
      });
    } finally {
      setIsTriggering(false);
      setHoldProgress(0);
      setConfirmOpen(false);
    }
  };

  const handlePress = () => {
    if (cooldown || isTriggering) return;
    // If not in test mode, ask confirmation to prevent accidental real dispatch charges
    if (!testMode) {
      setConfirmOpen(true);
    } else {
      executeSOS();
    }
  };

  const startHold = () => {
    if (cooldown || isTriggering) return;
    setHoldProgress(10);
    let current = 10;
    holdTimerRef.current = setInterval(() => {
      current += 20;
      if (current >= 100) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        handlePress();
      } else {
        setHoldProgress(current);
      }
    }, 200);
  };

  const endHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdProgress < 100 && holdProgress > 0) {
      handlePress();
    }
    setHoldProgress(0);
  };

  return (
    <div className="flex flex-col items-center justify-center py-1">
      {/* Test / Real Mode Toggle */}
      <div className="mb-4 flex items-center justify-between w-full px-2 py-1.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs">
        <span className="text-slate-400 flex items-center gap-1.5 text-[11px]">
          <Sparkles className="size-3 text-amber-400" />
          Test Mode (Simulate SMS/Calls):
        </span>
        <button
          type="button"
          onClick={() => {
            const next = !testMode;
            setTestMode(next);
            toast.info(next ? 'Switched to Test / Simulation Mode.' : 'REAL EMERGENCY MODE: Real SMS & calls will be placed.');
          }}
          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase transition-colors ${
            testMode
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'bg-rose-600 text-white shadow-sm'
          }`}
        >
          {testMode ? 'ON (Safe)' : 'OFF (Live)'}
        </button>
      </div>

      {/* Outer Glow Halo */}
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-4 rounded-full bg-rose-600/20 blur-xl animate-pulse pointer-events-none" />
        <div className="absolute -inset-1 rounded-full bg-rose-600/30 blur-md pointer-events-none" />

        {/* Circular SOS Button */}
        <button
          id="panic-sos-button"
          onMouseDown={startHold}
          onMouseUp={endHold}
          onTouchStart={startHold}
          onTouchEnd={endHold}
          disabled={isTriggering || cooldown}
          aria-label="Activate Emergency SOS Panic Mode"
          className={`
            relative z-10 size-32 sm:size-36 rounded-full flex flex-col items-center justify-center
            bg-gradient-to-b from-rose-500 via-rose-600 to-red-800
            text-white font-black shadow-[0_0_50px_rgba(244,63,94,0.45)]
            transition-all duration-300 hover:scale-105 active:scale-95
            focus:outline-none cursor-pointer border-4 border-rose-400/40 select-none
            ${cooldown ? 'opacity-70 cursor-not-allowed' : ''}
          `}
        >
          {/* Progress Ring if holding */}
          {holdProgress > 0 && holdProgress < 100 && (
            <svg className="absolute inset-0 size-full -rotate-90 pointer-events-none">
              <circle
                cx="50%"
                cy="50%"
                r="45%"
                className="stroke-white/80"
                strokeWidth="6"
                strokeDasharray="280"
                strokeDashoffset={280 - (280 * holdProgress) / 100}
                fill="none"
              />
            </svg>
          )}

          {isTriggering ? (
            <div className="flex flex-col items-center gap-1">
              <Loader2 className="size-8 animate-spin text-white" />
              <span className="text-xs font-bold uppercase tracking-wider">ALERTING</span>
            </div>
          ) : isStreaming ? (
            <div className="flex flex-col items-center gap-1">
              <Radio className="size-6 text-white/90 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-300">STREAMING</span>
            </div>
          ) : cooldown ? (
            <div className="flex flex-col items-center gap-1">
              <CheckCircle2 className="size-6 text-white/90" />
              <span className="text-xs font-bold uppercase">SENT</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-wider drop-shadow-md">
                SOS
              </span>
            </div>
          )}
        </button>
      </div>

      <p className="mt-3 text-[11px] font-medium text-slate-400 text-center tracking-wide">
        {isStreaming
          ? 'Live GPS location broadcasting is active'
          : cooldown
            ? 'Broadcast active · 8s cooldown'
            : 'Hold for 1.5s or click to trigger'}
      </p>

      {/* End SOS Button if active */}
      {isStreaming && onEndSos && (
        <Button
          onClick={onEndSos}
          size="sm"
          className="mt-3 w-full bg-slate-800 hover:bg-slate-700 text-rose-400 border border-rose-500/30 text-xs font-bold py-2 rounded-xl"
        >
          End Active SOS Session
        </Button>
      )}

      {/* Confirmation Modal for Live Mode */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-rose-500/40 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="size-12 rounded-2xl bg-rose-600/20 border border-rose-500/40 text-rose-500 mx-auto grid place-items-center">
              <AlertTriangle className="size-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Confirm Real SOS Activation</h3>
              <p className="text-xs text-slate-300 mt-1">
                You are about to transmit a real emergency broadcast with your live GPS location, dispatching SMS alerts and automated voice calls to all trusted contacts.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                className="w-1/2 border-white/10 text-xs text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={executeSOS}
                className="w-1/2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/30"
              >
                Yes, Send SOS
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
