/**
 * BusinessDNAOnboarding — Wrapper that renders the product-first onboarding
 * flow from ChatOnboardingFlow when accessed from the DNA page directly
 * (e.g. /app/dna with no brands).
 *
 * This replaces the old name+type+description flow.
 */
import { ChatOnboardingFlow } from "./aiceo/ChatOnboardingFlow";

interface BusinessDNAOnboardingProps {
  productUrl?: string | null;
  onComplete: (agentName: string, brandId?: string) => void;
  isAddBusiness?: boolean;
  activeBrandId?: string | null;
  onBack?: () => void;
}

export function BusinessDNAOnboarding({ onComplete }: BusinessDNAOnboardingProps) {
  return (
    <ChatOnboardingFlow
      onComplete={(agentName, brandId, _transcript) => {
        onComplete(agentName, brandId);
      }}
    />
  );
}
