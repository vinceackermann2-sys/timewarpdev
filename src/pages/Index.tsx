import { useState, useEffect } from "react";
import { Header } from "@/components/landing/Header";
import { HeroSection } from "@/components/aiceo/HeroSection";
import { ProductDescription } from "@/components/landing/ProductDescription";
import { LiveAnalysisView } from "@/components/dashboard/LiveAnalysisView";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface QuizData {
  role: string;
  mode: string;
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading } = useAuth();
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [showResearch, setShowResearch] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    const googleError = searchParams.get("google_error");
    if (googleError) {
      toast({
        title: "Google connection failed",
        description: `Error: ${googleError}. Please try again.`,
        variant: "destructive",
      });
    }

    const googleConnectedParam = searchParams.get("google_connected");
    if (googleConnectedParam === "true") {
      setGoogleConnected(true);
      const storedQuizData = localStorage.getItem('quizData') || sessionStorage.getItem('quizData');
      if (storedQuizData) {
        try {
          setQuizData(JSON.parse(storedQuizData));
        } catch (e) {
          console.error('Failed to parse quiz data:', e);
        }
      }
    }
  }, [searchParams, toast]);

  useEffect(() => {
    if (googleConnected && !!user && quizData && !isLoading) {
      setShowResearch(true);
    }
  }, [googleConnected, user, quizData, isLoading]);

  const handleResearchComplete = () => {
    setShowResearch(false);
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
      <Header />
      <HeroSection />
      <ProductDescription />
    </>
  );
};

export default Index;
