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
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!active) return;
      setSession(s);
      if (s?.user) {
        void load(s.user.id, s.user);
      } else {
        setProfile(null);
        setIsAdmin(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        void load(data.session.user.id, data.session.user);
      }
      setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    void load(userId, currentUser);
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
    [session, currentUser, profile, isAdmin, loading, userId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
