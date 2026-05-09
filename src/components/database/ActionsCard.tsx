import { useState } from "react";
import { WandSparkles } from "lucide-react";
import { useActionGate } from "@/hooks/useActionGate";
import { ActionsDialog } from "./ActionsDialog";

export function ActionsCard({ isCollapsed }: { isCollapsed: boolean }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { remaining } = useActionGate();

  const isUnlimited = remaining === Infinity;

  if (isCollapsed) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="w-full text-left block rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Get more Actions</p>
            <p className="text-xs text-muted-foreground">
              {isUnlimited
                ? "Unlimited actions"
                : `${remaining} actions remaining`}
            </p>
          </div>
          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0" style={{ boxShadow: "0 4px 16px rgba(77,136,255,0.2)" }}>
            <WandSparkles className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
        </div>
      </button>
      <ActionsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
