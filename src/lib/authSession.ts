import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export async function getSafeSession(): Promise<Session | null> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return session ?? null;
  } catch (error) {
    console.error("Failed to restore auth session:", error);

    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (signOutError) {
      console.error("Failed to clear local auth session:", signOutError);
    }

    return null;
  }
}
