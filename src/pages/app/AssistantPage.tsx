import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { AgentChatView } from "@/components/database/AgentChatView";
import type { AppShellOutletContext } from "./AppShell";

/**
 * AssistantPage — /app/assistant
 *
 * Wraps AgentChatView and decides whether to force chat-driven onboarding
 * (brand-less users → onboarding inline; everyone else → normal chat).
 *
 * The location state may carry an `initialMessage` (set by Dashboard cards
 * with onExecuteAction) — we relay it to AgentChatView and clear it once
 * consumed so refresh doesn't re-send it.
 */
export default function AssistantPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { onboardingUrl } = useOutletContext<AppShellOutletContext>();
  const { brands, isLoading } = useBusinessDNA();
  const { activeWorkspace } = useWorkspace();

  const [initialMessage, setInitialMessage] = useState<string | null>(
    (location.state as { initialMessage?: string } | null)?.initialMessage ?? null,
  );
  const [hasSettled, setHasSettled] = useState(false);

  useEffect(() => {
    if (!isLoading) setHasSettled(true);
  }, [isLoading]);

  // Workspace members who aren't owners must NEVER see onboarding —
  // they collaborate on the owner's business.
  const isWorkspaceMemberOnly = !!activeWorkspace && activeWorkspace.role !== "owner";
  const forceOnboarding = hasSettled && brands.length === 0 && !isWorkspaceMemberOnly;

  // Pick an active brand (URL would be the source of truth in the future, but
  // for now AgentChatView reads localStorage / context as fallback).
  const activeBrandId = brands[0]?.id ?? null;

  return (
    <AgentChatView
      activeBrandId={activeBrandId}
      initialMessage={initialMessage}
      onInitialMessageConsumed={() => {
        setInitialMessage(null);
        // Strip the state so a refresh doesn't replay the message.
        if (location.state) {
          navigate(location.pathname + location.search, { replace: true, state: null });
        }
      }}
      forceOnboarding={forceOnboarding}
      onboardingInitialUrl={onboardingUrl}
      onOnboardingComplete={(_agentName, newBrandId, supercharge) => {
        if (supercharge) {
          localStorage.setItem("tw_active_brand_id", newBrandId);
          sessionStorage.setItem(`tw_supercharge_popup_shown_${newBrandId}`, "1");
          navigate("/supercharge-dna");
        }
        // Otherwise stay here — the seeded transcript is the live chat.
      }}
    />
  );
}
