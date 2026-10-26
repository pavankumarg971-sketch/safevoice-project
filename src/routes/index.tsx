import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Mic,
  MapPin,
  ShieldCheck,
  Siren,
  FileText,
  BellRing,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  ShieldAlert,
  Lock,
  UserCheck,
  KeyRound,
  Shield,
  Radio,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeVoice — Voice-Activated Crime Reporting & Women Safety" },
      {
        name: "description",
        content:
          "Trigger an emergency alert by voice or button, share live GPS with your emergency contacts, and file safety complaints — all in real time.",
      },
      {
        property: "og:title",
        content: "SafeVoice — Voice-Activated Crime Reporting & Women Safety",
      },
      {
        property: "og:description",
        content:
          "Voice-activated emergency alerts, live GPS, emergency contacts and complaint reporting in one real-time safety platform.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Mic,
    title: "Voice activation",
    text: 'Say the keyword "help me" and SafeVoice raises an emergency alert instantly.',
    glow: "group-hover:shadow-[0_0_30px_rgba(244,63,94,0.35)]",
    iconColor: "text-rose-400",
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    border: "border-rose-500/30",
  },
  {
    icon: MapPin,
    title: "Live GPS",
    text: "Your latitude, longitude and accuracy are attached to every alert you send.",
    glow: "group-hover:shadow-[0_0_30px_rgba(56,189,248,0.35)]",
    iconColor: "text-sky-400",
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    border: "border-sky-500/30",
  },
  {
    icon: BellRing,
    title: "Contact notifications",
    text: "Your emergency contacts are notified through a real SMS/email provider.",
    glow: "group-hover:shadow-[0_0_30px_rgba(168,85,247,0.35)]",
    iconColor: "text-purple-400",
    gradient: "from-purple-500/20 via-indigo-500/10 to-transparent",
    border: "border-purple-500/30",
  },
  {
    icon: Siren,
    title: "Real-time response",
    text: "Admins see active emergencies live and can acknowledge or resolve them.",
    glow: "group-hover:shadow-[0_0_30px_rgba(245,158,11,0.35)]",
    iconColor: "text-amber-400",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    border: "border-amber-500/30",
  },
  {
    icon: FileText,
    title: "Crime complaints",
    text: "File harassment, stalking or threat complaints and track their status.",
    glow: "group-hover:shadow-[0_0_30px_rgba(236,72,153,0.35)]",
    iconColor: "text-pink-400",
    gradient: "from-pink-500/20 via-rose-500/10 to-transparent",
    border: "border-pink-500/30",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    text: "Row-level security means only you can read your alerts, contacts and complaints.",
    glow: "group-hover:shadow-[0_0_30px_rgba(16,185,129,0.35)]",
    iconColor: "text-emerald-400",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    border: "border-emerald-500/30",
  },
];

