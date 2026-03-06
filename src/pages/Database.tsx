import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DatabaseSidebar } from "@/components/database/DatabaseSidebar";
import { DatabaseView } from "@/components/database/DatabaseView";
import { DataConversionView } from "@/components/database/DataConversionView";
import { TimeWarpAIView } from "@/components/database/TimeWarpAIView";
import { BusinessDNAView } from "@/components/database/BusinessDNAView";
import { MyBusinessesView } from "@/components/database/MyBusinessesView";
import { AddProductURLView } from "@/components/database/AddProductURLView";
import { BusinessDNAProvider } from "@/components/database/BusinessDNAContext";
import { Loader2 } from "lucide-react";

type View = "dataconversion" | "aiceo" | "businessdna";

interface PendingTask {
  role: string;
  task: string;
  timeEstimate: string;
}

const Database = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("businessdna");
  const [showBusinessDNA, setShowBusinessDNA] = useState(false);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [pendingTask, setPendingTask] = useState<PendingTask | null>(null);

  // Check for view parameter and pending task on mount
  useEffect(() => {
    const viewParam = searchParams.get('view');
    const autostart = searchParams.get('autostart');
    
    if (viewParam === 'aiceo') {
      setCurrentView('aiceo');
    }
    
    // Check for pending task from research flow
    if (autostart === 'true') {
      const storedTask = sessionStorage.getItem('pendingAgentTask');
      if (storedTask) {
        try {
          const task = JSON.parse(storedTask);
          setPendingTask(task);
          // Clear after reading
          sessionStorage.removeItem('pendingAgentTask');
        } catch (e) {
          console.error('Failed to parse pending task:', e);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  const handleViewChange = (view: View) => {
    if (!user) {
      navigate("/auth?redirect=/app");
      return;
    }
    setCurrentView(view);
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
          <main className="flex-1 overflow-hidden">
            {currentView === "dataconversion" && user && (
              <BusinessDNAProvider>
                <DataConversionView />
              </BusinessDNAProvider>
            )}
            {currentView === "aiceo" && user && (
              <TimeWarpAIView 
                initialTask={pendingTask}
                onTaskConsumed={() => setPendingTask(null)}
              />
            )}
            {currentView === "businessdna" && user && (
              <BusinessDNAProvider>
                {showAddProduct
                  ? <AddProductURLView 
                      onBack={() => setShowAddProduct(false)} 
                      onComplete={(newBrandId?: string) => { 
                        setShowAddProduct(false); 
                        setActiveBrandId(newBrandId || activeBrandId);
                        setShowBusinessDNA(true); 
                      }}
                      activeBrandId={activeBrandId}
                    />
                  : showBusinessDNA && activeBrandId
                    ? <BusinessDNAView 
                        activeBrandId={activeBrandId} 
                        onBack={() => { setShowBusinessDNA(false); setActiveBrandId(null); }} 
                      />
                    : <MyBusinessesView 
                        onSelectBusiness={() => setShowAddProduct(true)} 
                        onOpenBusiness={(brandId) => { setActiveBrandId(brandId); setShowBusinessDNA(true); }}
                      />
                }
              </BusinessDNAProvider>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Database;
