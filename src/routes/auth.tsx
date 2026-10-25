import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ShieldCheck, Lock, Mail, User, Phone, ArrowRight, Eye, EyeOff, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
      { title: "Sign In / Register — SafeVoice" },
      { name: "description", content: "Sign in or create an account for SafeVoice emergency safety platform." },
    ],
  }),
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<"login" | "register">(search.mode || "login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

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
    if (!loginEmail || !loginPassword) {
      toast.error("Please fill in both email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        toast.error(error.message || "Failed to sign in. Please verify your credentials.");
      } else {
        // Automatically sync and update user profile on sign in
        if (data?.user) {
          try {
            const metaName = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "";
            const metaPhone = data.user.user_metadata?.phone || "";
            await supabase.from("profiles").upsert(
              {
                user_id: data.user.id,
                email: data.user.email || loginEmail.trim(),
                full_name: metaName,
                phone: metaPhone,
                location_sharing: true,
              },
              { onConflict: "user_id" }
            );
          } catch (e) {
            console.warn("Profile sync error on sign in:", e);
          }
        }
        toast.success("Welcome back! Redirecting to dashboard...");
        navigate({ to: search.redirect || "/dashboard" });
      }
    } catch {
      toast.error("An unexpected error occurred during sign in.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regFullName) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (regPassword !== regConfirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword,
        options: {
          data: {
            full_name: regFullName.trim(),
            phone: regPhone.trim(),
          },
        },
      });

      if (error) {
        toast.error(error.message || "Failed to create account.");
      } else {
        // Also ensure profile record exists
        if (data.user) {
          try {
            await supabase.from("profiles").upsert({
              user_id: data.user.id,
              full_name: regFullName.trim(),
              email: regEmail.trim(),
              phone: regPhone.trim(),
              demo_mode: false,
              hidden_mode: false,
              location_sharing: true,
            });
          } catch {
            // Profile trigger or RLS might handle it
          }
        }

        toast.success("Account created successfully! Redirecting...");
        navigate({ to: search.redirect || "/dashboard" });
      }
    } catch {
      toast.error("An unexpected error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  // Fast Demo Login
  const handleDemoLogin = () => {
    toast.info("Entering Demo Mode with full access...", {
      description: "You will be redirected to the dashboard in preview mode.",
    });
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="relative z-10 mx-auto w-full max-w-6xl flex items-center justify-between px-6 py-5 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white group">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 text-white shadow-lg shadow-rose-600/30 group-hover:scale-105 transition-transform">
            <ShieldCheck className="size-5" />
          </span>
          SafeVoice
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/" className="text-slate-400 hover:text-white transition-colors">
            Back to Home
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDemoLogin}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white gap-1.5"
          >
            <Sparkles className="size-3.5 text-amber-400" />
            Quick Demo
          </Button>
        </div>
      </header>

      {/* Auth Main Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl shadow-black/60 text-slate-100 transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_25px_60px_-15px_rgba(244,63,94,0.2)]">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Lock className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {activeTab === "login" ? "Welcome back" : "Create your account"}
              </CardTitle>
              <CardDescription className="text-slate-400 text-sm">
                {activeTab === "login"
                  ? "Sign in to access your personal safety guardian"
                  : "Join SafeVoice to protect yourself and your loved ones"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "login" | "register")}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-slate-800/80 p-1 rounded-xl mb-6 border border-white/5">
                  <TabsTrigger
                    value="login"
                    className="data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow font-medium rounded-lg text-xs sm:text-sm py-2"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-rose-600 data-[state=active]:text-white data-[state=active]:shadow font-medium rounded-lg text-xs sm:text-sm py-2"
                  >
                    Create Account
                  </TabsTrigger>
                </TabsList>

                {/* ── Sign In Form ──────────────────────────────────── */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-xs font-semibold text-slate-300">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 size-4 text-slate-500" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="name@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-9 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-pass" className="text-xs font-semibold text-slate-300">
                          Password
                        </Label>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 size-4 text-slate-500" />
                        <Input
                          id="login-pass"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-9 pr-9 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-600/25 mt-2"
                    >
                      {loading ? "Signing in..." : "Sign In to SafeVoice"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>
                </TabsContent>

                {/* ── Sign Up Form ──────────────────────────────────── */}
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="reg-name" className="text-xs font-semibold text-slate-300">
                        Full Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 size-4 text-slate-500" />
                        <Input
                          id="reg-name"
                          type="text"
                          placeholder="Pavan Kumar"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          className="pl-9 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-email" className="text-xs font-semibold text-slate-300">
                        Email Address
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 size-4 text-slate-500" />
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="pavan@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          className="pl-9 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="reg-phone" className="text-xs font-semibold text-slate-300">
                        Phone Number (for SMS Alerts)
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 size-4 text-slate-500" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          className="pl-9 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-pass" className="text-xs font-semibold text-slate-300">
                          Password
                        </Label>
                        <Input
                          id="reg-pass"
                          type="password"
                          placeholder="••••••"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="reg-cpass" className="text-xs font-semibold text-slate-300">
                          Confirm
                        </Label>
                        <Input
                          id="reg-cpass"
                          type="password"
                          placeholder="••••••"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          className="bg-slate-950/60 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-rose-500"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-xl transition-colors shadow-lg shadow-rose-600/25 mt-3"
                    >
                      {loading ? "Creating Account..." : "Create SafeVoice Account"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Demo bypass box */}
              <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-2">
                <p className="text-xs text-center text-slate-400">
                  Testing or evaluating the project?
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDemoLogin}
                  className="w-full border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-slate-300 text-xs py-2 gap-2"
                >
                  <Sparkles className="size-3.5 text-amber-400" />
                  Instant Preview as Guest (No Login Needed)
                </Button>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-2 text-center text-xs text-slate-400 border-t border-white/5 pt-4">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="size-3.5" />
                <span>256-bit encrypted emergency protection</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 text-center text-xs text-slate-400 border-t border-white/5">
        SafeVoice · Voice-Activated Crime Reporting & Women Safety System
      </footer>
    </div>
  );
}
