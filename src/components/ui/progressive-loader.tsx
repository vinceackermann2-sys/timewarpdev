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

  return (
    <div className={cn("flex items-center", className)}>
      <motion.div
        className="flex"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.09,
              repeat: Infinity,
              repeatDelay: 0.8,
            },
          },
        }}
      >
        {letters.map((letter, index) => (
          <motion.span
            key={index}
            style={{ display: "inline-block" }}
            className={cn("text-sm font-medium text-muted-foreground", textClassName)}
            variants={{
              hidden: { opacity: 0.2 },
              visible: {
                opacity: [0.2, 1, 0.2],
                transition: {
                  duration: 0.7,
                  ease: "easeInOut",
                },
              },
            }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}

export default ProgressiveLoader;
