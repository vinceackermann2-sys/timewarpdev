import { cn } from "@/lib/utils";

interface BusinessBrainOrbProps {
  size?: number;
  className?: string;
}

const BusinessBrainOrb: React.FC<BusinessBrainOrbProps> = ({ size = 22, className }) => {
  return (
    <div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      {/* Glow aura */}
      <div className="absolute inset-0 rounded-full bg-blue-400 blur-2xl opacity-20 animate-pulse-slow" />

      {/* Silver edges + connectors */}
      <div className="absolute inset-0">
        <div className="silver-edge silver-edge-1" />
        <div className="silver-edge silver-edge-2" />
        <div className="silver-connector silver-connector-1" />
        <div className="silver-connector silver-connector-2" />
      </div>

      {/* Main orb */}
      <div className="orb-container w-full h-full rounded-full shadow-inner">
        <div className="orb-core w-full h-full rounded-full">
          <div className="shine-double" />
        </div>
      </div>
    </div>
  );
};

export default BusinessBrainOrb;
