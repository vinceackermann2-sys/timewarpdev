import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Menu } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";

import { BusinessDNAProvider, useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { AppSidebar } from "@/components/app/AppSidebar";
import { AppTopBreadcrumb } from "@/components/app/AppTopBreadcrumb";
import { ActionsCelebration } from "@/components/database/ActionsCelebration";

/**
 * AppShell — the layout for everything under /app/*.
 *
 * Replaces the old monolithic Database.tsx. Responsibilities:
 *  - Auth guard → redirect unauthenticated users to /auth?redirect=...
 *  - BusinessDNAProvider wrapper (so every nested page sees brand state)
 *  - Sidebar + <Outlet /> shell
 *  - URL param handlers preserved from Database.tsx:
 *      • OAuth return  (?oauth_success / ?oauth_error / &brandId)
 *      • Action purchase verification (?action_session)
 *      • Referrer celebration check
 *      • Legacy ?view= / ?onboarding= / ?addProduct= redirects
 *
 * Plans/Billing, referral celebration, and action purchase flows are kept
 * intact — only the routing skeleton has been rewritten.
 */
function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border">
      <div className="flex items-center gap-2">
        <img src="/favicon.png" alt="TimeWarp" className="h-7 w-7 rounded-lg" />
        <span className="font-semibold text-sm">TimeWarp</span>
      </div>
      <Button variant="ghost" size="icon" onClick={toggleSidebar}>
        <Menu className="h-5 w-5" />
      </Button>
    </div>
  );
}

/**
 * OnboardingGate — every workspace must contain at least one business.
 * If the active workspace has zero brands AND the current user is its owner
 * (workspace members aren't expected to onboard — they collaborate on the
 * owner's business), force them into the chat-driven onboarding at
 * /app/assistant. This prevents bypassing onboarding via direct nav to
 * /app, /app/dashboard, /app/settings, etc.
 */
function OnboardingGate() {
  const navigate = useNavigate();
  const location = useLocation();
  const { brands, products, audiences, isLoading, loadedWorkspaceId } = useBusinessDNA();
  const { activeWorkspace, isLoading: wsLoading } = useWorkspace();

  useEffect(() => {
    if (isLoading || wsLoading) return;
    if (!activeWorkspace) return;
    // Wait until DNA has actually loaded for THIS workspace before deciding —
    // otherwise we may act on a stale empty list from a previous workspace id
    // and incorrectly push the user back into onboarding.
    if (loadedWorkspaceId !== activeWorkspace.workspaceId) return;
    // Only force onboarding for the workspace OWNER.
    if (activeWorkspace.role !== "owner") return;

    // Empty workspace → onboarding.
    const noBrands = brands.length === 0;

    // A brand is considered "empty DNA" if it has no real name/category,
    // no associated products/audiences, and no manual pillar overrides.
    const hasMeaningfulBrand = brands.some((b) => {
      const name = (b.name || "").trim().toLowerCase();
      const hasName = !!name && name !== "untitled" && name !== "new business";
      const hasCategory = !!(b.category && b.category.trim());
      const hasProducts = products.some((p) => p.brandId === b.id);
      const hasAudiences = audiences.some((a) => a.brandId === b.id);
      const hasOverrides =
        !!b.pillarOverrides &&
        Object.values(b.pillarOverrides).some(
          (fields) => fields && Object.values(fields).some((v) => (v || "").trim().length > 0),
        );
      return hasName || hasCategory || hasProducts || hasAudiences || hasOverrides;
    });

    if (!noBrands && hasMeaningfulBrand) return;

    // Allow the assistant route itself (it hosts the onboarding UI).
    const path = location.pathname;
    if (path.startsWith("/app/assistant")) return;

    navigate("/app/assistant", { replace: true });
  }, [brands, products, audiences, isLoading, wsLoading, activeWorkspace, loadedWorkspaceId, location.pathname, navigate]);

  return null;
}

