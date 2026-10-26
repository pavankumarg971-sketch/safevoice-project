import { useEffect, useState } from "react";
import { Bell, Clock, CheckCircle, AlertTriangle, Mic } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type Alert = {
  id: string;
  trigger_type: "BUTTON" | "VOICE";
  status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
  demo: boolean;
  created_at: string;
};

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  } catch {
    return "Unknown";
  }
}

function getStatusBadge(status: Alert["status"]) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge variant="destructive" className="text-xs">
          Active
        </Badge>
      );
    case "ACKNOWLEDGED":
      return (
        <Badge
          variant="outline"
          className="text-xs border-yellow-500/30 text-yellow-300 bg-yellow-500/10"
        >
          Acknowledged
        </Badge>
      );
    case "RESOLVED":
      return (
        <Badge
          variant="outline"
          className="text-xs border-green-500/30 text-green-300 bg-green-500/10"
        >
          Resolved
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-xs">
          {status}
        </Badge>
      );
  }
}

export function RecentAlertsCard() {
  const { session, user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !user) {
      setLoading(false);
      setAlerts([]);
      return;
    }

    supabase
      .from("alerts")
      .select("id, trigger_type, status, demo, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setAlerts((data as Alert[]) ?? []);
        setLoading(false);
      });
  }, [session, user]);

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5 text-blue-400" />
          Recent Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-6 text-sm text-white/40">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-6">
            <Bell className="h-10 w-10 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-white/40">No recent alerts</p>
            <p className="text-xs text-white/20 mt-1">
              {session
                ? "Alerts will appear here when you trigger an SOS or voice detection."
                : "Sign in to see your alert history."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const isVoice = alert.trigger_type === "VOICE";
              const TriggerIcon = isVoice ? Mic : AlertTriangle;
              const triggerColor = isVoice ? "text-orange-400" : "text-red-400";
              const triggerLabel = isVoice ? "Voice Alert" : "SOS Alert";

              return (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 rounded-lg border border-white/10 p-3 hover:bg-white/5 transition-colors"
                >
                  <div className={`mt-0.5 ${triggerColor}`}>
                    <TriggerIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {triggerLabel}
                        {alert.demo && <span className="ml-1 text-xs text-yellow-400">(demo)</span>}
                      </span>
                      {getStatusBadge(alert.status)}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-white/30">
                      <Clock className="h-3 w-3" />
                      {formatTime(alert.created_at)}
                    </div>
                  </div>
                  {alert.status === "ACTIVE" && (
                    <CheckCircle className="h-4 w-4 text-white/20 shrink-0 mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
