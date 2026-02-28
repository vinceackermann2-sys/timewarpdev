import { cn } from "@/lib/utils";

interface BusinessBrainOrbProps {
  size?: number;
  className?: string;
}

const BusinessBrainOrb: React.FC<BusinessBrainOrbProps> = ({ size = 22, className }) => {
  const edgeInset = Math.max(1, size * 0.06);
  const edgeBorder = Math.max(2, size * 0.12);
  const connectorInset = Math.max(2, size * 0.12);
  const connectorBorder = Math.max(1, size * 0.06);
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

      {/* Silver rotating edges */}
      <div className="absolute inset-0">
        <div
          className="silver-connector silver-connector-1"
          style={{ inset: -connectorInset, borderWidth: connectorBorder }}
        />
        <div
          className="silver-connector silver-connector-2"
          style={{ inset: -connectorInset, borderWidth: connectorBorder }}
        />
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
