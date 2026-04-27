import { cn } from "@/lib/utils";
import timewarpLogo from "@/assets/timewarp-swirl-logo.png";

interface BusinessBrainOrbProps {
  size?: number;
  className?: string;
  /** Kept for API compatibility; the swirl logo is a static image. */
  animated?: boolean;
}

const BusinessBrainOrb: React.FC<BusinessBrainOrbProps> = ({ size = 22, className, animated = true }) => {
  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={timewarpLogo}
        alt="TimeWarp"
        className={cn("h-full w-full object-contain select-none", animated && "animate-spin-slow")}
        style={{ animationDuration: animated ? "20s" : undefined }}
        draggable={false}
      />
    </div>
  );
};

export default BusinessBrainOrb;
