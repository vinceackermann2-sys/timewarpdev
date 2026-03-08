import { useState, useEffect } from "react";
import { QuizFunnel } from "@/components/landing/QuizFunnel";
import { ProductDescription } from "@/components/landing/ProductDescription";
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
  const [googleConnected, setGoogleConnected] = useState(false);

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

    // Check for successful Google connection
    const googleConnectedParam = searchParams.get("google_connected");
    if (googleConnectedParam === "true") {
      console.log("[Index] google_connected=true detected");
      setGoogleConnected(true);
      
      // Try localStorage first (more reliable across OAuth redirects), then sessionStorage
      const storedQuizData = localStorage.getItem('quizData') || sessionStorage.getItem('quizData');
      console.log("[Index] storedQuizData:", storedQuizData);
      
      if (storedQuizData) {
        try {
          const parsed = JSON.parse(storedQuizData);
          console.log("[Index] parsed quizData:", parsed);
          setQuizData(parsed);
        } catch (e) {
          console.error('[Index] Failed to parse quiz data:', e);
        }
      } else {
        console.log("[Index] No quizData found in storage");
      }
    }
  }, [searchParams, toast]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Index] Auth state changed:", event, !!session);
        setIsAuthenticated(!!session);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Index] Initial session check:", !!session);
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Trigger research mode when both auth and google connection are confirmed
  useEffect(() => {
    console.log("[Index] Trigger check:", { googleConnected, isAuthenticated, quizData: !!quizData, isLoading });
    if (googleConnected && isAuthenticated && quizData && !isLoading) {
      console.log("[Index] Starting research mode!");
      setShowResearch(true);
    }
  }, [googleConnected, isAuthenticated, quizData, isLoading]);

  const handleResearchComplete = () => {
    setShowResearch(false);
    // Clear quiz data after completion
    localStorage.removeItem('quizData');
    sessionStorage.removeItem('quizData');
    navigate("/");
  };

  const handleTakeControl = () => {
    setShowResearch(false);
    localStorage.removeItem('quizData');
    sessionStorage.removeItem('quizData');
    navigate("/");
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
        onComplete={handleResearchComplete}
        onTakeControl={handleTakeControl}
      />
    );
  }

  return (
    <>
      <QuizFunnel />
      <ProductDescription />
    </>
  );
};

export default Index;
