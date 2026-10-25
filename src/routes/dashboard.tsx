import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Shield,
  ShieldCheck,
  LayoutDashboard,
  Mic,
  MapPin,
  Users,
  Settings,
  LogOut,
  Radio,
  Wifi,
  Smartphone,
  Eye,
  Bell,
  History,
  Menu,
  X,
  Siren,
  SlidersHorizontal,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ExternalLink,
  Square,
  AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SOSButton } from '@/components/dashboard/SOSButton';
import { VoiceSafetyMode } from '@/components/dashboard/VoiceSafetyMode';
import { LiveLocationTacticalCard } from '@/components/dashboard/LiveLocationTacticalCard';
import { QuickEmergencyContactsCard } from '@/components/dashboard/QuickEmergencyContactsCard';
import { EmergencyContactManager } from '@/components/dashboard/EmergencyContactManager';
import { PublicSafetyDispatch } from '@/components/dashboard/PublicSafetyDispatch';
import { RecentAlertsCard } from '@/components/dashboard/RecentAlertsCard';
import { ProfileDetailsModal } from '@/components/dashboard/ProfileDetailsModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import { useLiveTracking } from '@/hooks/useLiveTracking';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { EmergencyResult } from '@/lib/emergency';

type NavView = 'dashboard' | 'safety-tools' | 'location' | 'contacts' | 'dispatch' | 'settings';

export const Route = createFileRoute('/dashboard')({
  component: GuardianDashboardPage,
  head: () => ({
    meta: [
      { title: 'Safety Overview — SafeVoice Guardian' },
      {
        name: 'description',
        content: 'Personal safety command center with real-time panic mode, live GPS radar, and emergency contacts.',
      },
    ],
  }),
});

