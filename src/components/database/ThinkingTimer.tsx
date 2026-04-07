import { useState, useEffect, useRef } from "react";

interface ThinkingTimerProps {
  startTime: number;
  stopped?: boolean;
  className?: string;
}

export function ThinkingTimer({ startTime, stopped = false, className = "" }: ThinkingTimerProps) {
  const [elapsed, setElapsed] = useState(0);
  const frozenRef = useRef<number | null>(null);

  useEffect(() => {
    if (stopped) {
      // Freeze at current elapsed
      if (frozenRef.current === null) {
        frozenRef.current = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(frozenRef.current);
      }
      return;
    }
    frozenRef.current = null;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime, stopped]);

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
