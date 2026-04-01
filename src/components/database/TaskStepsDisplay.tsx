import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown, Pencil } from "lucide-react";
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
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  const toggleStep = (idx: number) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="space-y-2 mb-4">
      {steps.map((step, idx) => {
        const isCurrent = idx === currentStepIndex;
        const isDone = step.status === "done";
        const isError = step.status === "error";
        const isRunning = step.status === "running" && isCurrent;
        const isExpanded = expandedSteps.has(idx);
        const hasDetail = !!step.detail;

        return (
          <div
            key={idx}
            className={cn(
              "rounded-xl border transition-all duration-300",
              isRunning ? "border-primary/30 bg-primary/5 animate-in fade-in slide-in-from-bottom-2" : "",
              isDone ? "border-border/40 bg-card/50" : "",
              isError ? "border-destructive/30 bg-destructive/5" : "",
              !isRunning && !isDone && !isError ? "border-border/20 bg-muted/20 opacity-60" : ""
            )}
          >
            {/* Step header */}
            <button
              onClick={() => hasDetail && toggleStep(idx)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                hasDetail ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
              )}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {isRunning ? (
                  <Loader2 className="w-[18px] h-[18px] animate-spin text-primary" />
                ) : isDone ? (
                  <CheckCircle2 className="w-[18px] h-[18px] text-primary" />
                ) : isError ? (
                  <XCircle className="w-[18px] h-[18px] text-destructive" />
                ) : (
                  <div className="w-[18px] h-[18px] rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "flex-1 text-sm font-medium leading-snug",
                isRunning ? "text-foreground" : "",
                isDone ? "text-foreground/80" : "",
                isError ? "text-destructive" : "",
                !isRunning && !isDone && !isError ? "text-muted-foreground" : ""
              )}>
                {step.label}
              </span>

              {/* Expand toggle */}
              {hasDetail && (
                <div className="shrink-0 text-muted-foreground">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
            </button>

            {/* Expandable detail */}
            {hasDetail && isExpanded && (
              <div className="px-4 pb-3 pt-0 ml-[30px] border-t border-border/20 mt-0">
                <p className="text-[13px] text-muted-foreground leading-relaxed pt-2.5">
                  {step.detail}
                </p>
                {step.detail && step.detail.includes("http") && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-primary/70">
                    <Pencil className="w-3 h-3" />
                    <span className="truncate max-w-[300px]">
                      {step.detail.match(/https?:\/\/[^\s]+/)?.[0] || ""}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Running indicator at the bottom when streaming */}
      {isStreaming && steps.length > 0 && steps[steps.length - 1]?.status === "running" && (
        <div className="flex items-center gap-2 px-4 py-1 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "300ms" }} />
          </div>
          <span>Working...</span>
        </div>
      )}
    </div>
  );
}
