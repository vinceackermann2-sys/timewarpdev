import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/aiceo/HeroSection";
import { AiCeoChatView } from "@/components/aiceo/AiCeoChatView";
import { Loader2 } from "lucide-react";

const AiCeo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const isOAuthReturn =
    searchParams.has("microsoft_connected") ||
    searchParams.has("microsoft_error") ||
    searchParams.has("oauth_success") ||
    searchParams.has("oauth_error");

  const [showChat, setShowChat] = useState(isOAuthReturn);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isOAuthReturn) {
        // Already logged in and not returning from OAuth → go to app
        navigate("/app", { replace: true });
      } else {
        setIsLoading(false);
      }
    });
  }, [navigate, isOAuthReturn]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (showChat) {
    return <AiCeoChatView />;
  }

  return <HeroSection onRunClick={() => setShowChat(true)} />;
};

export default AiCeo;