function Landing() {
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const [promptActionName, setPromptActionName] = useState("access the SafeVoice Dashboard");

  // Intercept button clicks when user is not logged in
  const handleProtectedClick = (actionName: string, destination = "/dashboard") => {
    if (session) {
      navigate({ to: destination });
    } else {
      setPromptActionName(actionName);
      setAuthPromptOpen(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between relative overflow-hidden antialiased selection:bg-rose-500/30">
      {/* ── Ambient Glowing Light Orbs for Glassmorphism ─────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-600/20 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[-100px] w-[600px] h-[500px] bg-indigo-600/15 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[50%] left-[-150px] w-[600px] h-[500px] bg-sky-600/15 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-[10%] w-[700px] h-[350px] bg-purple-600/15 blur-[140px] rounded-full pointer-events-none" />

      {/* Subtle Tactical Grid Overlay */}
      <div
        className="absolute inset-0 size-full opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Glassmorphic Top Navigation Bar ─────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.08] bg-[#070d18]/70 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {/* Brand Logo with 3D Glass Badge */}
          <Link
            to="/"
            className="flex items-center gap-3 text-lg font-bold tracking-tight text-white group"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-rose-400 text-white shadow-[0_0_25px_rgba(244,63,94,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="size-5" />
            </span>
            <span className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white">SafeVoice</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.2)]">
                <Radio className="size-2.5 animate-pulse text-rose-400" />
                Live
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] p-1 rounded-2xl backdrop-blur-xl">
            <a
              href="#features"
              className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all rounded-xl hover:bg-white/[0.08]"
            >
              Features
            </a>
            <button
              onClick={() => handleProtectedClick("view the Safety Dashboard")}
              className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-all rounded-xl hover:bg-white/[0.08] cursor-pointer"
            >
              Dashboard
            </button>

            {session && isAdmin && (
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to="/admin">Admin</Link>
              </Button>
            )}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <Button
                asChild
                size="sm"
                className="rounded-xl font-bold bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] hover:shadow-[0_0_30px_rgba(244,63,94,0.6)] hover:scale-105 transition-all"
              >
                <Link to="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="font-medium text-slate-300 hover:text-white hover:bg-white/[0.08] rounded-xl text-xs"
                >
                  <Link to="/auth" search={{ mode: "login", redirect: "/dashboard" }}>
                    Sign in
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  className="rounded-xl font-bold bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white shadow-[0_4px_20px_rgba(244,63,94,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_4px_25px_rgba(244,63,94,0.65)] hover:scale-105 active:scale-95 transition-all text-xs"
                >
                  <Link to="/auth" search={{ mode: "register", redirect: "/dashboard" }}>
                    Create account
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:bg-white/10"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-white/10 bg-[#070d18]/95 backdrop-blur-2xl px-5 py-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col space-y-2">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium rounded-xl hover:bg-white/5 text-slate-200"
              >
                Features
              </a>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleProtectedClick("open the Dashboard");
                }}
                className="text-left px-3 py-2 text-sm font-medium rounded-xl hover:bg-white/5 text-slate-200 cursor-pointer"
              >
                Dashboard
              </button>
            </div>
            <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
              {session ? (
                <Button asChild className="w-full bg-rose-600 text-white rounded-xl">
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    Go to Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-center border-white/10 text-white rounded-xl"
                  >
                    <Link
                      to="/auth"
                      search={{ mode: "login", redirect: "/dashboard" }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Sign in
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="w-full justify-center bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold"
                  >
                    <Link
                      to="/auth"
                      search={{ mode: "register", redirect: "/dashboard" }}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Create account
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main Hero Section (Glassmorphic + 3D) ──────────────── */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pt-20">
        <div className="animate-rise max-w-3xl">
          {/* 3D Floating Glass Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500/15 via-pink-500/10 to-transparent border border-rose-500/30 px-3.5 py-1 text-xs font-semibold text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-xl">
            <Siren className="size-3.5 text-rose-400 animate-bounce" />
            <span>Hidden Crime Reporting & Emergency System</span>
          </div>

          {/* 3D Glowing Headline */}
          <h1 className="mt-6 text-4xl sm:text-6xl font-extrabold leading-[1.12] tracking-tight text-white">
            Your voice is the{" "}
            <span className="bg-gradient-to-r from-rose-400 via-pink-400 to-rose-300 bg-clip-text text-transparent drop-shadow-[0_0_35px_rgba(244,63,94,0.5)]">
              panic button
            </span>
            .
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300/85 leading-relaxed font-normal">
            SafeVoice listens for your secret keyword, captures your live location and alerts your
            emergency contacts and the safety control room — in real time, without unlocking a
            single menu.
          </p>

          {/* 3D Shaded CTA Button Group */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            {/* Primary 3D Gradient Glowing Button */}
            <Button
              asChild
              size="lg"
              className="rounded-2xl px-7 py-6 text-sm font-extrabold bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white shadow-[0_12px_35px_-5px_rgba(244,63,94,0.6),0_0_20px_rgba(244,63,94,0.4),inset_0_1px_0_rgba(255,255,255,0.35)] hover:shadow-[0_15px_45px_-5px_rgba(244,63,94,0.8)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
            >
              <Link to="/auth" search={{ mode: "register", redirect: "/dashboard" }}>
                Get protected now
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>

            {/* Glassmorphic 3D Shaded Button */}
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleProtectedClick("access the Setup Guide")}
              className="rounded-2xl px-6 py-6 text-sm font-bold bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.15] text-slate-100 shadow-[0_8px_25px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:border-white/30 hover:scale-105 active:scale-95 transition-all duration-200 backdrop-blur-xl cursor-pointer"
            >
              Setup guide
            </Button>

            {/* Glass Pill Shortcut */}
            <Button
              size="lg"
              variant="ghost"
              onClick={() => handleProtectedClick("open the Live Emergency Dashboard")}
              className="rounded-2xl px-5 py-6 text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer gap-2"
            >
              <ShieldAlert className="size-4 text-rose-400" />
              Open Live Dashboard
            </Button>
          </div>
        </div>

        {/* ── 6 Feature Cards (Ultra 3D + Glassmorphic + Deep Shading) ─ */}
        <div id="features" className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              onClick={() => handleProtectedClick(`configure ${f.title}`)}
              className={`
                group relative rounded-3xl p-6 sm:p-7 cursor-pointer transition-all duration-300 ease-out
                bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-2xl
                border border-white/[0.12] hover:border-rose-400/40
                shadow-[0_20px_50px_-10px_rgba(0,0,0,0.8),inset_0_1px_1px_0_rgba(255,255,255,0.22)]
                hover:shadow-[0_30px_70px_-15px_rgba(244,63,94,0.3),0_15px_30px_rgba(0,0,0,0.9),inset_0_1px_2px_rgba(255,255,255,0.35)]
                hover:-translate-y-2.5 hover:scale-[1.02]
              `}
            >
              {/* Top ambient highlight inside card */}
              <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

              {/* 3D Elevated Glowing Icon */}
              <div
                className={`
                  grid size-13 place-items-center rounded-2xl bg-gradient-to-tr ${f.gradient}
                  border ${f.border} ${f.iconColor} shadow-[0_8px_20px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)]
                  group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300 ${f.glow}
                `}
              >
                <f.icon className="size-6" />
              </div>

              {/* Card Title with Animated Arrow on Hover */}
              <h2 className="mt-5 text-lg font-bold text-white flex items-center justify-between tracking-tight">
                <span>{f.title}</span>
                <ArrowRight className="size-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-rose-400" />
              </h2>

              {/* Card Description */}
              <p className="mt-2 text-xs sm:text-sm text-slate-300/80 leading-relaxed font-normal">
                {f.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Glassmorphic Sign In / Sign Up Prompt Modal ──────────── */}
      {authPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-white/15 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.9),0_0_40px_rgba(244,63,94,0.2),inset_0_1px_1px_rgba(255,255,255,0.25)] space-y-5 text-center relative backdrop-blur-2xl">
            <button
              onClick={() => setAuthPromptOpen(false)}
              className="absolute top-4 right-4 size-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="size-4" />
            </button>

            {/* Glowing 3D Lock Icon */}
            <div className="mx-auto size-16 rounded-3xl bg-gradient-to-tr from-rose-500/20 via-pink-500/15 to-transparent border border-rose-500/30 text-rose-400 grid place-items-center shadow-[0_0_30px_rgba(244,63,94,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]">
              <Lock className="size-7 animate-pulse" />
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-white tracking-tight">
                Sign In Required
              </h3>
              <p className="text-xs sm:text-sm text-slate-300/80 mt-2 leading-relaxed">
                Please sign in to your SafeVoice account or register to {promptActionName}.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                asChild
                className="w-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 text-white font-bold py-3.5 rounded-2xl gap-2 shadow-[0_8px_25px_rgba(244,63,94,0.45),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_10px_35px_rgba(244,63,94,0.65)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Link to="/auth" search={{ mode: "login", redirect: "/dashboard" }}>
                  <KeyRound className="size-4" />
                  Sign In to Existing Account
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full font-bold py-3.5 rounded-2xl gap-2 border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-white shadow-[0_4px_15px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Link to="/auth" search={{ mode: "register", redirect: "/dashboard" }}>
                  <UserCheck className="size-4" />
                  Create New Account (Free)
                </Link>
              </Button>
            </div>

            <div className="pt-3 border-t border-white/10">
              <button
                onClick={() => {
                  setAuthPromptOpen(false);
                  navigate({ to: "/dashboard" });
                }}
                className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              >
                Or preview as Guest Demo &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Glassmorphic Footer ─────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-[#070d18]/80 backdrop-blur-xl py-6 text-center text-xs text-slate-400">
        SafeVoice · Emergency alerts are only as reliable as your device connectivity and
        permissions. Always contact local emergency services when you can.
      </footer>
    </main>
  );
}
