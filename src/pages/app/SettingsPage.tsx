import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SettingsPanel, type SettingsTab } from "@/components/database/SettingsPanel";

const TAB_PARAM_TO_INTERNAL: Record<string, SettingsTab> = {
  settings: "settings",
  account: "settings",
  workspace: "workspace",
  workspaces: "workspace",
  plans: "plans",
  billing: "plans",
  safety: "safety",
  guardrails: "safety",
  connections: "connections",
};

/**
 * SettingsPage — /app/settings (and /app/settings?tab=plans, etc.)
 *
 * Full-page version of the Settings UI.  Profile, Password, Workspaces,
 * Plans & Billing (Stripe), and Connections all live here.  The same
 * SettingsPanel is reused by the legacy SettingsDialog, so nothing
 * regresses for older callers.
 */
export default function SettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const tabParam = (searchParams.get("tab") || "settings").toLowerCase();
  const defaultTab = TAB_PARAM_TO_INTERNAL[tabParam] || "settings";

  return (
    <div className="h-full overflow-hidden">
      <SettingsPanel
        userEmail={user?.email || ""}
        defaultTab={defaultTab}
        onTabChange={(tab) => {
          // Keep the URL in sync so deep links / browser back work.
          const next = new URLSearchParams(searchParams);
          next.set("tab", tab === "plans" ? "plans" : tab);
          setSearchParams(next, { replace: true });
        }}
        onClose={() => navigate(-1)}
        pageMode
      />
    </div>
  );
}
