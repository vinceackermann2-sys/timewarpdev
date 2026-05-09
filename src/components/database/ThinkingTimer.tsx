import { useState, useEffect, useRef } from "react";

interface ThinkingTimerProps {
  startTime: number;
  stopped?: boolean;
  /** If provided, this frozen elapsed (seconds) is shown when stopped. Survives reloads. */
  frozenElapsed?: number;
  className?: string;
}

export function ThinkingTimer({ startTime, stopped = false, frozenElapsed, className = "" }: ThinkingTimerProps) {
  // If we already have a frozen value, seed with it so first paint is correct (no Date.now() drift).
  const [elapsed, setElapsed] = useState<number>(() => {
    if (typeof frozenElapsed === "number" && Number.isFinite(frozenElapsed)) return Math.max(0, Math.floor(frozenElapsed));
    if (!startTime) return 0;
    const diff = Math.floor((Date.now() - startTime) / 1000);
    return diff < 0 || diff > 60 * 60 * 24 ? 0 : diff;
  });
  const frozenRef = useRef<number | null>(
    typeof frozenElapsed === "number" && Number.isFinite(frozenElapsed) ? Math.max(0, Math.floor(frozenElapsed)) : null
  );

  useEffect(() => {
    // Stopped: lock onto frozenElapsed if available, else freeze current tick.
    if (stopped) {
      if (typeof frozenElapsed === "number" && Number.isFinite(frozenElapsed)) {
        frozenRef.current = Math.max(0, Math.floor(frozenElapsed));
        setElapsed(frozenRef.current);
        return;
      }
      if (frozenRef.current === null) {
        const diff = Math.floor((Date.now() - startTime) / 1000);
        // Sanity guard: if the diff is absurd (loaded a very old session), fall back to 0.
        frozenRef.current = diff < 0 || diff > 60 * 60 * 24 ? 0 : diff;
        setElapsed(frozenRef.current);
      }
      return;
    }
    // Live tracking
    frozenRef.current = null;
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startTime, stopped, frozenElapsed]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = minutes > 0
    ? `${minutes}:${seconds.toString().padStart(2, "0")}`
    : `${seconds}s`;

  return (
    <span className={`tabular-nums text-muted-foreground/60 ${className}`}>
      {display}
    </span>
  );
}
