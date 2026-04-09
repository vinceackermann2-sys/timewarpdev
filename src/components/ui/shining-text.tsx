import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ShiningTextProps {
  text: string;
  className?: string;
}

export function ShiningText({ text, className }: ShiningTextProps) {
  return (
    <motion.span
      className={cn(
        "bg-[linear-gradient(110deg,hsl(var(--muted-foreground)),42%,#fff,50%,hsl(var(--muted-foreground)),58%,hsl(var(--muted-foreground)))] bg-[length:200%_100%] bg-clip-text text-transparent",
        className
      )}
      initial={{ backgroundPosition: "200% 0" }}
      animate={{ backgroundPosition: "-200% 0" }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: "linear",
      }}
    >
      {text}
    </motion.span>
  );
}
