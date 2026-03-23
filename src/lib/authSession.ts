import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SESSION_TIMEOUT_MS = 8000;

let inflightPromise: Promise<Session | null> | null = null;

export async function getSafeSession(): Promise<Session | null> {
  // Deduplicate concurrent calls
  if (inflightPromise) return inflightPromise;

  inflightPromise = _doGetSession();
  try {
    return await inflightPromise;
  } finally {
    inflightPromise = null;
  }
}

async function _doGetSession(): Promise<Session | null> {
  try {
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("session_timeout")), SESSION_TIMEOUT_MS)
      ),
    ]);

    const { data: { session }, error } = result;

    if (error) throw error;

    return session ?? null;
  } catch (error: any) {
    const isTransport =
      error?.message === "session_timeout" ||
      error?.message === "Failed to fetch" ||
      error?.status === 522;

    console.error("Failed to restore auth session:", isTransport ? "(transport/timeout)" : error);

    // Clear broken local session so the app doesn't loop
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      // best-effort
    }

    return null;
  }
}
