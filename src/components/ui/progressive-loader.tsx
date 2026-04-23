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
  // Total cycle = stagger * letters + duration + repeatDelay
  const stagger = 0.09;
  const duration = 0.7;
  const repeatDelay = 0.8;
  const cycle = stagger * letters.length + duration + repeatDelay;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex">
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            style={{ display: "inline-block", color: "hsl(var(--muted-foreground))" }}
            className={cn("text-sm font-medium", textClassName)}
            initial={{ opacity: 0.25 }}
            animate={{ opacity: [0.25, 1, 0.25] }}
            transition={{
              duration,
              ease: "easeInOut",
              repeat: Infinity,
              repeatDelay: cycle - duration - index * stagger,
              delay: index * stagger,
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

export default ProgressiveLoader;
