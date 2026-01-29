import { useState, useEffect } from "react";
import { QuizFunnel } from "@/components/landing/QuizFunnel";
import { LiveAnalysisView } from "@/components/dashboard/LiveAnalysisView";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface QuizData {
  role: string;
  mode: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for quiz data from OAuth redirect
    const storedQuizData = sessionStorage.getItem('quizData');
    if (storedQuizData) {
      try {
        const parsed = JSON.parse(storedQuizData);
        setQuizData(parsed);
      } catch (e) {
        console.error('Failed to parse quiz data:', e);
      }
    }

    // Check for stored Google token
    const storedGoogleToken = sessionStorage.getItem('googleProviderToken');
    if (storedGoogleToken) {
      setGoogleToken(storedGoogleToken);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session);
        
        // Capture provider_token when available (only on initial OAuth)
        if (session?.provider_token) {
          sessionStorage.setItem('googleProviderToken', session.provider_token);
          setGoogleToken(session.provider_token);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
      
      // Capture provider_token if available
      if (session?.provider_token) {
        sessionStorage.setItem('googleProviderToken', session.provider_token);
        setGoogleToken(session.provider_token);
      }

      // If authenticated and has quiz data with research mode, show research
      const storedQuizData = sessionStorage.getItem('quizData');
      if (session && storedQuizData) {
        try {
          const parsed = JSON.parse(storedQuizData);
          if (parsed.mode === 'research') {
            setQuizData(parsed);
            setShowResearch(true);
          }
        } catch (e) {
          console.error('Failed to parse quiz data:', e);
        }
      }
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
