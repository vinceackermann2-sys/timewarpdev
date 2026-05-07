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
  const { brands, isLoading, loadedWorkspaceId } = useBusinessDNA();
  const { activeWorkspace, isLoading: wsLoading } = useWorkspace();

  const [initialMessage, setInitialMessage] = useState<string | null>(
    (location.state as { initialMessage?: string } | null)?.initialMessage ?? null,
  );

  // Derived (not latched): readiness must re-evaluate on every workspace switch.
  // If we latched `hasSettled = true`, switching to a fresh workspace would
  // momentarily show brands=[] (cleared during load) → flash onboarding.
  const hasSettled =
    !isLoading &&
    !wsLoading &&
    !!activeWorkspace &&
    loadedWorkspaceId === activeWorkspace.workspaceId;

  // Workspace members who aren't owners must NEVER see onboarding —
  // they collaborate on the owner's business.
  const isWorkspaceMemberOnly = !!activeWorkspace && activeWorkspace.role !== "owner";

  // Grace period: even after data has "settled", give it ~2.5s before
  // flipping into onboarding. This avoids flashing onboarding when brands
  // arrive a tick later (e.g. just after a workspace switch / page refresh).
  const wouldOnboard = hasSettled && brands.length === 0 && !isWorkspaceMemberOnly;
  const [graceElapsed, setGraceElapsed] = useState(false);
  useEffect(() => {
    if (!wouldOnboard) {
      setGraceElapsed(false);
      return;
    }
    const t = setTimeout(() => setGraceElapsed(true), 2500);
    return () => clearTimeout(t);
  }, [wouldOnboard, activeWorkspace?.workspaceId]);

  const forceOnboarding = wouldOnboard && graceElapsed;

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
      onOnboardingComplete={(_agentName, newBrandId) => {
        localStorage.setItem("tw_active_brand_id", newBrandId);
        // Stay in assistant chat — onboarding now ends directly after naming.
      }}
    />
  );
}
