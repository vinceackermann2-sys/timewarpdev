import { cn } from "@/lib/utils";

interface BusinessBrainOrbProps {
  size?: number;
  className?: string;
}

const BusinessBrainOrb: React.FC<BusinessBrainOrbProps> = ({ size = 22, className }) => {
  const blurAmount = Math.max(2, size * 0.12);

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      {/* Glow aura */}
      <div
        className="absolute rounded-full animate-pulse-slow"
        style={{
          inset: -(size * 0.25),
          background: `radial-gradient(circle, rgba(133,176,255,0.3) 0%, transparent 70%)`,
        }}
      />

      {/* Animated Silver Trails */}
      <div className="absolute inset-0">
        <div className="silver-edge silver-edge-1" />
        <div className="silver-edge silver-edge-2" />
        <div className="silver-connector silver-connector-1" />
        <div className="silver-connector silver-connector-2" />
      </div>

      {/* Main orb */}
      <div
        className="orb-container orb-core rounded-full"
        style={{
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
        }}
      >
        <div
          className="shine-double"
          style={{ filter: `blur(${blurAmount}px)` }}
        />
      </div>
    </div>
  );
};

export default BusinessBrainOrb;
