import { useState, useEffect } from "react";
import { MapPin, Navigation, ExternalLink, RefreshCw, Radio } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getCurrentCoords, googleMapsUrl, type Coords } from "@/lib/geolocation";
import { toast } from "sonner";

export function LiveLocationTacticalCard() {
  const [sharing, setSharing] = useState(true);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("Just now");

  const fetchLocation = async () => {
    setLoading(true);
    try {
      const loc = await getCurrentCoords();
      setCoords(loc);
      setLastUpdated("Just now");
      toast.success("Live GPS coordinates updated");
    } catch {
      // Use fallback default coordinates (e.g. Bangalore / Tech hub demo)
      setCoords({
        latitude: 12.9716,
        longitude: 77.5946,
        accuracy: 8,
        timestamp: Date.now(),
      });
      setLastUpdated("Simulated GPS");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  const mapsUrl = coords ? googleMapsUrl(coords.latitude, coords.longitude) : "#";

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/70 backdrop-blur-xl p-5 flex flex-col justify-between shadow-xl transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-sky-500/35 hover:shadow-[0_20px_50px_rgba(56,189,248,0.18)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
            <Navigation className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              Live Location
            </h3>
            <p className="text-xs text-slate-400">
              {sharing ? "Sharing with 2 trusted contacts" : "Location sharing paused"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={sharing}
            onCheckedChange={(val) => {
              setSharing(val);
              toast.info(val ? "Live GPS broadcasting enabled" : "Location broadcasting paused");
            }}
          />
        </div>
      </div>

      {/* Dark Tactical Map Simulation Canvas */}
      <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
        {/* Map Grid and Street Lines SVG */}
        <svg className="absolute inset-0 size-full opacity-35" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="tactical-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tactical-grid)" />
          {/* Main roads */}
          <path
            d="M 0 50 Q 150 70 300 40 T 600 60"
            fill="none"
            stroke="#475569"
            strokeWidth="2.5"
          />
          <path d="M 120 0 L 140 200" fill="none" stroke="#475569" strokeWidth="2" />
          <path d="M 280 0 Q 250 100 320 200" fill="none" stroke="#475569" strokeWidth="2.5" />
          <path
            d="M 0 130 L 450 140"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />
        </svg>

        {/* Pulsing Radar Beacon Center */}
        <div className="relative z-10 flex items-center justify-center">
          <div
            className="absolute size-28 rounded-full bg-blue-500/10 animate-ping pointer-events-none"
            style={{ animationDuration: "3s" }}
          />
          <div className="absolute size-20 rounded-full bg-blue-500/20 border border-blue-400/40 pointer-events-none" />
          <div className="absolute size-10 rounded-full bg-blue-500/30 animate-pulse pointer-events-none" />
          <div className="size-5 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_15px_#38bdf8] flex items-center justify-center">
            <Radio className="size-3 text-white animate-spin" style={{ animationDuration: "4s" }} />
          </div>
        </div>

        {/* Bottom Status Overlay */}
        <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 rounded-md bg-slate-900/90 border border-white/10 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Updated {lastUpdated}</span>
        </div>

        {/* Quick External Map link */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-md bg-slate-900/90 border border-white/10 px-2 py-1 text-[11px] text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition-colors backdrop-blur-md"
        >
          <span>Open Maps</span>
          <ExternalLink className="size-3" />
        </a>
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span className="font-mono text-[11px] text-slate-300">
          {coords
            ? `${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E`
            : "Locating..."}
        </span>
        <button
          onClick={fetchLocation}
          disabled={loading}
          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 cursor-pointer"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh GPS</span>
        </button>
      </div>
    </div>
  );
}
