import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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

  useEffect(() => {
    const viewParam = searchParams.get("view");
    const autostart = searchParams.get("autostart");
    const addProduct = searchParams.get("addProduct");
    const productUrl = searchParams.get("url");

    if (viewParam === "aiceo") {
      setCurrentView("aiceo");
      localStorage.setItem("tw_current_view", "aiceo");
    }

    if (addProduct === "true") {
      setCurrentView("businessdna");
      localStorage.setItem("tw_current_view", "businessdna");
      setShowAddProduct(true);
      if (productUrl) {
        sessionStorage.setItem("pendingProductUrl", productUrl);
      }
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

  const handleViewChange = (view: View) => {
    if (!user) {
      navigate("/auth?redirect=/app");
      return;
    }
    setCurrentView(view);
    localStorage.setItem("tw_current_view", view);
  };

  return (
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
                <BusinessDNAProvider>
                  <DataConversionView />
                </BusinessDNAProvider>
              </RestrictedFeatureGate>
            )}
            {currentView === "aiceo" && user && (
              <TimeWarpAIView
                initialTask={pendingTask}
                onTaskConsumed={() => setPendingTask(null)}
              />
            )}
            {currentView === "businessdna" && user && (
              <BusinessDNAProvider>
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
              </BusinessDNAProvider>
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
  );
};

export default Database;
