import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getLiveAlertTracking } from '@/lib/notifications.functions';
import { googleMapsUrl } from '@/lib/geolocation';

type TrackSearch = {
  alertId?: string;
};

export const Route = createFileRoute('/track')({
  validateSearch: (search: Record<string, unknown>): TrackSearch => {
    return {
      alertId: typeof search.alertId === 'string' ? search.alertId : undefined,
    };
  },
  component: LiveTrackingPage,
  head: () => ({
    meta: [
      { title: 'Live Emergency Tracking — SafeVoice' },
      { name: 'description', content: 'Secure real-time GPS tracking for active emergency alert.' },
    ],
  }),
});

interface TrackingData {
  alertId: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
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

  const fetchTracking = async (isBackground = false) => {
    if (!alertId) {
      setError('No alert ID specified in tracking link.');
      setLoading(false);
      return;
    }

    if (!isBackground) setRefreshing(true);

    // Check for local demo alert session if in preview mode
    if (alertId.startsWith('demo-') && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`safevoice_demo_alert_${alertId}`);
      if (stored) {
        try {
          setData(JSON.parse(stored));
          setError(null);
          setLoading(false);
          setRefreshing(false);
          return;
        } catch (e) {
          console.warn(e);
        }
      }
    }

    try {
      const res = await getLiveAlertTracking({ data: alertId });
      setData(res as TrackingData);
      setError(null);
    } catch (err: unknown) {
      if (!isBackground) {
        setError(err instanceof Error ? err.message : 'Unable to load tracking session.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    // Poll for live updates every 5 seconds while active
    const interval = setInterval(() => {
      fetchTracking(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [alertId]);

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
          {error || 'This emergency session has expired or the link is invalid.'}
        </p>
        <Button asChild className="mt-6 bg-slate-800 hover:bg-slate-700 text-white rounded-xl">
          <Link to="/">Go to SafeVoice Home</Link>
        </Button>
      </div>
    );
  }

  const isResolved = data.status === 'RESOLVED';
  const latest = data.latestLocation;
  const mapsHref = latest ? googleMapsUrl(latest.latitude, latest.longitude) : '#';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between antialiased">
      {/* ── Top Header ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-900/90 backdrop-blur-xl px-4 py-3 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-rose-600 text-white shadow-lg shadow-rose-600/30">
            <ShieldAlert className="size-5" />
          </span>
          <div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight">SafeVoice Emergency Radar</h1>
            <p className="text-[11px] text-slate-400">Encrypted Live Tracking Session</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider flex items-center gap-1.5 ${
              isResolved
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
            }`}
          >
            <span className={`size-2 rounded-full ${isResolved ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            {isResolved ? 'RESOLVED' : 'LIVE SOS ACTIVE'}
          </span>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => fetchTracking(false)}
            disabled={refreshing}
            className="text-slate-400 hover:text-white"
            title="Refresh GPS location"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
          </Button>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Status Alert Banner */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
            isResolved
              ? 'bg-slate-900/80 border-white/10'
              : 'bg-rose-950/30 border-rose-500/30 shadow-lg shadow-rose-950/40'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`size-10 rounded-xl grid place-items-center shrink-0 ${
                isResolved
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-rose-600 text-white animate-pulse'
              }`}
            >
              {isResolved ? <CheckCircle2 className="size-5" /> : <Radio className="size-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {isResolved
                  ? 'Emergency Session Ended'
                  : `URGENT: ${data.userFirstName} has activated SOS Panic Alert`}
              </h2>
              <p className="text-xs text-slate-300/80 mt-0.5">
                {isResolved
                  ? `This emergency was marked resolved at ${new Date(data.resolvedAt || '').toLocaleTimeString()}.`
                  : 'Live GPS location is streaming in real-time below. Contact emergency services or reach out immediately.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {latest && (
              <Button asChild className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 shadow-md">
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
                : 'Searching satellite...'}
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
              <path d="M 0 100 Q 200 130 500 80 T 1000 120" stroke="#475569" strokeWidth="3" fill="none" />
              <path d="M 200 0 L 220 500" stroke="#475569" strokeWidth="2.5" fill="none" />
              <path d="M 0 240 L 1000 250" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 4" fill="none" />
            </svg>

            {/* Pulsing Beacon for User */}
            <div className="relative z-20 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute size-36 rounded-full bg-rose-500/15 animate-ping pointer-events-none"
                  style={{ animationDuration: '3s' }}
                />
                <div className="absolute size-24 rounded-full bg-rose-500/25 border border-rose-500/40 pointer-events-none" />
                <div className="size-7 rounded-full bg-rose-600 border-2 border-white shadow-[0_0_25px_#f43f5e] flex items-center justify-center">
                  <Radio className="size-4 text-white animate-pulse" />
                </div>
              </div>

              <div className="mt-4 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-white/20 text-xs shadow-2xl text-center backdrop-blur-md">
                <p className="font-bold text-white">{data.userFirstName}'s Current Location</p>
                <p className="text-[10px] text-slate-400">
                  {latest ? `Accuracy: ±${Math.round(latest.accuracy || 5)}m` : 'Connecting...'}
                </p>
              </div>
            </div>

            {/* Overlay stats at bottom left */}
            <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 rounded-xl bg-slate-900/90 border border-white/10 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md">
              <Clock className="size-3.5 text-slate-400" />
              <span>
                Started: {new Date(data.startedAt).toLocaleTimeString()} · {data.locations.length} GPS pings recorded
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
              {data.locations.slice().reverse().map((loc, idx) => (
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
