import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { BusinessDNAOnboarding } from "@/components/database/BusinessDNAOnboarding";

/**
 * DnaPage — /app/dna
 *
 * Hub for Business DNA.  Decides where to send the user:
 *   • Loading → skeleton
 *   • Has brands → redirect to /app/dna/:firstBrandId
 *   • No brands, owner → BusinessDNAOnboarding
 *   • No brands, non-owner workspace member → empty state
 */
export default function DnaPage() {
  const { brands, isLoading, loadedWorkspaceId } = useBusinessDNA();
  const { activeWorkspace, isLoading: wsLoading } = useWorkspace();

  // Derived (not latched): re-evaluates on every workspace switch so we don't
  // flash onboarding while the new workspace's brands are still loading.
  const hasSettled =
    !isLoading &&
    !wsLoading &&
    !!activeWorkspace &&
    loadedWorkspaceId === activeWorkspace.workspaceId;

  const isWorkspaceMemberOnly = !!activeWorkspace && activeWorkspace.role !== "owner";

  // Prefer the persisted "last opened" brand, then first brand in list.
  const persistedId = typeof window !== "undefined"
    ? localStorage.getItem("tw_active_brand_id")
    : null;
  const targetBrand =
    brands.find((b) => b.id === persistedId) || brands[0] || null;

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

  if (targetBrand) {
    return <Navigate to={`/app/dna/${targetBrand.id}`} replace />;
  }

  if (isWorkspaceMemberOnly) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center gap-3">
        <h2 className="text-lg font-semibold text-foreground">No business yet</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          The workspace owner hasn't set up the business DNA yet. Once they do, you'll see it here.
        </p>
      </div>
    );
  }

  return (
    <BusinessDNAOnboarding
      onComplete={(_agentName, newBrandId) => {
        if (newBrandId) {
          localStorage.setItem("tw_active_brand_id", newBrandId);
          // Soft redirect — DnaPage will pick the new brand up on next render.
          window.location.assign(`/app/dna/${newBrandId}`);
        }
      }}
    />
  );
}
