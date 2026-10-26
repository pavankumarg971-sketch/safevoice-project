import { useState } from "react";
import {
  ShieldAlert,
  Radio,
  Clock,
  Car,
  Video,
  Layers,
  MapPin,
  Building,
  School,
  Building2,
  Cross,
  CheckCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AlertItem {
  id: string;
  title: string;
  time: string;
  units: string;
  status: "active" | "en_route" | "resolved";
  type: string;
  coords: { x: number; y: number };
}

const DISPATCH_ALERTS: AlertItem[] = [
  {
    id: "ALERT #1",
    title: "Lincoln Elementary School",
    time: "14:23:07",
    units: "2 units dispatched",
    status: "active",
    type: "School Zone",
    coords: { x: 35, y: 30 },
  },
  {
    id: "ALERT #2",
    title: "Mercy General Hospital",
    time: "14:21:40",
    units: "1 unit on scene",
    status: "en_route",
    type: "Hospital",
    coords: { x: 65, y: 38 },
  },
  {
    id: "ALERT #3",
    title: "Downtown Financial Branch",
    time: "14:18:12",
    units: "2 units dispatched",
    status: "active",
    type: "Bank",
    coords: { x: 50, y: 55 },
  },
  {
    id: "ALERT #4",
    title: "City Hall Civic Center",
    time: "14:15:05",
    units: "3 units standing by",
    status: "active",
    type: "Government Building",
    coords: { x: 62, y: 72 },
  },
];

export function PublicSafetyDispatch() {
  const [selectedAlert, setSelectedAlert] = useState<AlertItem>(DISPATCH_ALERTS[0]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "panic" | "facilities">("dashboard");
  const [cameraActive, setCameraActive] = useState(true);

  const handleDispatchUnit = () => {
    toast.success(`Additional emergency response unit dispatched to ${selectedAlert.title}!`);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950 text-white overflow-hidden shadow-2xl flex flex-col h-[750px]">
      {/* ── Control Room Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Public Safety Dispatch</h2>
            <p className="text-[11px] text-slate-400">Emergency Response Command Center</p>
          </div>
        </div>

        {/* Center Tabs */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("panic")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "panic" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Panic Alerts
          </button>
          <button
            onClick={() => setActiveTab("facilities")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === "facilities"
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Facilities
          </button>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>System Status: OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* ── Main Tactical Layout ─────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left Column: Panic Alert List */}
        <div className="md:col-span-3 border-r border-white/10 bg-slate-900/40 p-3 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold text-slate-300">
            <span>Panic Alert List</span>
            <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded">
              {DISPATCH_ALERTS.length} Active
            </span>
          </div>

          {DISPATCH_ALERTS.map((alert) => {
            const isSelected = selectedAlert.id === alert.id;
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                className={`
                  p-3 rounded-xl cursor-pointer transition-all border
                  ${
                    isSelected
                      ? "bg-rose-950/40 border-rose-500/50 shadow-md shadow-rose-950/50 scale-[1.01]"
                      : "bg-slate-900/50 border-white/5 hover:border-white/25 hover:bg-slate-900/80 hover:-translate-y-0.5 hover:shadow-md"
                  }
                `}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-rose-400">{alert.id}</span>
                  <span className="text-[10px] text-slate-400">{alert.time}</span>
                </div>
                <p className="text-xs font-medium text-white truncate">{alert.title}</p>
                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <span className="text-amber-400 font-medium">{alert.units}</span>
                  <span className="px-1.5 py-0.5 rounded bg-white/5 text-slate-300 font-mono">
                    {alert.type}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center: Live Dark Tactical Map */}
        <div className="md:col-span-6 relative bg-slate-950 overflow-hidden flex items-center justify-center">
          {/* Tactical Grid SVG Canvas */}
          <svg className="absolute inset-0 size-full opacity-40">
            <defs>
              <pattern id="dispatch-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dispatch-grid)" />
            {/* City Roads Map Overlay */}
            <path d="M 0 100 L 800 120" stroke="#334155" strokeWidth="4" />
            <path d="M 0 350 L 800 370" stroke="#334155" strokeWidth="3" />
            <path d="M 250 0 L 280 600" stroke="#334155" strokeWidth="4" />
            <path d="M 520 0 L 540 600" stroke="#334155" strokeWidth="3" />
            <path
              d="M 100 200 Q 300 150 700 250"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              opacity="0.6"
            />
          </svg>

          {/* Interactive Map Markers */}
          {DISPATCH_ALERTS.map((alert) => {
            const isSelected = selectedAlert.id === alert.id;
            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlert(alert)}
                style={{ top: `${alert.coords.y}%`, left: `${alert.coords.x}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
              >
                {/* Radar Rings */}
                <div
                  className={`absolute -inset-6 rounded-full animate-ping pointer-events-none opacity-40 ${
                    isSelected ? "bg-rose-500" : "bg-blue-500"
                  }`}
                  style={{ animationDuration: "2.5s" }}
                />
                <div
                  className={`size-10 rounded-full border-2 flex items-center justify-center shadow-lg transition-transform group-hover:scale-125 ${
                    isSelected
                      ? "bg-rose-600 border-white text-white shadow-rose-500/50"
                      : "bg-slate-900 border-rose-500 text-rose-400"
                  }`}
                >
                  <MapPin className="size-5" />
                </div>

                {/* Marker Callout Banner */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-1 rounded-md bg-slate-900/95 border border-white/20 text-[10px] text-white shadow-xl pointer-events-none">
                  <span className="font-bold text-rose-400">{alert.type}: </span>
                  {alert.title}
                </div>
              </div>
            );
          })}

          {/* Map Controls */}
          <div className="absolute top-4 left-4 z-30 flex flex-col gap-1 bg-slate-900/80 border border-white/10 rounded-lg p-1 backdrop-blur-md">
            <button className="size-7 rounded hover:bg-white/10 text-white flex items-center justify-center text-sm font-bold">
              +
            </button>
            <button className="size-7 rounded hover:bg-white/10 text-white flex items-center justify-center text-sm font-bold">
              -
            </button>
            <button className="size-7 rounded hover:bg-white/10 text-white flex items-center justify-center text-xs">
              <Layers className="size-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Timeline & Camera Preview */}
        <div className="md:col-span-3 border-l border-white/10 bg-slate-900/40 p-4 flex flex-col justify-between space-y-4 overflow-y-auto">
          {/* Response Timeline */}
          <div>
            <h3 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <Clock className="size-3.5 text-blue-400" />
              Response Timeline
            </h3>

            <div className="space-y-4 pl-2 border-l border-white/10 relative">
              <div className="relative pl-4">
                <span className="absolute -left-[17px] top-0.5 size-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                <p className="text-xs font-semibold text-white">Alert Received</p>
                <p className="text-[11px] text-slate-400">0 sec · Automated trigger</p>
              </div>

              <div className="relative pl-4">
                <span className="absolute -left-[17px] top-0.5 size-3 rounded-full bg-amber-500 ring-4 ring-amber-500/20" />
                <p className="text-xs font-semibold text-white">Units Notified</p>
                <p className="text-[11px] text-slate-400">4 sec · Police Patrol Sector 4</p>
              </div>

              <div className="relative pl-4">
                <span className="absolute -left-[17px] top-0.5 size-3 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
                <p className="text-xs font-semibold text-white">First Responder ETA</p>
                <p className="text-[11px] text-blue-300 font-bold">2 - 3 minutes</p>
              </div>
            </div>

            <Button
              onClick={handleDispatchUnit}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-xl gap-2 shadow-lg shadow-blue-600/20"
            >
              <Car className="size-4" />
              Dispatch Backup Unit
            </Button>
          </div>

          {/* Surveillance Camera Live Feed Simulation */}
          <div className="rounded-xl border border-white/10 bg-slate-950 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Video className="size-3.5 text-rose-400" />
                Surveillance Camera
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-[10px] font-bold text-white uppercase animate-pulse">
                LIVE
              </span>
            </div>

            {/* Simulated Camera Screen */}
            <div className="relative w-full h-28 rounded-lg overflow-hidden border border-white/10 bg-slate-900 flex items-center justify-center">
              <svg
                className="absolute inset-0 size-full opacity-30"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="100%" height="100%" fill="#0f172a" />
                <circle cx="50%" cy="50%" r="30" stroke="#38bdf8" strokeWidth="1" fill="none" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#38bdf8" strokeWidth="0.5" />
                <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#38bdf8" strokeWidth="0.5" />
              </svg>

              <div className="relative z-10 text-center">
                <Radio className="size-6 text-rose-400 mx-auto animate-pulse" />
                <p className="text-[10px] font-mono text-slate-300 mt-1">
                  CAM-04 · {selectedAlert.title}
                </p>
                <p className="text-[9px] font-mono text-emerald-400">FEED OK · 1080P 30FPS</p>
              </div>

              <div className="absolute bottom-1 right-2 font-mono text-[9px] text-white/60">
                14:23:45 UTC
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Auto-link nearby cameras</span>
              <Switch checked={cameraActive} onCheckedChange={setCameraActive} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
