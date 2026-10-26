import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  hidden_mode: boolean;
  demo_mode: boolean;
  location_sharing: boolean;
  created_at?: string;
  updated_at?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  refreshProfile: async () => {},
  updateProfile: async () => false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentUser = session?.user ?? null;
  const userId = currentUser?.id ?? null;

  async function load(uid: string, userObj?: User | null) {
    try {
      const u = userObj ?? currentUser;
      const [{ data: prof }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("admin_profiles").select("role").eq("user_id", uid),
      ]);

      let finalProfile = (prof as Profile) ?? null;

      // If profile does not exist yet or lacks full_name, auto-create/sync from user metadata
      const metaName = u?.user_metadata?.full_name || u?.email?.split("@")[0] || "";
      const metaPhone = u?.user_metadata?.phone || "";
      const userEmail = u?.email || "";

      if (!finalProfile || (!finalProfile.full_name && metaName)) {
        const payload = {
          user_id: uid,
          full_name: finalProfile?.full_name || metaName || "SafeVoice User",
          email: finalProfile?.email || userEmail,
          phone: finalProfile?.phone || metaPhone,
          hidden_mode: finalProfile?.hidden_mode ?? false,
          demo_mode: finalProfile?.demo_mode ?? false,
          location_sharing: finalProfile?.location_sharing ?? true,
        };

        const { data: upserted } = await supabase
          .from("profiles")
          .upsert(payload, { onConflict: "user_id" })
          .select()
          .maybeSingle();

        if (upserted) {
          finalProfile = upserted as Profile;
        } else {
          finalProfile = { id: uid, ...payload };
        }
      }

      setProfile(finalProfile);
      setIsAdmin(Boolean(roles?.some((r) => r.role === "admin")));
      if (typeof window !== "undefined" && finalProfile) {
        localStorage.setItem("safevoice_active_profile", JSON.stringify(finalProfile));
      }
    } catch (err) {
      console.warn("Could not load user profile:", err);
      // Fallback in-memory profile so UI is never blank
      if (userObj ?? currentUser) {
        const u = (userObj ?? currentUser)!;
        setProfile({
          id: uid,
          user_id: uid,
          full_name: u.user_metadata?.full_name || u.email?.split("@")[0] || "SafeVoice User",
          email: u.email || "",
          phone: u.user_metadata?.phone || "",
          hidden_mode: false,
          demo_mode: false,
          location_sharing: true,
        });
      }
    }
  }

  async function updateProfile(updates: Partial<Profile>): Promise<boolean> {
    if (!userId) return false;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, ...updates }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setProfile(data as Profile);
      } else {
        setProfile((prev) => (prev ? { ...prev, ...updates } : null));
      }
      return true;
    } catch (err) {
      console.error("Failed to update profile:", err);
      return false;
    }
  }

  useEffect(() => {
    let active = true;

    // Load cached profile immediately for zero-delay sidebar rendering
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("safevoice_active_profile");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.full_name) {
            setProfile(parsed);
          }
        } catch {
          // Ignore invalid cached profile data.
        }
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        void load(s.user.id, s.user);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsAdmin(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("safevoice_active_profile");
          localStorage.removeItem("safevoice_active_user");
        }
      }
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        if (data.session?.user) {
          setSession(data.session);
          void load(data.session.user.id, data.session.user);
        } else if (typeof window !== "undefined") {
          const cached = localStorage.getItem("safevoice_active_profile");
          if (cached) {
            try {
              const p = JSON.parse(cached);
              if (p && p.user_id) {
                setProfile(p);
                const mockUser: User = {
                  id: p.user_id,
                  app_metadata: {},
                  user_metadata: { full_name: p.full_name, phone: p.phone },
                  aud: "authenticated",
                  created_at: new Date().toISOString(),
                  email: p.email,
                };
                setSession({
                  access_token: "local-authenticated-token",
                  refresh_token: "local-refresh-token",
                  expires_in: 86400,
                  token_type: "bearer",
                  user: mockUser,
                } as Session);
              }
            } catch {
              // Ignore invalid mock authentication data.
            }
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not get auth session:", err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!userId) return;
    void load(userId, currentUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: currentUser,
      profile,
      isAdmin,
      loading,
      refreshProfile: async () => {
        if (userId) await load(userId, currentUser);
      },
      updateProfile,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, currentUser, profile, isAdmin, loading, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
