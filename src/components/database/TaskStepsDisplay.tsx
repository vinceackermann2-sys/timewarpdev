import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskStep {
  action: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
}

interface Props {
  steps: TaskStep[];
  currentStepIndex: number;
  isStreaming?: boolean;
}

export function TaskStepsDisplay({ steps, currentStepIndex, isStreaming }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const doneCount = steps.filter(s => s.status === "done").length;
  const errorCount = steps.filter(s => s.status === "error").length;
  const totalCount = steps.length;
  const currentStep = steps[currentStepIndex] || steps[steps.length - 1];
  const isRunning = isStreaming && currentStep?.status === "running";

  if (totalCount === 0) return null;

  return (
    <div className="mb-2">
      {/* Compact summary bar — always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg border text-left transition-all text-xs",
          isRunning
            ? "border-primary/20 bg-primary/[0.04]"
            : errorCount > 0
              ? "border-destructive/20 bg-destructive/[0.03]"
              : "border-border/40 bg-muted/30",
          "hover:bg-muted/50"
        )}
      >
        {/* Status icon */}
        {isRunning ? (
          <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
        ) : errorCount > 0 ? (
          <XCircle className="w-3 h-3 text-destructive shrink-0" />
        ) : (
          <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
        )}

        {/* Current step label */}
        <span className="flex-1 truncate text-foreground/80">
          {currentStep?.label || "Processing..."}
        </span>

        {/* Progress count */}
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
          {doneCount}/{totalCount}
        </span>

        {/* Expand chevron */}
        <ChevronDown className={cn("w-3 h-3 text-muted-foreground/60 shrink-0 transition-transform", isExpanded && "rotate-180")} />
      </button>

      {/* Expanded step list */}
      {isExpanded && (
        <div className="mt-1 space-y-px pl-1 border-l border-border/30 ml-[17px]">
          {steps.map((step, idx) => {
            const isDone = step.status === "done";
            const isError = step.status === "error";
            const isActive = step.status === "running" && idx === currentStepIndex;

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-0.5 text-[10px] leading-tight rounded",
                  isActive && "text-foreground",
                  isDone && "text-foreground/50",
                  isError && "text-destructive",
                  !isActive && !isDone && !isError && "text-muted-foreground/50"
                )}
              >
                {isActive ? (
                  <Loader2 className="w-2.5 h-2.5 animate-spin text-primary shrink-0" />
                ) : isDone ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-primary/60 shrink-0" />
                ) : isError ? (
                  <XCircle className="w-2.5 h-2.5 text-destructive shrink-0" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full border border-muted-foreground/20 shrink-0" />
                )}
                <span className="truncate">{step.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Pulsing dots while working */}
      {isRunning && !isExpanded && (
        <div className="flex items-center gap-0.5 px-3 py-0.5">
          <span className="w-0.5 h-0.5 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-0.5 h-0.5 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-0.5 h-0.5 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}
