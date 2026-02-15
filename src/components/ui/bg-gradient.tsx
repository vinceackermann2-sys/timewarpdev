import { cn } from "@/lib/utils";

interface BgGradientProps {
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientSize?: string;
  gradientPosition?: string;
  gradientStop?: string;
}

export const BgGradient = ({
  className,
  gradientFrom = "hsl(var(--background))",
  gradientTo = "hsl(var(--primary))",
  gradientSize = "125% 125%",
  gradientPosition = "50% 10%",
  gradientStop = "40%",
}: BgGradientProps) => {
  return (
    <div
      className={cn("absolute inset-0 pointer-events-none", className)}
      style={{
        background: `radial-gradient(${gradientSize} at ${gradientPosition}, ${gradientTo} 0%, transparent ${gradientStop}), ${gradientFrom}`,
      }}
    />
  );
};
