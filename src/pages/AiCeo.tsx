import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { getSafeSession } from "@/lib/authSession";
import { AuthDialog } from "@/components/landing/AuthDialog";
import { AiCeoChatView } from "@/components/aiceo/AiCeoChatView";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import NewHero from "@/components/landing/NewHero";
import NewHowItWorks from "@/components/landing/NewHowItWorks";
import NewValueComparison from "@/components/landing/NewValueComparison";
import NewVision from "@/components/landing/NewVision";

const AiCeo = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [authProductUrl, setAuthProductUrl] = useState<string | undefined>();

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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#3399ff]" />
      </div>
    );
  }

  if (showChat) {
    return <AiCeoChatView />;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <NewHero />
      <NewHowItWorks />
      <NewValueComparison />
      <NewVision />
      <Footer />
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} productUrl={authProductUrl} />
    </div>
  );
};

export default AiCeo;
