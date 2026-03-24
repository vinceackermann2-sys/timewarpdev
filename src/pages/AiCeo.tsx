import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { HeroSection } from "@/components/aiceo/HeroSection";
import { ProductDescription } from "@/components/landing/ProductDescription";
import { AiCeoChatView } from "@/components/aiceo/AiCeoChatView";
import { Loader2 } from "lucide-react";
import { getSafeSession } from "@/lib/authSession";

const AiCeo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  const isOAuthReturn =
    searchParams.has("microsoft_connected") ||
    searchParams.has("microsoft_error") ||
    searchParams.has("oauth_success") ||
    searchParams.has("oauth_error");

  const [showChat] = useState(isOAuthReturn);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const session = await getSafeSession();
      if (!isMounted) return;

      if (session?.user) {
        const target = isOAuthReturn ? `/app?${searchParams.toString()}` : "/app";
        navigate(target, { replace: true });
        return;
      }

      setIsLoading(false);
    };

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [navigate, isOAuthReturn, searchParams]);

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

  return (
    <>
      <HeroSection />
      <ProductDescription />
    </>
  );
};

export default AiCeo;
