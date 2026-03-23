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

    // 1. Listen for auth changes (set up BEFORE getSession per Supabase docs)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setState({ session, user: session?.user ?? null, isLoading: false });
    });

    // 2. Bootstrap session safely (deduped, timeout-protected)
    getSafeSession().then((session) => {
      if (!isMounted) return;
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
