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

// Helper to store tokens via edge function (bypasses RLS)
const storeTokensViaEdgeFunction = async (session: any) => {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/google-oauth-callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token,
        expires_in: 3600,
      }),
    });
    if (!response.ok) {
      console.error("[Index] Failed to store tokens:", await response.text());
    } else {
      console.log("[Index] Tokens stored successfully via edge function");
    }
  } catch (error) {
    console.error("[Index] Error storing tokens:", error);
  }
};

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
      async (event, session) => {
        setIsAuthenticated(!!session);
        
        // Capture provider_token when available (only on initial OAuth)
        if (session?.provider_token) {
          sessionStorage.setItem('googleProviderToken', session.provider_token);
          setGoogleToken(session.provider_token);
          
          // Store refresh token if available
          if (session.provider_refresh_token) {
            sessionStorage.setItem('googleProviderRefreshToken', session.provider_refresh_token);
          }
          
          // Store tokens via edge function (bypasses RLS)
          await storeTokensViaEdgeFunction(session);
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
        
        // Store refresh token if available
        if (session.provider_refresh_token) {
          sessionStorage.setItem('googleProviderRefreshToken', session.provider_refresh_token);
        }
        
        // Store tokens via edge function (bypasses RLS)
        storeTokensViaEdgeFunction(session);
      }

      // If authenticated and has quiz data, show the analysis view (both research and action modes)
      const storedQuizData = sessionStorage.getItem('quizData');
      if (session && storedQuizData) {
        try {
          const parsed = JSON.parse(storedQuizData);
          // Both research and action modes go through the same analysis flow
          if (parsed.mode === 'research' || parsed.mode === 'action') {
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
