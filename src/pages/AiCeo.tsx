import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HeroSection } from "@/components/aiceo/HeroSection";
import { AiCeoChatView } from "@/components/aiceo/AiCeoChatView";

const AiCeo = () => {
  const [searchParams] = useSearchParams();
  const isOAuthReturn = searchParams.has("google_connected") || searchParams.has("microsoft_connected") || searchParams.has("slack_installed") || searchParams.has("google_error") || searchParams.has("microsoft_error") || searchParams.has("slack_error");

  const [showChat, setShowChat] = useState(isOAuthReturn);

  if (showChat) {
    return <AiCeoChatView />;
  }

  return <HeroSection onRunClick={() => setShowChat(true)} />;
};

export default AiCeo;
