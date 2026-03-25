import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DatabaseSidebar } from "@/components/database/DatabaseSidebar";
import { DataConversionView } from "@/components/database/DataConversionView";
import { TimeWarpAIView } from "@/components/database/TimeWarpAIView";
import { BusinessDNAView } from "@/components/database/BusinessDNAView";
import { MyBusinessesView } from "@/components/database/MyBusinessesView";
import { AddProductURLView } from "@/components/database/AddProductURLView";
import { BusinessDNAProvider } from "@/components/database/BusinessDNAContext";
import { Loader2, Menu } from "lucide-react";
import { ActionsCelebration } from "@/components/database/ActionsCelebration";
import { EmployeesView } from "@/components/database/EmployeesView";
import { RestrictedFeatureGate } from "@/components/database/RestrictedFeatureGate";
import { BusinessDNAOnboarding } from "@/components/database/BusinessDNAOnboarding";
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

type View = "dataconversion" | "aiceo" | "businessdna" | "employees";

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
    if (saved && ["dataconversion", "aiceo", "businessdna", "employees"].includes(saved)) {
      return saved as View;
    }
    return "businessdna";
  });
  const [showBusinessDNA, setShowBusinessDNA] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);
  const [showReferrerCelebration, setShowReferrerCelebration] = useState(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
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
            // Delay hiding onboarding until after state is set so the provider
            // can reload with the new workspace data before rendering
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
        <div className="min-h-screen flex w-full bg-background">
          <DatabaseSidebar
            currentView={currentView}
            onViewChange={handleViewChange}
            userEmail={user?.email || ""}
          />
          <SidebarInset className="flex flex-col flex-1">
            <MobileHeader />
            <main className="flex-1 overflow-hidden">
              {currentView === "dataconversion" && user && (
                <RestrictedFeatureGate
                  featureName="Data Conversion"
                  description="Free users can open this section from the menu, but using Data Conversion requires TimeWarp OG."
                >
                  <DataConversionView />
                </RestrictedFeatureGate>
              )}
              {currentView === "aiceo" && user && (
                <TimeWarpAIView
                  initialTask={pendingTask}
                  onTaskConsumed={() => setPendingTask(null)}
                />
              )}
              {currentView === "businessdna" && user && (
                <>
                  {showAddProduct ? (
                    <AddProductURLView
                      onBack={() => setShowAddProduct(false)}
                      onComplete={(newBrandId?: string) => {
                        setShowAddProduct(false);
                        setActiveBrandId(newBrandId || activeBrandId);
                        setShowBusinessDNA(true);
                      }}
                      activeBrandId={activeBrandId}
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
                    />
                  )}
                </>
              )}
              {currentView === "employees" && user && (
                <RestrictedFeatureGate
                  featureName="Employees"
                  description="Free users can browse here from the menu, but creating and using AI Employees requires TimeWarp OG."
                >
                  <EmployeesView />
                </RestrictedFeatureGate>
              )}
            </main>
          </SidebarInset>
          <ActionsCelebration
            open={showReferrerCelebration}
            onOpenChange={setShowReferrerCelebration}
            actionsGranted={125}
            reason="referral"
          />
        </div>
      </SidebarProvider>
    </BusinessDNAProvider>
  );
};

export default Database;