function AuthGuardLoading() {
  return (
    <div className="h-screen overflow-hidden flex w-full bg-background">
      <div className="hidden md:flex w-[260px] flex-col border-r border-border p-4 gap-6">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-md" />
          ))}
        </div>
        <div className="mt-auto space-y-2">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>
      <div className="flex-1 flex flex-col p-6 gap-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl border border-border/60 bg-card flex flex-col items-center gap-3">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();

  const [showReferrerCelebration, setShowReferrerCelebration] = useState(false);
  const [showPurchaseCelebration, setShowPurchaseCelebration] = useState(false);
  const [purchasedActions, setPurchasedActions] = useState(0);

  // Provided down to nested pages via Outlet context — they can read these
  // and decide what to do (e.g. assistant page reads onboardingUrl).
  const outletContext = useMemo(
    () => ({
      onboardingUrl: searchParams.get("url"),
    }),
    [searchParams],
  );

  // ── 1. Legacy ?view= / ?onboarding= / ?addProduct= → new routes ──
  // Old links generated by Database.tsx must keep working.
  useEffect(() => {
    const viewParam = searchParams.get("view");
    const onboarding = searchParams.get("onboarding");
    const addProduct = searchParams.get("addProduct");
    const productUrl = searchParams.get("url");

    if (onboarding === "business-dna") {
      const next = productUrl
        ? `/app/assistant?url=${encodeURIComponent(productUrl)}`
        : "/app/assistant";
      navigate(next, { replace: true });
      return;
    }

    if (addProduct === "true") {
      // Old code redirected to "Add Product" inside Business DNA view.
      // The new /app/dna page handles "no brand → onboarding" itself.
      if (productUrl) sessionStorage.setItem("pendingProductUrl", productUrl);
      navigate("/app/dna", { replace: true });
      return;
    }

    if (viewParam === "aiceo" || viewParam === "employees") {
      const next = productUrl
        ? `/app/assistant?url=${encodeURIComponent(productUrl)}`
        : "/app/assistant";
      navigate(next, { replace: true });
    }
  }, [searchParams, navigate]);

  // ── 2. Auth guard ──
  useEffect(() => {
    if (!isLoading && !user) {
      const redirect = `${location.pathname}${location.search}`;
      navigate(`/auth?redirect=${encodeURIComponent(redirect)}`, { replace: true });
    }
  }, [isLoading, user, navigate, location.pathname, location.search]);

  // ── 3. Referrer celebration (unchanged from Database.tsx) ──
  useEffect(() => {
    if (!user) return;
    const checkReferrerRewards = async () => {
      try {
        const { data } = await supabase
          .from("referrals")
          .select("id")
          .eq("referrer_id", user.id)
          .eq("status", "completed")
          .eq("actions_granted", true)
          .is("referrer_celebrated_at", null);
        if (!data || data.length === 0) return;
        const ids = data.map((r) => r.id);
        setShowReferrerCelebration(true);
        await supabase
          .from("referrals")
          .update({ referrer_celebrated_at: new Date().toISOString() })
          .in("id", ids);
      } catch {
        // ignore — celebration is best-effort.
      }
    };
    checkReferrerRewards();
  }, [user]);

  // ── 4. Action purchase verification (?action_session=...) ──
  useEffect(() => {
    const actionSession = searchParams.get("action_session");
    if (!actionSession || !user) return;

    // Strip the param immediately so we don't re-verify on re-render.
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("action_session");
    const qs = newParams.toString();
    window.history.replaceState({}, "", `${location.pathname}${qs ? `?${qs}` : ""}`);

    const verifyPurchase = async () => {
      try {
        const wsId = localStorage.getItem("preferred_workspace_id");
        const { data, error } = await supabase.functions.invoke("verify-action-purchase", {
          body: { sessionId: actionSession, workspaceId: wsId },
        });
        if (error) throw error;
        if (data?.granted && !data?.already_fulfilled) {
          setShowReferrerCelebration(false);
          setPurchasedActions(data.actions);
          setShowPurchaseCelebration(true);
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        } else if (data?.granted && data?.already_fulfilled) {
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }
      } catch (err) {
        console.error("Action purchase verification failed:", err);
        toast.error("Failed to verify action purchase. Please contact support.");
      }
    };

    verifyPurchase();
  }, [searchParams, user, location.pathname, queryClient]);

  // ── 5. OAuth return — toast + jump to DNA detail when brandId provided ──
  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const oauthError = searchParams.get("oauth_error");
    const oauthBrandId = searchParams.get("brandId");
    if (!oauthSuccess && !oauthError) return;

    if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", location.pathname);
      return;
    }

    toast.success(
      `${oauthSuccess.charAt(0).toUpperCase() + oauthSuccess.slice(1)} connected!`,
    );

    if (oauthBrandId) {
      navigate(`/app/dna/${oauthBrandId}`, { replace: true });
    } else {
      window.history.replaceState({}, "", location.pathname);
    }
    // Notify any open connection-status views to re-fetch — otherwise their
    // own ?oauth_success effect never fires (we just stripped the param).
    window.dispatchEvent(new CustomEvent("oauth_connection_completed", { detail: { provider: oauthSuccess } }));
  }, [searchParams, navigate, location.pathname]);

  if (isLoading) return <AuthGuardLoading />;
  if (!user) return null; // redirect to /auth is in flight

  return (
    <BusinessDNAProvider>
      <OnboardingGate />
      <SidebarProvider>
        <div className="h-screen overflow-hidden flex w-full bg-background">
          <AppSidebar userEmail={user.email || ""} />
          <SidebarInset className="flex h-full min-h-0 flex-col flex-1 overflow-hidden bg-[#f3f5f7]">
            <MobileHeader />
            <AppTopBreadcrumb />
            <main className="flex-1 min-h-0 overflow-hidden rounded-tl-2xl border-t border-l border-border bg-background">
              <Outlet context={outletContext} />
            </main>
          </SidebarInset>

          <ActionsCelebration
            open={showReferrerCelebration}
            onOpenChange={setShowReferrerCelebration}
            actionsGranted={20}
            reason="referral"
          />
          <ActionsCelebration
            open={showPurchaseCelebration}
            onOpenChange={setShowPurchaseCelebration}
            actionsGranted={purchasedActions}
            reason="purchase"
          />
        </div>
      </SidebarProvider>
    </BusinessDNAProvider>
  );
}

/** Type for nested pages that want to read AppShell's outlet context. */
export type AppShellOutletContext = {
  onboardingUrl: string | null;
};
