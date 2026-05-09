import { supabase } from "@/integrations/supabase/client";

export async function invokeEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
  timeoutMs = 300_000
) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        ...(session?.access_token
          ? { "Authorization": `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await response.json();
    if (!response.ok) return { data: null, error: new Error(data.error || response.statusText) };
    return { data, error: null };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      console.error(`Request to ${functionName} timed out after ${timeoutMs}ms`);
    }
    return { data: null, error: err };
  }
}
