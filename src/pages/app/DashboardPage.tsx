import { useNavigate, useSearchParams } from "react-router-dom";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { ManageDashboardView } from "@/components/database/ManageDashboardView";

/**
 * DashboardPage — /app/dashboard
 *
 * 4 tabs (Briefing · Updates · To-Dos · Objectives) deep-linkable via
 * ?tab=briefing | updates | todos | objectives.
 *
 * When a card's CTA fires, we route to /app/assistant carrying the action
 * text in router state — AssistantPage reads it as initialMessage.
 */
const TAB_PARAM_TO_INTERNAL: Record<string, string> = {
  briefing: "Briefing",
  updates: "Updates",
  todos: "To-Dos",
  objectives: "Objectives",
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { brands } = useBusinessDNA();

  const activeBrandId = brands[0]?.id ?? null;
  const tabParam = (searchParams.get("tab") || "briefing").toLowerCase();
  const initialTab = TAB_PARAM_TO_INTERNAL[tabParam] || "Briefing";

  return (
    <ManageDashboardView
      activeBrandId={activeBrandId}
      initialTab={initialTab}
      onExecuteAction={(actionText) => {
        const text = typeof actionText === "string"
          ? actionText
          : (actionText == null ? "" : JSON.stringify(actionText));
        if (!text.trim()) return;
        navigate("/app/assistant", { state: { initialMessage: text } });
      }}
    />
  );
}
