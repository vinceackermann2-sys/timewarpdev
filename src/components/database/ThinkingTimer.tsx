import { useState, useEffect } from "react";

interface ThinkingTimerProps {
  startTime: number; // Date.now() when thinking started
  className?: string;
}

export function ThinkingTimer({ startTime, className = "" }: ThinkingTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

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
