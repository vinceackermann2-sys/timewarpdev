import { useState } from "react";
import { HeroSection } from "@/components/aiceo/HeroSection";
import { AiCeoChatView } from "@/components/aiceo/AiCeoChatView";

const AiCeo = () => {
  const [showChat, setShowChat] = useState(false);

  if (showChat) {
    return <AiCeoChatView />;
  }

  return <HeroSection onRunClick={() => setShowChat(true)} />;
};

export default AiCeo;
