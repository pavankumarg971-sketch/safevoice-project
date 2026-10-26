import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

/**
 * Simple route guard that redirects unauthenticated users to the auth page.
 * Wrap any protected component with <RequireAuth>{children}</RequireAuth>.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      toast.info("You need to sign in to access that page");
      navigate({ to: "/auth" });
    }
  }, [loading, session, navigate]);

  // While loading or no session, render nothing (or a spinner if desired)
  if (loading || !session) return null;
  return <>{children}</>;
}
