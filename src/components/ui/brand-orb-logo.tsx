import { useState } from "react";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { cn } from "@/lib/utils";

interface BrandOrbLogoProps {
  /** Resolved logo URL for the active brand (e.g. brand.logoUrls?.[brand.selectedLogo ?? 0]) */
  logoUrl?: string | null;
  /** Brand name — used for alt text */
  brandName?: string | null;
  size?: number;
  className?: string;
  /** Forwarded to the orb fallback */
  animated?: boolean;
}

/**
 * Renders the active brand's logo when one is available, otherwise falls back
 * to the BusinessBrainOrb. Use this anywhere we previously rendered the orb
 * to represent "this business / agent".
 */
const BrandOrbLogo: React.FC<BrandOrbLogoProps> = ({
  logoUrl,
  brandName,
  size = 22,
  className,
  animated = true,
}) => {
  const [errored, setErrored] = useState(false);
  const showLogo = !!logoUrl && !errored;

  if (!showLogo) {
    return <BusinessBrainOrb size={size} className={className} animated={animated} />;
  }

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-black/5",
        className
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl!}
        alt={brandName ? `${brandName} logo` : "Brand logo"}
        className="h-full w-full object-contain bg-[#fafbff]"
        loading="lazy"
        onError={() => setErrored(true)}
      />
    </div>
  );
};

export default BrandOrbLogo;
