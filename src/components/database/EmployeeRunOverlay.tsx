import { useState } from "react";
import { Pause, Play, Square, Hand, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";

interface Props {
  employeeName: string;
  currentStep: string;
  isPaused: boolean;
  isManualMode: boolean;
  onPause: () => void;
  onContinue: () => void;
  onStop: () => void;
  onManualTakeover: () => void;
  onReturnControl: () => void;
  safetyAlert?: string | null;
}

export function EmployeeRunOverlay({
  employeeName,
  currentStep,
  isPaused,
  isManualMode,
  onPause,
  onContinue,
  onStop,
  onManualTakeover,
  onReturnControl,
  safetyAlert,
}: Props) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4">
      <div className="rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BusinessBrainOrb size={32} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{employeeName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {isManualMode
                ? "Manual takeover — you have control"
                : isPaused
                ? "Paused"
                : currentStep || "Running…"}
            </p>
          </div>
          {!isManualMode && !isPaused && (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          )}
        </div>

        {/* Safety Alert */}
        {safetyAlert && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Safety guardrail triggered</p>
              <p className="text-muted-foreground mt-0.5">{safetyAlert}</p>
            </div>
          </div>
        )}

        {/* Manual mode banner */}
        {isManualMode && (
          <div className="flex items-start gap-2 rounded-lg bg-accent/50 border border-accent p-3 text-xs">
            <Hand className="h-4 w-4 text-accent-foreground shrink-0 mt-0.5" />
            <p className="text-accent-foreground">
              You have manual control. Complete the sensitive action in the browser, then click <strong>Return Control</strong> to resume the AI.
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-2">
          {isManualMode ? (
            <>
              <Button onClick={onReturnControl} size="sm" className="flex-1 gap-2">
                <Play className="h-3.5 w-3.5" />
                Return Control
              </Button>
              <Button onClick={onStop} variant="destructive" size="sm" className="gap-2">
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </>
          ) : isPaused ? (
            <>
              <Button onClick={onContinue} size="sm" className="flex-1 gap-2">
                <Play className="h-3.5 w-3.5" />
                Continue
              </Button>
              <Button onClick={onManualTakeover} variant="outline" size="sm" className="gap-2">
                <Hand className="h-3.5 w-3.5" />
                Manual
              </Button>
              <Button onClick={onStop} variant="destructive" size="sm" className="gap-2">
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button onClick={onPause} variant="outline" size="sm" className="flex-1 gap-2">
                <Pause className="h-3.5 w-3.5" />
                Pause
              </Button>
              <Button onClick={onManualTakeover} variant="outline" size="sm" className="gap-2">
                <Hand className="h-3.5 w-3.5" />
                Manual
              </Button>
              <Button onClick={onStop} variant="destructive" size="sm" className="gap-2">
                <Square className="h-3.5 w-3.5" />
                Stop
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
