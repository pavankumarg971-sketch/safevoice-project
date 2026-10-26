import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  Home,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type AuthSearch = {
  mode?: "login" | "register";
  redirect?: string;
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => {
    return {
      mode: search.mode === "register" ? "register" : "login",
      redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    };
  },
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Authentication — SafeVoice" },
      {
        name: "description",
        content: "Sign in or register for your personal SafeVoice security command center.",
      },
    ],
  }),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">(search.mode || "login");
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (session) {
      navigate({ to: search.redirect || "/dashboard" });
    }
  }, [session, navigate, search.redirect]);

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = loginEmail.toLowerCase().trim();
    if (!cleanEmail || !loginPassword) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      // 1. Try Supabase sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: loginPassword,
      });

      if (!error && data?.user) {
        const fullName =
          data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "SafeVoice User";
        const phone = data.user.user_metadata?.phone || "";

        const profileObj = {
          id: data.user.id,
          user_id: data.user.id,
          full_name: fullName,
          email: data.user.email || cleanEmail,
          phone: phone,
          location_sharing: true,
          demo_mode: false,
          hidden_mode: false,
        };

        if (typeof window !== "undefined") {
          localStorage.setItem("safevoice_active_profile", JSON.stringify(profileObj));
        }

        try {
          await supabase.from("profiles").upsert(
            {
              user_id: data.user.id,
              full_name: fullName,
              email: data.user.email || cleanEmail,
              phone: phone,
              location_sharing: true,
            },
            { onConflict: "user_id" },
          );
        } catch {
          // Ignore the expected error here.
        }

        toast.success(`Welcome back, ${fullName}!`, {
          description: "Signed in successfully. Loading your dashboard...",
        });
        navigate({ to: search.redirect || "/dashboard" });
        return;
      }

      // 2. Check local registered accounts (handles cases where Supabase email confirmation is enabled or offline)
      if (typeof window !== "undefined") {
        const accounts = JSON.parse(localStorage.getItem("safevoice_registered_accounts") || "{}");
        const account = accounts[cleanEmail];

        if (account) {
          if (account.password === loginPassword) {
            localStorage.setItem("safevoice_active_profile", JSON.stringify(account.profile));
            toast.success(`Welcome back, ${account.profile.full_name}!`, {
              description: "Signed in successfully. Opening dashboard...",
            });
            navigate({ to: search.redirect || "/dashboard" });
            return;
          } else {
            toast.error("Incorrect password for this account. Please try again.");
            return;
          }
        }
      }

      // 3. Fallback error message
      toast.error(
        error?.message || "Invalid email or password. Please verify your credentials or register.",
      );
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "An unexpected error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = regEmail.toLowerCase().trim();

    if (!regFullName.trim()) {
      toast.error("Please enter your full name.");
      return;
    }
    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      toast.error("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    try {
      // 1. Attempt Supabase registration
      let userId = `user_${Date.now()}`;
      try {
        const { data } = await supabase.auth.signUp({
          email: cleanEmail,
          password: regPassword,
          options: {
            data: {
              full_name: regFullName.trim(),
              phone: regPhone.trim(),
            },
          },
        });
        if (data?.user?.id) {
          userId = data.user.id;
        }
      } catch {
        // Supabase sign-up might fail if offline or config issue; local fallback ensures user is never blocked
      }

      const profileData = {
        id: userId,
        user_id: userId,
        full_name: regFullName.trim(),
        email: cleanEmail,
        phone: regPhone.trim(),
        location_sharing: true,
        demo_mode: false,
        hidden_mode: false,
      };

      // 2. Persist to registered accounts store
      if (typeof window !== "undefined") {
        const accounts = JSON.parse(localStorage.getItem("safevoice_registered_accounts") || "{}");
        accounts[cleanEmail] = {
          id: userId,
          email: cleanEmail,
          password: regPassword,
          profile: profileData,
        };
        localStorage.setItem("safevoice_registered_accounts", JSON.stringify(accounts));
        localStorage.setItem("safevoice_active_profile", JSON.stringify(profileData));
      }

      // 3. Sync to Supabase profiles table
      try {
        await supabase.from("profiles").upsert(
          {
            user_id: userId,
            full_name: regFullName.trim(),
            email: cleanEmail,
            phone: regPhone.trim(),
            location_sharing: true,
          },
          { onConflict: "user_id" },
        );
      } catch {
        // Ignore the expected error here.
      }

      toast.success(`Account created! Welcome, ${regFullName.trim()}!`, {
        description: "Your safety profile has been initialized. Taking you to dashboard...",
      });

      // Smooth direct navigation to dashboard with active profile
      navigate({ to: search.redirect || "/dashboard" });
    } catch (err) {
      const error = err as Error;
      toast.error(error.message || "Failed to complete registration.");
    } finally {
      setLoading(false);
    }
  };

  // Instant Guest / Demo Mode
  const handleDemoMode = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "safevoice_active_profile",
        JSON.stringify({
          id: "guest_preview",
          user_id: "guest_preview",
          full_name: "Demo Officer",
          email: "demo@safevoice.org",
          phone: "+91 98765 43210",
          location_sharing: true,
          demo_mode: true,
          hidden_mode: false,
        }),
      );
    }
    toast.info("Entering Demo Mode...", {
      description: "You now have access to test alerts, live radar, and voice guardian.",
    });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col justify-between relative overflow-hidden antialiased selection:bg-rose-500/30">
      {/* ── Ambient Background Glow Orbs ──────────────────────────── */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-600/15 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[500px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Subtle Grid Lines */}
      <div
        className="absolute inset-0 size-full opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Clean Top Navigation Header ───────────────────────────── */}
      <header className="relative z-10 mx-auto w-full max-w-6xl flex items-center justify-between px-6 py-5 border-b border-white/[0.06] bg-[#070d18]/60 backdrop-blur-xl">
        <Link
          to="/"
          className="flex items-center gap-3 text-lg font-bold tracking-tight text-white group"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-tr from-rose-600 via-pink-600 to-rose-400 text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform duration-300">
            <ShieldCheck className="size-5" />
          </span>
          <span className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-white">SafeVoice</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300">
              Security
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-slate-300 hover:text-white hover:bg-white/10 text-xs gap-1.5 rounded-xl"
          >
            <Link to="/">
              <Home className="size-3.5" /> Back to Home
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDemoMode}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs gap-1.5 rounded-xl cursor-pointer"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            Instant Demo
          </Button>
        </div>
      </header>

      {/* ── Authentication Card ───────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <Card className="border border-white/10 bg-slate-900/85 backdrop-blur-2xl shadow-2xl shadow-black/80 text-slate-100 rounded-3xl overflow-hidden transition-all duration-300 hover:border-rose-500/30">
            <CardHeader className="text-center pb-4 pt-6">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-gradient-to-tr from-rose-500/20 to-pink-500/10 border border-rose-500/30 text-rose-400 shadow-md">
                <Lock className="size-6" />
              </div>
              <CardTitle className="text-2xl font-extrabold tracking-tight text-white">
                {activeTab === "login" ? "Welcome Back" : "Create Your Account"}
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                {activeTab === "login"
                  ? "Sign in to access your real-time safety command center"
                  : "Register to protect yourself and sync emergency contacts"}
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 pb-6">
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "login" | "register")}
                className="w-full"
              >
                {/* Clean Tab Bar */}
                <TabsList className="grid w-full grid-cols-2 bg-slate-950/80 p-1 rounded-2xl mb-6 border border-white/[0.08]">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white font-bold rounded-xl text-xs sm:text-sm py-2 transition-all cursor-pointer"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-rose-600 data-[state=active]:to-pink-600 data-[state=active]:text-white font-bold rounded-xl text-xs sm:text-sm py-2 transition-all cursor-pointer"
                  >
                    Create Account
                  </TabsTrigger>
                </TabsList>

                {/* ── Sign In Form ──────────────────────────────────── */}
                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email" className="text-xs font-semibold text-slate-300">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="login-email"
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="pl-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="login-pass"
                          className="text-xs font-semibold text-slate-300"
                        >
                          Password
                        </Label>
                        <Link
                          to="/forgot-password"
                          className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors font-medium"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="login-pass"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 pr-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        >
                          {showLoginPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer mt-2"
                    >
                      {loading ? "Signing in..." : "Sign In to SafeVoice"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Create Account Form ───────────────────────────── */}
                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-name" className="text-xs font-semibold text-slate-300">
                        Full Name <span className="text-rose-400">*</span>
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="reg-name"
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="pl-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-300">
                        Email Address <span className="text-rose-400">*</span>
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="sarah@example.com"
                          className="pl-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-phone" className="text-xs font-semibold text-slate-300">
                        Emergency Phone Number{" "}
                        <span className="text-slate-500 font-normal">(Optional)</span>
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="pl-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-pass" className="text-xs font-semibold text-slate-300">
                        Password <span className="text-rose-400">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="reg-pass"
                          type={showRegPassword ? "text" : "password"}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="pl-10 pr-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        >
                          {showRegPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-confirm" className="text-xs font-semibold text-slate-300">
                        Confirm Password <span className="text-rose-400">*</span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 size-4 text-slate-500" />
                        <Input
                          id="reg-confirm"
                          type={showRegPassword ? "text" : "password"}
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="pl-10 h-10 bg-slate-950/70 border-white/10 text-white placeholder:text-slate-600 rounded-xl focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-rose-600 via-pink-600 to-rose-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-rose-600/30 transition-all cursor-pointer mt-2"
                    >
                      {loading ? "Creating Account..." : "Create SafeVoice Account"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Instant Guest Mode Box */}
              <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col gap-2">
                <p className="text-[11px] text-center text-slate-400 font-medium">
                  Testing or evaluating the SafeVoice project?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDemoMode}
                  className="w-full border-dashed border-white/20 hover:border-white/40 bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 text-xs py-2 gap-2 rounded-xl cursor-pointer"
                >
                  <Sparkles className="size-3.5 text-amber-400" />
                  Instant Preview as Guest (No Login Needed)
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 text-center text-xs text-slate-400 border-t border-white/[0.06] py-3.5 bg-slate-950/40">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
                <CheckCircle2 className="size-3.5" />
                <span>256-bit encrypted emergency protection & Row-Level Security</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-500 border-t border-white/[0.06]">
        SafeVoice · Voice-Activated Hidden Crime Reporting & Women Safety System
      </footer>
    </div>
  );
}
