import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DatabaseSidebar } from "@/components/database/DatabaseSidebar";

import { TimeWarpAIView } from "@/components/database/TimeWarpAIView";
import { BusinessDNAView } from "@/components/database/BusinessDNAView";
import { MyBusinessesView } from "@/components/database/MyBusinessesView";
import { BusinessDNAOnboarding } from "@/components/database/BusinessDNAOnboarding";
import { BusinessDNAProvider } from "@/components/database/BusinessDNAContext";
import { Menu } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionsCelebration } from "@/components/database/ActionsCelebration";
import { AgentChatView } from "@/components/database/AgentChatView";
import { ConnectionsView } from "@/components/database/ConnectionsView";
import { ManageDashboardView } from "@/components/database/ManageDashboardView";


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
    return "businessdna";
  });
  const [showBusinessDNA, setShowBusinessDNA] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [showReferrerCelebration, setShowReferrerCelebration] = useState(false);
  const [showPurchaseCelebration, setShowPurchaseCelebration] = useState(false);
  const [purchasedActions, setPurchasedActions] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const autostart = searchParams.get("autostart");
    const addProduct = searchParams.get("addProduct");
    const productUrl = searchParams.get("url");
    const onboarding = searchParams.get("onboarding");

    if (onboarding === "business-dna") {
      setShowOnboarding(true);
      // Capture URL for onboarding scraping
      if (productUrl) {
        setOnboardingUrl(productUrl);
      }
      // Strip onboarding & addProduct params so refresh doesn't replay
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("onboarding");
      newParams.delete("addProduct");
      newParams.delete("url");
      const qs = newParams.toString();
      window.history.replaceState({}, "", `/app${qs ? `?${qs}` : ""}`);
    } else {
      // Only handle addProduct when NOT in onboarding flow
      if (addProduct === "true") {
        setCurrentView("businessdna");
        localStorage.setItem("tw_current_view", "businessdna");
        setShowAddProduct(true);
        if (productUrl) {
          sessionStorage.setItem("pendingProductUrl", productUrl);
        }
      }
    }

    if (viewParam === "aiceo") {
      setCurrentView("aiceo");
      localStorage.setItem("tw_current_view", "aiceo");
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
  }, [searchParams]);

  // Fallback: detect brand-new user from OAuth redirect (no onboarding param)
  useEffect(() => {
    if (!user || showOnboarding) return;
    const alreadyShown = sessionStorage.getItem("tw_onboarding_shown");
    if (alreadyShown) return;
    const createdAt = new Date(user.created_at).getTime();
    if (Date.now() - createdAt < 30000) {
      sessionStorage.setItem("tw_onboarding_shown", "true");
      setShowOnboarding(true);
    }
  }, [user, showOnboarding]);

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

  if (showOnboarding) {
    return (
      <BusinessDNAProvider>
        <BusinessDNAOnboarding
          productUrl={onboardingUrl}
          onComplete={(agentName, brandId) => {
            setOnboardingUrl(null);
            queryClient.invalidateQueries({ queryKey: ["workspaces"] });
            if (brandId) {
              setCurrentView("businessdna");
              localStorage.setItem("tw_current_view", "businessdna");
              setActiveBrandId(brandId);
              setShowBusinessDNA(true);
            }
            // Delay hiding onboarding until after state is set
            setTimeout(() => setShowOnboarding(false), 100);
          }}
        />
      </BusinessDNAProvider>
    );
  }

  const handleViewChange = (view: View) => {
    if (!user) {
      navigate("/auth?redirect=/app");
      return;
    }
    setCurrentView(view);
    localStorage.setItem("tw_current_view", view);
  };

  return (
    <BusinessDNAProvider>
      <SidebarProvider>
        <div className="h-screen overflow-hidden flex w-full bg-background">
          <DatabaseSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            userEmail={user?.email || ""}
          />
          <SidebarInset className="flex h-full min-h-0 flex-col flex-1 overflow-hidden">
            <MobileHeader />
            <main className="flex-1 min-h-0 overflow-hidden">
              {currentView === "aiceo" && user && (
                <TimeWarpAIView
                  initialTask={pendingTask}
                  onTaskConsumed={() => setPendingTask(null)}
                />
              )}
              {currentView === "businessdna" && user && (
                <>
                  {showAddProduct ? (
                    <BusinessDNAOnboarding
                      isAddBusiness
                      activeBrandId={activeBrandId}
                      onBack={() => setShowAddProduct(false)}
                      onComplete={(_agentName, newBrandId) => {
                        setShowAddProduct(false);
                        setActiveBrandId(newBrandId || activeBrandId);
                        setShowBusinessDNA(true);
                      }}
                    />
                  ) : showBusinessDNA && activeBrandId ? (
                    <BusinessDNAView
                      activeBrandId={activeBrandId}
                      onBack={() => {
                        setShowBusinessDNA(false);
                        setActiveBrandId(null);
                      }}
                    />
                  ) : (
                    <MyBusinessesView
                      onSelectBusiness={() => setShowAddProduct(true)}
                      onOpenBusiness={(brandId) => {
                        setActiveBrandId(brandId);
                        setShowBusinessDNA(true);
                      }}
                      onManageWorkspace={() => handleViewChange("workspaces")}
                    />
                  )}
                </>
              )}
              {currentView === "employees" && user && (
                <AgentChatView />
              )}
              {currentView === "workspaces" && user && (
                <WorkspacesView onBack={() => handleViewChange("businessdna")} />
              )}
              {currentView === "connections" && user && (
                <ConnectionsView />
              )}
              {currentView === "manage" && user && (
                <ManageDashboardView />
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
