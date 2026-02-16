import { useState } from "react";
import { Users, Building2, ShoppingCart, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { CanvasNode, PendingConnection } from "./types";

interface LeadsNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
}

export function LeadsNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onUpdate,
}: LeadsNodeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const selectedType = node.textContent as "b2b" | "b2c" | undefined;

  const handleSelect = (type: "b2b" | "b2c") => {
    onUpdate(node.id, { textContent: type, isAnalyzed: true });
    setDialogOpen(false);
  };

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg select-none overflow-visible",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 240,
        height: selectedType ? 160 : 130,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Leads</span>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col items-center justify-center gap-2">
        {!selectedType ? (
          <>
            <p className="text-xs text-muted-foreground text-center">Configure your lead generation pipeline</p>
            <Button
              size="sm"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border w-full",
              selectedType === "b2b" ? "border-primary/50 bg-primary/5" : "border-accent/50 bg-accent/5"
            )}>
              {selectedType === "b2b" ? (
                <Building2 className="h-4 w-4 text-primary" />
              ) : (
                <ShoppingCart className="h-4 w-4 text-accent-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold">{selectedType === "b2b" ? "B2B" : "B2C"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {selectedType === "b2b" ? "Business-to-Business" : "Business-to-Consumer"}
                </p>
              </div>
            </div>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
              onClick={(e) => {
                e.stopPropagation();
                setDialogOpen(true);
              }}
            >
              Change type
            </button>
          </div>
        )}
      </div>

      {/* Output port */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-primary cursor-crosshair transition-all z-20 hover:scale-125"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOutputPortMouseDown(e);
        }}
      />

      {/* Selection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Choose Your Lead Type</DialogTitle>
            <DialogDescription>Select the type of leads you want to generate</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <button
              onClick={() => handleSelect("b2b")}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all hover:scale-[1.02]",
                "hover:border-primary hover:bg-primary/5",
                selectedType === "b2b" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-bold text-base">B2B</p>
                <p className="text-xs text-muted-foreground mt-1">Business-to-Business</p>
                <p className="text-[10px] text-muted-foreground mt-1">Target companies, decision makers & organizations</p>
              </div>
            </button>
            <button
              onClick={() => handleSelect("b2c")}
              className={cn(
                "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all hover:scale-[1.02]",
                "hover:border-primary hover:bg-primary/5",
                selectedType === "b2c" ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="text-center">
                <p className="font-bold text-base">B2C</p>
                <p className="text-xs text-muted-foreground mt-1">Business-to-Consumer</p>
                <p className="text-[10px] text-muted-foreground mt-1">Target individual customers & end consumers</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
