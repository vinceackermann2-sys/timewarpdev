import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SettingsPanel, type SettingsTab } from "./SettingsPanel";

/**
 * SettingsDialog — kept for backwards compatibility with any callers that
 * still expect a dialog (DatabaseSidebar, etc.).  Internally it now just
 * renders the shared <SettingsPanel /> inside DialogContent.  All Plans &
 * Billing, workspace, profile, and connections functionality is preserved.
 *
 * NEW preferred surface: route to /app/settings instead, which renders the
 * same panel as a full-bleed page.
 */
interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function SettingsDialog({ open, onOpenChange, userEmail }: SettingsDialogProps) {
  const [defaultTab, setDefaultTab] = useState<SettingsTab>("settings");

  // Legacy: the old DatabaseSidebar fired a "settings-tab" CustomEvent
  // with detail="billing" to deep-link into Plans & Billing.  Honor it.
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "billing") setDefaultTab("plans");
      if (detail === "workspace") setDefaultTab("workspace");
      if (detail === "settings") setDefaultTab("settings");
      if (detail === "connections") setDefaultTab("connections");
    };
    window.addEventListener("settings-tab", handler);
    return () => window.removeEventListener("settings-tab", handler);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl h-[75vh] p-0 gap-0 bg-background border-border overflow-hidden">
        <SettingsPanel
          userEmail={userEmail}
          defaultTab={defaultTab}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
