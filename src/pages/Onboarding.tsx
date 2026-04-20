import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  BusinessDNAProvider,
  useBusinessDNA,
} from "@/components/database/BusinessDNAContext";
import { BusinessDNAOnboarding } from "@/components/database/BusinessDNAOnboarding";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Inner component — runs inside BusinessDNAProvider so it can read existing
 * brands and short-circuit if the user has already completed onboarding.
 */
function OnboardingInner({ productUrl }: { productUrl: string | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { brands, isLoading } = useBusinessDNA();
  const [allowReentry] = useState(() => {
    // If user explicitly navigates here with ?force=1, let them re-onboard
    const params = new URLSearchParams(window.location.search);
    return params.get("force") === "1";
  });

  // Returning users with existing DNA → straight to app
  useEffect(() => {
    if (isLoading || allowReentry) return;
    if (brands.length > 0) {
      navigate("/app", { replace: true });
    }
  }, [isLoading, brands.length, allowReentry, navigate]);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (brands.length > 0 && !allowReentry) {
    // Will redirect — render nothing in the meantime
    return null;
  }

  return (
    <BusinessDNAOnboarding
      productUrl={productUrl}
      onComplete={(_agentName, _brandId) => {
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        // Land in the Assistant view after onboarding
        navigate("/app?view=aiceo", { replace: true });
      }}
    />
  );
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();

  // Require auth
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth?redirect=/onboarding", { replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  const productUrl = searchParams.get("url");

  return (
    <BusinessDNAProvider>
      <OnboardingInner productUrl={productUrl} />
    </BusinessDNAProvider>
  );
};

export default Onboarding;
