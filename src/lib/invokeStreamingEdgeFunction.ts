import { supabase } from "@/integrations/supabase/client";

export interface StreamProgress {
  type: "progress";
  stage: string;
  percent: number;
}

export interface StreamResult<T = any> {
  type: "result";
  data: T;
}

export interface StreamError {
  type: "error";
  error: string;
}

type StreamEvent<T = any> = StreamProgress | StreamResult<T> | StreamError;

/**
 * Invoke an edge function with NDJSON streaming.
 * Calls `onProgress` for each progress event, and resolves with the final result.
 */
export async function invokeStreamingEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, unknown>,
  onProgress: (stage: string, percent: number) => void,
  timeoutMs = 300_000
): Promise<{ data: T | null; error: Error | null }> {
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
      body: JSON.stringify({ ...body, stream: true }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errBody = await response.text();
      try {
        const parsed = JSON.parse(errBody);
        return { data: null, error: new Error(parsed.error || response.statusText) };
      } catch {
        return { data: null, error: new Error(response.statusText) };
      }
    }

    // Check if we got NDJSON streaming response
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("ndjson")) {
      // Fallback: non-streaming JSON response
      const data = await response.json();
      onProgress("Complete", 100);
      return { data, error: null };
    }

    // Read NDJSON stream
    const reader = response.body?.getReader();
    if (!reader) {
      return { data: null, error: new Error("No response body") };
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let finalData: T | null = null;
    let streamError: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event: StreamEvent<T> = JSON.parse(line);
          if (event.type === "progress") {
            onProgress(event.stage, event.percent);
          } else if (event.type === "result") {
            finalData = event.data;
          } else if (event.type === "error") {
            streamError = event.error;
          }
        } catch {
          // Ignore malformed lines
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const event: StreamEvent<T> = JSON.parse(buffer);
        if (event.type === "result") finalData = event.data;
        else if (event.type === "error") streamError = event.error;
      } catch { /* ignore */ }
    }

    if (streamError) {
      return { data: null, error: new Error(streamError) };
    }

    return { data: finalData, error: null };
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      console.error(`Streaming request to ${functionName} timed out after ${timeoutMs}ms`);
    }
    return { data: null, error: err };
  }
}
