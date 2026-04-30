import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { BusinessDNAView } from "@/components/database/BusinessDNAView";

const VALID_PILLARS = new Set([
  "brand",
  "product",
  "audience",
  "market",
  "financial",
  "operations",
  "people",
  "growth",
  "strategy",
]);

/**
 * DnaDetailPage — /app/dna/:brandId and /app/dna/:brandId/:pillar
 *
 * Validates the params, waits for the brand list to hydrate, then mounts
 * BusinessDNAView with the right pillar pre-selected.
 */
export default function DnaDetailPage() {
  const { brandId, pillar } = useParams<{ brandId: string; pillar?: string }>();
  const navigate = useNavigate();
  const { brands, isLoading } = useBusinessDNA();
  const [hasSettled, setHasSettled] = useState(false);

  useEffect(() => {
    if (!isLoading) setHasSettled(true);
  }, [isLoading]);

  // Persist the "last opened" brand for code that still reads localStorage.
  useEffect(() => {
    if (brandId) localStorage.setItem("tw_active_brand_id", brandId);
  }, [brandId]);

  if (!brandId) return <Navigate to="/app/dna" replace />;

  // Loading / not-yet-hydrated → skeleton (mirrors old Database.tsx loading shell).
  if (isLoading || !hasSettled) {
    return (
      <div className="h-full w-full flex flex-col p-6 gap-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-border/60 bg-card flex flex-col gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const brand = brands.find((b) => b.id === brandId);
  if (!brand) {
    // Brand list is settled and the id isn't here → bounce to the hub.
    return <Navigate to="/app/dna" replace />;
  }

  const safePillar = pillar && VALID_PILLARS.has(pillar) ? pillar : "brand";

  return (
    <BusinessDNAView
      activeBrandId={brandId}
      activePillar={safePillar}
      onBack={() => navigate("/app/dna")}
    />
  );
}
