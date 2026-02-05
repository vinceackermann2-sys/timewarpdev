 import { useState, useEffect } from "react";
 import { QuizFunnel } from "@/components/landing/QuizFunnel";
 import { LiveAnalysisView } from "@/components/dashboard/LiveAnalysisView";
 import { useNavigate, useSearchParams } from "react-router-dom";
 import { supabase } from "@/integrations/supabase/client";
 import { Loader2 } from "lucide-react";
 import { useToast } from "@/hooks/use-toast";
 
 interface QuizData {
   role: string;
   mode: string;
 }
 
 const Index = () => {
  const navigate = useNavigate();
   const [searchParams] = useSearchParams();
   const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
     // Check for Google OAuth error
     const googleError = searchParams.get("google_error");
     if (googleError) {
       toast({
         title: "Google connection failed",
         description: `Error: ${googleError}. Please try again.`,
         variant: "destructive",
       });
     }
 
     // Check for successful Google connection - trigger research mode
     const googleConnected = searchParams.get("google_connected");
     if (googleConnected === "true") {
       const storedQuizData = sessionStorage.getItem('quizData');
       if (storedQuizData) {
         try {
           const parsed = JSON.parse(storedQuizData);
           setQuizData(parsed);
           // Trigger research mode immediately after Google connection
           setShowResearch(true);
         } catch (e) {
           console.error('Failed to parse quiz data:', e);
         }
      }
    }
   }, [searchParams, toast]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
        setIsAuthenticated(!!session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);

       // Note: Research mode is now triggered by google_connected param in the other useEffect
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleResearchComplete = () => {
    setShowResearch(false);
    // Clear quiz data after completion
    sessionStorage.removeItem('quizData');
    navigate("/database");
  };

  const handleTakeControl = () => {
    setShowResearch(false);
    sessionStorage.removeItem('quizData');
    navigate("/database");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Show Live Analysis view if authenticated with research mode
  if (showResearch && quizData && isAuthenticated) {
    return (
      <LiveAnalysisView
        role={quizData.role}
        mode={quizData.mode}
        googleToken={googleToken}
        onComplete={handleResearchComplete}
        onTakeControl={handleTakeControl}
      />
    );
  }

  // Show quiz funnel for everyone (authenticated or not)
  return <QuizFunnel />;
};

export default Index;
