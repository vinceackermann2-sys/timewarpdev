import type { MutableRefObject } from "react";

/** Binds the active AbortController to `abortControllerRef` (for Cancel / stall watchdog). */
export function createFetchWithTimeout(abortControllerRef: MutableRefObject<AbortController | null>) {
  return (url: string, options: RequestInit, timeoutMs = 180000): Promise<Response> => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
      .catch((err) => {
        if (err.name === "AbortError") throw new Error("Cancelled");
        throw err;
      })
      .finally(() => clearTimeout(timer));
  };
}
