import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  ShieldCheck,
  Home,
  Mic,
  Users,
  AlertCircle,
  Settings,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function NavBar() {
  const { profile, isAdmin, loading } = useAuth();

  const links = [
    { to: "/", label: "Home", icon: <Home className="size-4" /> },
    { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> },
    { to: "/track", label: "Track Live", icon: <ShieldCheck className="size-4" /> },
  ];

  return (
    <nav className="bg-slate-800 text-slate-100 border-b border-slate-700">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-5 text-rose-400" /> SafeVoice
        </Link>
        <div className="flex space-x-2">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeProps={{ className: "bg-slate-700 rounded" }}
              className="px-3 py-1 hover:bg-slate-700 rounded transition-colors"
            >
              <div className="flex items-center gap-1">
                {l.icon}
                <span className="text-sm">{l.label}</span>
              </div>
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/dashboard"
              activeProps={{ className: "bg-slate-700 rounded" }}
              className="px-3 py-1 hover:bg-slate-700 rounded transition-colors"
            >
              <div className="flex items-center gap-1">
                <ShieldCheck className="size-4 text-amber-400" />
                <span className="text-sm">Admin</span>
              </div>
            </Link>
          )}
          {/* Logout button */}
          {!loading && profile && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
              }}
              className="ml-2"
            >
              Logout
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
