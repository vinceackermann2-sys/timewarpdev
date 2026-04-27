import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getSafeSession } from "@/lib/authSession";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    let lastUserId: string | null = null;

    // 1. Listen for auth changes (set up BEFORE getSession per Supabase docs)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const newUserId = session?.user?.id ?? null;
      // Clear stale workspace when a different user signs in
      if (newUserId && lastUserId && newUserId !== lastUserId) {
        localStorage.removeItem("preferred_workspace_id");
      }
      if (_event === "SIGNED_OUT") {
        localStorage.removeItem("preferred_workspace_id");
        localStorage.removeItem("cached_brands");
      }
      lastUserId = newUserId;
      setState({ session, user: session?.user ?? null, isLoading: false });
    });

    // 2. Bootstrap session safely (deduped, timeout-protected)
    getSafeSession().then(async (session) => {
      if (!isMounted) return;
      // Verify the user still exists server-side. If the JWT references a
      // deleted/missing user (auth returns 403 user_not_found), force a local
      // sign-out so we don't keep firing edge functions with a stale token.
      if (session?.access_token) {
        try {
          const { data, error } = await supabase.auth.getUser(session.access_token);
          if (error || !data?.user) {
            await supabase.auth.signOut({ scope: "local" }).catch(() => {});
            if (!isMounted) return;
            setState({ session: null, user: null, isLoading: false });
            return;
          }
        } catch {
          // Network/transport issue — keep the session and let edge fns retry.
        }
      }
      setState({ session, user: session?.user ?? null, isLoading: false });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
