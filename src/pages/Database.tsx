import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DatabaseSidebar } from "@/components/database/DatabaseSidebar";

import { TimeWarpAIView } from "@/components/database/TimeWarpAIView";
import { BusinessDNAView } from "@/components/database/BusinessDNAView";
import { BusinessDNAOnboarding } from "@/components/database/BusinessDNAOnboarding";
import { BusinessDNAProvider, useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { Menu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionsCelebration } from "@/components/database/ActionsCelebration";
import { AgentChatView } from "@/components/database/AgentChatView";
import { ConnectionsView } from "@/components/database/ConnectionsView";
import { ManageDashboardView } from "@/components/database/ManageDashboardView";
import { TopBreadcrumb } from "@/components/database/TopBreadcrumb";


import { WorkspacesView } from "@/components/database/WorkspacesView";
import { useSidebar } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

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

// Auto-opens the active (or first) brand into BusinessDNAView whenever the user
// is on the Business DNA view but no brand is selected yet — so clicking a pillar
// in the sidebar jumps straight into the pillar instead of showing onboarding.
function DnaPillarAutoOpener({
  enabled,
  activeBrandId,
  onOpenBrand,
}: {
  enabled: boolean;
  activeBrandId: string | null;
  onOpenBrand: (brandId: string) => void;
}) {
  const { brands, isLoading } = useBusinessDNA();
  useEffect(() => {
    if (!enabled || isLoading || activeBrandId) return;
    const target = brands[0];
    if (target) onOpenBrand(target.id);
  }, [enabled, isLoading, activeBrandId, brands, onOpenBrand]);
  return null;
}

// Renders a skeleton placeholder while BusinessDNA data is still loading,
// then either the DNA view (if a brand exists) or the onboarding flow.
function BusinessDnaArea({
  showAddProduct,
  showBusinessDNA,
  activeBrandId,
  dnaPillar,
  onAddProductBack,
  onAddProductComplete,
  onDnaBack,
  onOnboardingComplete,
}: {
  showAddProduct: boolean;
  showBusinessDNA: boolean;
  activeBrandId: string | null;
  dnaPillar: DnaPillar;
  onAddProductBack: () => void;
  onAddProductComplete: (agentName: string, brandId?: string) => void;
  onDnaBack: () => void;
  onOnboardingComplete: (agentName: string, brandId?: string) => void;
}) {
  const { isLoading, brands } = useBusinessDNA();
  // Track whether we've ever observed isLoading=false in this session.
  // Until then, treat as loading even if cached brands hydrated synchronously
  // (prevents onboarding flash when cache is empty for a fresh workspace).
  const [hasSettled, setHasSettled] = useState(false);
  useEffect(() => {
    if (!isLoading) setHasSettled(true);
  }, [isLoading]);

  if (showAddProduct) {
    return (
      <BusinessDNAOnboarding
        isAddBusiness
        activeBrandId={activeBrandId}
        onBack={onAddProductBack}
        onComplete={onAddProductComplete}
      />
    );
  }

  if (showBusinessDNA && activeBrandId) {
    return (
      <BusinessDNAView
        activeBrandId={activeBrandId}
        activePillar={dnaPillar}
        onBack={onDnaBack}
      />
    );
  }

  // Still loading brand list, OR brands exist but the auto-opener hasn't fired yet,
  // OR we haven't completed our first authoritative load yet — show a skeleton
  // instead of flashing onboarding or an empty page.
  if (isLoading || !hasSettled || brands.length > 0) {
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

  // No brands and not loading → first-time onboarding
  return <BusinessDNAOnboarding onComplete={onOnboardingComplete} />;
}

// Wraps AgentChatView (the actual assistant chat) and decides whether to force
// chat onboarding. Brand-less users (no brands after first authoritative load)
// see the chat-driven onboarding inline inside the assistant chat surface, and
// the resulting transcript is persisted as the first chat session of the new
// business via AgentChatView's normal auto-save pipeline.
function EmployeesArea({
  activeBrandId,
  initialAssistantMessage,
  onInitialAssistantMessageConsumed,
  onboardingInitialUrl,
  onOnboardingComplete,
  onOnboardingActiveChange,
}: {
  activeBrandId: string | null;
  initialAssistantMessage: string | null;
  onInitialAssistantMessageConsumed: () => void;
  onboardingInitialUrl: string | null;
  onOnboardingComplete: (agentName: string, brandId: string, supercharge: boolean) => void;
  onOnboardingActiveChange: (active: boolean) => void;
}) {
  const { brands, isLoading } = useBusinessDNA();
  const [hasSettled, setHasSettled] = useState(false);
  useEffect(() => {
    if (!isLoading) setHasSettled(true);
  }, [isLoading]);

  // While we don't yet know whether brands exist, render the standard chat (no flash).
  // Once settled, force onboarding only when we're sure the user has zero brands.
  const forceOnboarding = hasSettled && brands.length === 0;

  return (
    <AgentChatView
      activeBrandId={activeBrandId}
      initialMessage={initialAssistantMessage}
      onInitialMessageConsumed={onInitialAssistantMessageConsumed}
      forceOnboarding={forceOnboarding}
      onboardingInitialUrl={onboardingInitialUrl}
      onOnboardingComplete={onOnboardingComplete}
      onOnboardingActiveChange={onOnboardingActiveChange}
    />
  );
}

import type { DashboardTab, DnaPillar } from "@/components/database/DatabaseSidebar";

type View = "aiceo" | "businessdna" | "employees" | "workspaces" | "connections" | "manage";

interface PendingTask {
  role: string;
  task: string;
  timeEstimate: string;
}

const Database = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth();
  const [currentView, setCurrentView] = useState<View>(() => {
    const saved = localStorage.getItem("tw_current_view");
    if (saved && ["aiceo", "businessdna", "employees", "workspaces", "manage"].includes(saved)) {
      return saved as View;
    }
    // First-time users land directly in the assistant chat (which renders the
    // chat-driven onboarding inline when no brands exist yet).
    return "employees";
  });
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [showBusinessDNA, setShowBusinessDNA] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [initialAssistantMessage, setInitialAssistantMessage] = useState<string | null>(null);
  const [showReferrerCelebration, setShowReferrerCelebration] = useState(false);
  const [showPurchaseCelebration, setShowPurchaseCelebration] = useState(false);
  const [purchasedActions, setPurchasedActions] = useState(0);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("Briefing");
  const [dnaPillar, setDnaPillar] = useState<DnaPillar>("brand");
  const [onboardingLocked, setOnboardingLocked] = useState(false);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const autostart = searchParams.get("autostart");
    const addProduct = searchParams.get("addProduct");
    const productUrl = searchParams.get("url");
    const onboarding = searchParams.get("onboarding");

    // Legacy: any /app?onboarding=business-dna links land directly on the assistant chat
    if (onboarding === "business-dna") {
      setCurrentView("employees");
      localStorage.setItem("tw_current_view", "employees");
      if (productUrl) setOnboardingUrl(productUrl);
      return;
    }

    if (addProduct === "true") {
      setCurrentView("businessdna");
      localStorage.setItem("tw_current_view", "businessdna");
      setShowAddProduct(true);
      if (productUrl) {
        sessionStorage.setItem("pendingProductUrl", productUrl);
      }
    }

    // Legacy ?view=aiceo from older links → assistant chat (where onboarding now lives)
    if (viewParam === "aiceo" || viewParam === "employees") {
      setCurrentView("employees");
      localStorage.setItem("tw_current_view", "employees");
      if (productUrl) setOnboardingUrl(productUrl);
    }

    if (autostart === "true") {
      const storedTask = sessionStorage.getItem("pendingAgentTask");
      if (storedTask) {
        try {
          const task = JSON.parse(storedTask);
          setPendingTask(task);
          sessionStorage.removeItem("pendingAgentTask");
        } catch (e) {
          console.error("Failed to parse pending task:", e);
        }
      }
    }
  }, [searchParams, navigate]);

  // New users land on the assistant chat (which renders chat onboarding when no brands exist)
  useEffect(() => {
    if (!user) return;
    const alreadyShown = sessionStorage.getItem("tw_onboarding_shown");
    if (alreadyShown) return;
    const createdAt = new Date(user.created_at).getTime();
    if (Date.now() - createdAt < 30000) {
      sessionStorage.setItem("tw_onboarding_shown", "true");
      setCurrentView("employees");
      localStorage.setItem("tw_current_view", "employees");
    }
  }, [user]);

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/auth?redirect=/app", { replace: true });
    }
  }, [isLoading, user, navigate]);

  // Check referrer rewards
  useEffect(() => {
    if (!user) return;
    const checkReferrerRewards = async () => {
      try {
        const { data } = await supabase
          .from("referrals")
          .select("id")
          .eq("referrer_id", user.id)
          .eq("status", "completed")
          .eq("actions_granted", true);
        if (!data || data.length === 0) return;
        const celebrated: string[] = JSON.parse(localStorage.getItem("celebrated_referral_ids") || "[]");
        const newIds = data.filter((r) => !celebrated.includes(r.id)).map((r) => r.id);
        if (newIds.length > 0) {
          setShowReferrerCelebration(true);
          localStorage.setItem("celebrated_referral_ids", JSON.stringify([...celebrated, ...newIds]));
        }
      } catch {
        // ignore
      }
    };
    checkReferrerRewards();
  }, [user]);

  // Handle action purchase verification
  useEffect(() => {
    const actionSession = searchParams.get("action_session");
    if (!actionSession || !user) return;

    // Strip param immediately to prevent re-runs
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("action_session");
    const qs = newParams.toString();
    window.history.replaceState({}, "", `/app${qs ? `?${qs}` : ""}`);

    const verifyPurchase = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-action-purchase", {
          body: { sessionId: actionSession },
        });
        if (error) throw error;
        if (data?.granted && !data?.already_fulfilled) {
          setShowReferrerCelebration(false);
          // Show celebration for purchased actions
          setPurchasedActions(data.actions);
          setShowPurchaseCelebration(true);
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        } else if (data?.granted && data?.already_fulfilled) {
          // Already fulfilled, just refresh
          queryClient.invalidateQueries({ queryKey: ["subscription"] });
        }
      } catch (err) {
        console.error("Action purchase verification failed:", err);
        toast.error("Failed to verify action purchase. Please contact support.");
      }
    };

    verifyPurchase();
  }, [searchParams, user]);

  // Handle OAuth return — trigger data sync when oauth_success is present
  useEffect(() => {
    const oauthSuccess = searchParams.get("oauth_success");
    const oauthError = searchParams.get("oauth_error");
    const oauthBrandId = searchParams.get("brandId");
    if (!oauthSuccess && !oauthError) return;

    if (oauthError) {
      toast.error(`Connection failed: ${oauthError}`);
      window.history.replaceState({}, "", window.location.pathname);
      return;
    }

    toast.success(`${oauthSuccess.charAt(0).toUpperCase() + oauthSuccess.slice(1)} connected!`);

    if (oauthBrandId) {
      setCurrentView("businessdna");
      localStorage.setItem("tw_current_view", "businessdna");
      setActiveBrandId(oauthBrandId);
      setShowBusinessDNA(true);
      setShowAddProduct(false);
    }

    window.history.replaceState({}, "", window.location.pathname);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="h-screen overflow-hidden flex w-full bg-background">
        {/* Sidebar skeleton */}
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
        {/* Main content skeleton */}
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

  if (!user) {
    return null;
  }


  const handleViewChange = (view: View) => {
    if (!user) {
      navigate("/auth?redirect=/app");
      return;
    }
    // Lock navigation while chat-driven onboarding is in progress.
    if (onboardingLocked && view !== "employees") {
      toast.info("Finish setting up your business first.");
      return;
    }
    setCurrentView(view);
    localStorage.setItem("tw_current_view", view);
  };

  return (
    <BusinessDNAProvider>
      <DnaPillarAutoOpener
        enabled={currentView === "businessdna" && !showAddProduct}
        activeBrandId={showBusinessDNA ? activeBrandId : null}
        onOpenBrand={(brandId) => {
          setActiveBrandId(brandId);
          setShowBusinessDNA(true);
        }}
      />
      <SidebarProvider>
        <div className="h-screen overflow-hidden flex w-full bg-background">
          <div className={onboardingLocked ? "contents pointer-events-none opacity-60" : "contents"}>
            <DatabaseSidebar
              currentView={currentView}
              onViewChange={handleViewChange}
              userEmail={user?.email || ""}
              activeDashboardTab={dashboardTab}
              onDashboardTabChange={setDashboardTab}
              activeDnaPillar={dnaPillar}
              onDnaPillarChange={setDnaPillar}
            />
          </div>
          <SidebarInset className="flex h-full min-h-0 flex-col flex-1 overflow-hidden bg-sidebar">
            <MobileHeader />
            <TopBreadcrumb
              currentView={currentView}
              activeBrandId={activeBrandId}
              activeDnaPillar={currentView === "businessdna" ? dnaPillar : undefined}
              onSelectBrand={(brandId) => {
                setActiveBrandId(brandId);
                setShowBusinessDNA(true);
              }}
            />
            <main className="flex-1 min-h-0 overflow-hidden rounded-tl-2xl border-t border-l border-[#d1d5db] bg-background">
              {currentView === "aiceo" && user && (
                <TimeWarpAIView
                  initialTask={pendingTask}
                  onTaskConsumed={() => setPendingTask(null)}
                />
              )}
              {currentView === "businessdna" && user && (
                <BusinessDnaArea
                  showAddProduct={showAddProduct}
                  showBusinessDNA={showBusinessDNA}
                  activeBrandId={activeBrandId}
                  dnaPillar={dnaPillar}
                  onAddProductBack={() => setShowAddProduct(false)}
                  onAddProductComplete={(_agentName, newBrandId) => {
                    setShowAddProduct(false);
                    setActiveBrandId(newBrandId || activeBrandId);
                    setShowBusinessDNA(true);
                  }}
                  onDnaBack={() => {
                    setShowBusinessDNA(false);
                    setActiveBrandId(null);
                  }}
                  onOnboardingComplete={(_agentName, newBrandId) => {
                    setActiveBrandId(newBrandId || activeBrandId);
                    setShowBusinessDNA(true);
                  }}
                />
              )}
              {currentView === "employees" && user && (
                <EmployeesArea
                  activeBrandId={activeBrandId}
                  initialAssistantMessage={initialAssistantMessage}
                  onInitialAssistantMessageConsumed={() => setInitialAssistantMessage(null)}
                  onboardingInitialUrl={onboardingUrl}
                  onOnboardingComplete={(_agentName, newBrandId, supercharge) => {
                    setOnboardingUrl(null);
                    setActiveBrandId(newBrandId);
                    if (supercharge) {
                      localStorage.setItem("tw_active_brand_id", newBrandId);
                      sessionStorage.setItem(`tw_supercharge_popup_shown_${newBrandId}`, "1");
                      navigate("/supercharge-dna");
                    }
                    // Otherwise stay on employees — the seeded transcript is now the chat.
                  }}
                />
              )}
              {currentView === "workspaces" && user && (
                <WorkspacesView onBack={() => handleViewChange("businessdna")} />
              )}
              {currentView === "connections" && user && (
                <ConnectionsView />
              )}
              {currentView === "manage" && user && (
                <ManageDashboardView
                  activeBrandId={activeBrandId}
                  initialTab={dashboardTab}
                  onExecuteAction={(actionText) => {
                    // Defensive: AI may occasionally return an object/array — coerce to string.
                    const text = typeof actionText === "string"
                      ? actionText
                      : (actionText == null ? "" : JSON.stringify(actionText));
                    if (!text.trim()) return;
                    setInitialAssistantMessage(text);
                    handleViewChange("employees");
                  }}
                />
              )}
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
};

export default Database;
