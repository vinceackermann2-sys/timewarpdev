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
        className="h-full w-full object-contain select-none"
        draggable={false}
      />
      {/* animated prop preserved for backwards compatibility */}
      {animated ? null : null}
    </div>
  );
};

export default BusinessBrainOrb;