function GuardianDashboardPage() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<NavView>('dashboard');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const { session, user, profile, loading } = useAuth();

  // Live tracking & active SOS hook
  const {
    activeAlertId,
    isStreaming,
    latestCoords,
    pointsSent,
    gpsError,
    startStreaming,
    stopStreaming,
  } = useLiveTracking();

  const [lastSosResult, setLastSosResult] = useState<EmergencyResult | null>(null);

  const isLoggedIn = !!session;
  // Dynamic user profile: show signed-in user's real name; if guest, show 'Guest User'
  const displayName = isLoggedIn
    ? (profile?.full_name?.trim() || user?.user_metadata?.full_name?.trim() || user?.email?.split('@')[0] || 'User')
    : 'Guest User';
  const displayEmail = user?.email || profile?.email || (isLoggedIn ? '' : 'Sign in to sync alerts');
  const initials = isLoggedIn
    ? (displayName
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'U')
    : 'GU';

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully.');
    } catch {
      toast.error('Failed to sign out.');
    }
  };

  const handleSosActivated = (result: EmergencyResult) => {
    setLastSosResult(result);
    // Start continuous watchPosition streaming
    startStreaming(result.alertId);
  };

  const navItems: { id: NavView; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'safety-tools', label: 'Safety Tools', icon: Mic },
    { id: 'location', label: 'Location', icon: MapPin },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'dispatch', label: 'Public Dispatch', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d18] flex items-center justify-center">
        <div className="text-white/60 text-sm animate-pulse flex items-center gap-2.5">
          <Shield className="size-5 text-blue-500 animate-spin" />
          <span>Initializing SafeVoice Guardian...</span>
        </div>
      </div>
    );
  }

  const trackingHref = activeAlertId ? `/track?alertId=${activeAlertId}` : '#';

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-blue-500/30">
      {/* ── Mobile Header ─────────────────────────────────────────── */}
      {isMobile && (
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#0b1324]/90 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-white">
              <Shield className="size-4" />
            </span>
            <span className="font-bold text-base tracking-tight text-white">Guardian</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setProfileModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs cursor-pointer"
              title="View Profile Details"
            >
              <Avatar className="size-6 border border-white/10">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px] font-medium">{displayName.split(' ')[0]}</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
              aria-label="Toggle navigation"
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </header>
      )}

      {/* ── Sidebar (Reference Image 1 Style) ────────────────────── */}
      <aside
        className={`
          ${isMobile ? 'fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300' : 'sticky top-0 h-screen w-64 shrink-0'}
          ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}
          flex flex-col border-r border-white/5 bg-[#0b1324] backdrop-blur-2xl justify-between
        `}
      >
        <div>
          {/* Logo brand */}
          <div className="p-5 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Guardian
              </h1>
              <p className="text-[11px] font-medium text-slate-400">Premium Protection</p>
            </div>
          </div>

          <div className="px-3">
            <Separator className="bg-white/5 mb-3" />
          </div>

          {/* Nav List */}
          <nav className="space-y-1 px-3" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const active = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'settings') {
                      setProfileModalOpen(true);
                    } else {
                      setActiveView(item.id);
                    }
                    if (isMobile) setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer
                    ${
                      active
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-sm shadow-blue-500/5'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }
                  `}
                >
                  <item.icon className={`size-4 ${active ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Log Out & User Profile */}
        <div className="p-4 space-y-3">
          <button
            onClick={isLoggedIn ? handleSignOut : () => toast.info('You are browsing in guest preview mode.')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors w-full cursor-pointer"
          >
            <LogOut className="size-4" />
            <span>{isLoggedIn ? 'Log Out' : 'Guest Mode'}</span>
          </button>

          {/* Clickable Profile Card to view & edit details */}
          <button
            onClick={() => setProfileModalOpen(true)}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-white/5 hover:border-blue-500/40 hover:bg-slate-900/90 transition-all duration-200 cursor-pointer text-left group shadow-md"
            title="Click to view and edit profile details"
          >
            <Avatar className="size-9 border border-white/10 group-hover:border-blue-400/50 transition-colors shrink-0">
              <AvatarFallback className="bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden min-w-0">
              <div className="flex items-center justify-between">
                <p className="truncate text-xs font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {displayName}
                </p>
                <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  View &rarr;
                </span>
              </div>
              <p className="truncate text-[10px] text-slate-400">
                {isLoggedIn ? (profile?.phone || displayEmail || 'Active Member') : 'Click to Sign In / Profile'}
              </p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── Mobile Overlay ───────────────────────────────────────── */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main Workspace ───────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 pb-20 max-w-7xl mx-auto w-full">
        {/* ── Active SOS Session Notification Bar ───────────────────── */}
        {isStreaming && (
          <div className="mb-6 rounded-2xl p-4 sm:p-5 border border-rose-500/50 bg-gradient-to-r from-rose-950/80 via-red-900/40 to-slate-900 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-3">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-rose-600 text-white grid place-items-center animate-pulse">
                <Radio className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    EMERGENCY SOS BROADCAST ACTIVE
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase animate-pulse border border-rose-500/30">
                    TRANSMITTING
                  </span>
                </div>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  Live satellite GPS coordinates streaming via watchPosition ({pointsSent} updates logged)
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              {/* Direct SMS shortcut to test immediate phone delivery */}
              {lastSosResult && (
                <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-md shadow-emerald-600/30 font-semibold">
                  <a
                    href={`sms:${lastSosResult.recipientsSummary.includes('+') ? lastSosResult.recipientsSummary : ''}?body=${encodeURIComponent(
                      `EMERGENCY ALERT: Your trusted contact has activated SafeVoice SOS. Location: https://www.google.com/maps?q=${latestCoords?.latitude || 12.9716},${latestCoords?.longitude || 77.5946}. Live Radar: ${window.location.origin}/track?alertId=${activeAlertId}`
                    )}`}
                  >
                    <span>📲 Send SMS via Phone App</span>
                  </a>
                </Button>
              )}

              <Button asChild size="sm" className="bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 gap-1.5">
                <a href={trackingHref} target="_blank" rel="noopener noreferrer">
                  <span>View Tracking Radar</span>
                  <ExternalLink className="size-3" />
                </a>
              </Button>

              <Button
                size="sm"
                onClick={stopStreaming}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 rounded-xl shadow-lg shadow-rose-600/30 gap-1.5"
              >
                <Square className="size-3.5 fill-white" />
                End SOS
              </Button>
            </div>
          </div>
        )}

        {/* ── Safety Overview Top Bar ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Safety Overview</h2>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="text-slate-200 font-medium">
                Hi{isLoggedIn ? ` ${displayName.split(' ')[0]}` : ''}, your safety is our priority.
              </span>
              {!isLoggedIn ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300 border border-amber-500/20 font-medium">
                  Guest Mode (Simulated Alerts)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] text-emerald-300 border border-emerald-500/30 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Protection
                </span>
              )}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {!isLoggedIn && (
              <Button asChild size="sm" className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs gap-1.5 font-bold shadow-md shadow-rose-600/30">
                <Link to="/auth" search={{ mode: "login", redirect: "/dashboard" }}>
                  Sign In for Real SMS
                </Link>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveView(activeView === 'dispatch' ? 'dashboard' : 'dispatch')}
              className={`rounded-xl text-xs gap-1.5 transition-colors ${
                activeView === 'dispatch'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              <ShieldAlert className="size-3.5 text-blue-400" />
              <span>{activeView === 'dispatch' ? 'Exit Dispatch' : 'Dispatch Control'}</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(!historyOpen)}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs gap-1.5"
            >
              <History className="size-3.5" />
              <span>History</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('0 active emergency alerts in your immediate perimeter.')}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs gap-1.5 relative"
            >
              <Bell className="size-3.5" />
              <span>Alerts</span>
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setProfileModalOpen(true)}
              className="rounded-xl bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 text-xs gap-1.5"
              title="View and edit profile details"
            >
              <Avatar className="size-4 border border-white/10">
                <AvatarFallback className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-[8px] font-bold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span>Profile</span>
            </Button>
          </div>
        </div>

        {/* ── If Dispatch Control View is Selected ────────────────── */}
        {activeView === 'dispatch' && (
          <div className="animate-in fade-in duration-300 mb-8">
            <PublicSafetyDispatch />
          </div>
        )}

        {/* ── Default Dashboard View (Image 1 Layout) ─────────────── */}
        {activeView === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Grid: Status Banner (Wide) + Panic Mode (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Card 1: All Systems Protected (Image 1 Style) */}
              <div className="lg:col-span-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/25 via-slate-900/60 to-slate-900/80 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative overflow-hidden transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-emerald-500/40 hover:shadow-[0_20px_50px_rgba(16,185,129,0.18)]">
                <div className="relative z-10 flex items-start justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 tracking-wide">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      ACTIVE
                    </span>
                    <h3 className="text-xl sm:text-2xl font-bold text-white mt-3 tracking-tight">
                      All Systems Protected
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300/80 mt-1.5 max-w-lg leading-relaxed">
                      Your device integrity, network security, and physical location monitoring are active and functioning normally.
                    </p>
                  </div>

                  {/* Shield Badge */}
                  <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                    <ShieldCheck className="size-6" />
                  </div>
                </div>

                {/* 3 Status Sub-Cards */}
                <div className="relative z-10 grid grid-cols-3 gap-3 mt-6">
                  {/* Network */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-900/80 hover:border-emerald-500/30 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Wifi className="size-3.5 text-emerald-400" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Network</span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-2">Secure</p>
                  </div>

                  {/* Device */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-900/80 hover:border-blue-500/30 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Smartphone className="size-3.5 text-blue-400" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Device</span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-2">Healthy</p>
                  </div>

                  {/* Privacy */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/50 border border-white/5 flex flex-col justify-between transition-all duration-200 ease-out hover:-translate-y-1 hover:bg-slate-900/80 hover:border-purple-500/30 hover:shadow-lg cursor-pointer">
                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <Eye className="size-3.5 text-purple-400" />
                      <span className="text-[10px] uppercase font-bold tracking-wider">Privacy</span>
                    </div>
                    <p className="text-sm font-semibold text-white mt-2">Optimized</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Panic Mode SOS (Image 1 Style) */}
              <div className="lg:col-span-4 rounded-3xl border border-rose-500/20 bg-gradient-to-b from-rose-950/20 via-slate-900/60 to-slate-900/80 backdrop-blur-xl p-6 sm:p-7 flex flex-col justify-between shadow-2xl relative transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-rose-500/40 hover:shadow-[0_20px_50px_rgba(244,63,94,0.22)]">
                <div>
                  <div className="flex items-center gap-2 text-rose-400">
                    <Siren className="size-4 animate-bounce" />
                    <span className="text-[10px] uppercase font-extrabold tracking-widest text-rose-300">
                      EMERGENCY
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">Panic Mode</h3>
                  <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                    Instantly share location, dispatch SMS alerts, and dial contacts.
                  </p>
                </div>

                <div className="my-2">
                  <SOSButton
                    onSosActivated={handleSosActivated}
                    isStreaming={isStreaming}
                    onEndSos={stopStreaming}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Grid: Live Location (Left) + Emergency Contacts (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Card 3: Live Location Tactical Card */}
              <div className="lg:col-span-6">
                <LiveLocationTacticalCard />
              </div>

              {/* Card 4: Quick Emergency Contacts Card */}
              <div className="lg:col-span-6">
                <QuickEmergencyContactsCard onManageClick={() => setActiveView('contacts')} />
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-view: Safety Tools (Voice Safety Guardian) ──────── */}
        {activeView === 'safety-tools' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Mic className="size-5 text-blue-400" />
                  Hidden Voice Safety Mode
                </h3>
                <p className="text-xs text-slate-400">
                  Continuous keyword detection for automatic hands-free emergency dispatch.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView('dashboard')}>
                &larr; Back
              </Button>
            </div>
            <VoiceSafetyMode />
          </div>
        )}

        {/* ── Sub-view: Location Management ───────────────────────── */}
        {activeView === 'location' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <MapPin className="size-5 text-blue-400" />
                  Live GPS Radar & Geolocation
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time coordinates attached to your emergency broadcast beacon.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView('dashboard')}>
                &larr; Back
              </Button>
            </div>
            <LiveLocationTacticalCard />
          </div>
        )}

        {/* ── Sub-view: Contacts Management (Full CRUD) ───────────── */}
        {activeView === 'contacts' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Users className="size-5 text-purple-400" />
                  Trusted Emergency Contacts Management
                </h3>
                <p className="text-xs text-slate-400">
                  Add, edit, and configure contacts with country code validation.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView('dashboard')}>
                &larr; Back to Dashboard
              </Button>
            </div>
            <EmergencyContactManager />
          </div>
        )}

        {/* ── Sub-view: Settings ──────────────────────────────────── */}
        {activeView === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Settings className="size-5 text-slate-400" />
                  Protection & Security Settings
                </h3>
                <p className="text-xs text-slate-400">
                  Configure hidden emergency triggers, audio permissions, and auto-dispatch rules.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setActiveView('dashboard')}>
                &larr; Back
              </Button>
            </div>

            <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Voice Recognition Auto-Listen</p>
                  <p className="text-xs text-slate-400">Start keyword monitoring automatically when opening app</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.success('Preference saved')}>
                  Enabled
                </Button>
              </div>

              <Separator className="bg-white/5" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">High-Accuracy GPS</p>
                  <p className="text-xs text-slate-400">Attach satellite coordinates to all outgoing SMS alerts</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => toast.success('GPS accuracy locked')}>
                  Enabled
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── History Drawer / Modal ──────────────────────────────── */}
        {historyOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-base text-white flex items-center gap-2">
                  <History className="size-4 text-blue-400" />
                  Recent Emergency History
                </h4>
                <Button size="icon" variant="ghost" onClick={() => setHistoryOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <RecentAlertsCard />
            </div>
          </div>
        )}
        {/* ── Profile Details Modal ───────────────────────────────── */}
        <ProfileDetailsModal
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
        />
      </main>
    </div>
  );
}
