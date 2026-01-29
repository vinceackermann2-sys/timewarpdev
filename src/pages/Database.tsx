import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DatabaseSidebar } from "@/components/database/DatabaseSidebar";
import { DatabaseView } from "@/components/database/DatabaseView";
import { DataConversionView } from "@/components/database/DataConversionView";
import { AICEOView } from "@/components/database/AICEOView";
import { Loader2 } from "lucide-react";

type View = "database" | "dataconversion" | "aiceo";

const Database = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("database");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DatabaseSidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          userEmail={user.email || ""}
        />
        <SidebarInset className="flex flex-col flex-1">
          <main className="flex-1 overflow-hidden">
            {currentView === "database" && <DatabaseView />}
            {currentView === "dataconversion" && <DataConversionView />}
            {currentView === "aiceo" && <AICEOView />}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Database;
