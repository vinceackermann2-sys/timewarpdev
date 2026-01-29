import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { IntegrationHub } from "@/components/dashboard/IntegrationHub";
import { ChatInterface } from "@/components/dashboard/ChatInterface";
import { AIResearchView } from "@/components/dashboard/AIResearchView";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";

type View = "integrations" | "chat" | "research";

interface QuizData {
  role: string;
  mode: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>("chat");
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [showResearch, setShowResearch] = useState(false);

  useEffect(() => {
    // Check for quiz data from OAuth redirect
    const storedQuizData = sessionStorage.getItem('quizData');
    if (storedQuizData) {
      try {
        const parsed = JSON.parse(storedQuizData);
        setQuizData(parsed);
        // Show research view if mode is research
        if (parsed.mode === 'research') {
          setShowResearch(true);
        }
        // Clear after reading
        sessionStorage.removeItem('quizData');
      } catch (e) {
        console.error('Failed to parse quiz data:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleResearchComplete = () => {
    setShowResearch(false);
    setCurrentView("chat");
  };

  const handleTakeControl = () => {
    setShowResearch(false);
    setCurrentView("chat");
  };

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

  // Show AI Research view if coming from quiz with research mode
  if (showResearch && quizData) {
    return (
      <AIResearchView
        role={quizData.role}
        mode={quizData.mode}
        onComplete={handleResearchComplete}
        onTakeControl={handleTakeControl}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar 
          currentView={currentView} 
          onViewChange={setCurrentView}
          userEmail={user.email || ""}
        />
        <SidebarInset className="flex flex-col flex-1">
          <DashboardHeader user={user} />
          <main className="flex-1 overflow-hidden">
            {currentView === "integrations" && <IntegrationHub />}
            {currentView === "chat" && <ChatInterface />}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
