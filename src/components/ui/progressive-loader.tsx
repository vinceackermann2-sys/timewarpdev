import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressiveLoaderProps {
  text?: string;
  className?: string;
  textClassName?: string;
}

export function ProgressiveLoader({
  text = "Processing",
  className,
  textClassName,
}: ProgressiveLoaderProps) {
  const letters = Array.from(text);
  // Sweep left-to-right: each letter brightens once per cycle, in order, then restarts.
  const stagger = 0.08;
  const duration = 0.5;
  const pause = 0.6;
  const sweep = stagger * letters.length + duration;
  const cycle = sweep + pause;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {letters.map((letter, index) => {
          const start = index * stagger;
          const peak = start + duration / 2;
          const end = start + duration;
          // Build a keyframe timeline across the full cycle so all letters restart together.
          const times = [0, start / cycle, peak / cycle, end / cycle, 1];
          const values = [0.35, 0.35, 1, 0.35, 0.35];
          return (
            <motion.span
              key={index}
              style={{ display: "inline-block" }}
              className={cn("text-sm font-medium text-primary", textClassName)}
              initial={{ opacity: 0.35 }}
              animate={{ opacity: values }}
              transition={{
                duration: cycle,
                times,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop",
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressiveLoader;
