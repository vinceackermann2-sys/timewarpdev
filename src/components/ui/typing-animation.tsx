"use client";

import { useEffect, useState, CSSProperties } from "react";

import { cn } from "@/lib/utils";

interface TypingAnimationProps {
  text: string;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  startDelay?: number;
  onComplete?: () => void;
}

export function TypingAnimation({
  text,
  duration = 200,
  className,
  style,
  startDelay = 0,
  onComplete,
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(startDelay === 0);

  useEffect(() => {
    if (startDelay > 0) {
      const delayTimer = setTimeout(() => setStarted(true), startDelay);
      return () => clearTimeout(delayTimer);
    }
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;

    let i = 0;
    const typingEffect = setInterval(() => {
      if (i < text.length) {
        setDisplayedText(text.substring(0, i + 1));
        i++;
      } else {
        clearInterval(typingEffect);
        onComplete?.();
      }
    }, duration);

    return () => clearInterval(typingEffect);
  }, [started, text, duration, onComplete]);

  if (!started) return null;

  return (
    <span className={cn(className)} style={style}>
      {displayedText ? displayedText : ""}
    </span>
  );
}
