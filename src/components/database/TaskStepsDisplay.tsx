import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown } from "lucide-react";
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

  const doneCount = steps.filter(s => s.status === "done").length;
  const totalCount = steps.length;

  return (
    <div className="space-y-0.5 mb-3">
      {/* Progress summary */}
      {totalCount > 1 && (
        <div className="flex items-center gap-1.5 mb-1.5 px-0.5">
          <div className="flex-1 h-0.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium tabular-nums">
            {doneCount}/{totalCount}
          </span>
        </div>
      )}

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
              "rounded-lg border transition-all duration-300 overflow-hidden",
              isRunning ? "border-primary/30 bg-primary/[0.04] shadow-sm shadow-primary/5" : "",
              isDone ? "border-border/30" : "",
              isError ? "border-destructive/30 bg-destructive/[0.04]" : "",
              !isRunning && !isDone && !isError ? "border-border/20 opacity-50" : ""
            )}
          >
            <button
              onClick={() => hasDetail && toggleStep(idx)}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors",
                hasDetail ? "cursor-pointer hover:bg-muted/20" : "cursor-default"
              )}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {isRunning ? (
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                ) : isDone ? (
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                ) : isError ? (
                  <XCircle className="w-3 h-3 text-destructive" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-muted-foreground/25" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "flex-1 text-[11px] leading-tight",
                isRunning ? "font-medium text-foreground" : "",
                isDone ? "text-foreground/70" : "",
                isError ? "text-destructive font-medium" : "",
                !isRunning && !isDone && !isError ? "text-muted-foreground" : ""
              )}>
                {step.label}
              </span>

              {/* Expand chevron */}
              {hasDetail && (
                <div className="shrink-0 text-muted-foreground/60">
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              )}
            </button>

            {/* Detail panel */}
            {hasDetail && isExpanded && (
              <div className="px-2.5 pb-2 border-t border-border/20">
                <p className="text-[10px] text-muted-foreground leading-relaxed pt-1.5 pl-5">
                  {step.detail}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Pulsing dots while working */}
      {isStreaming && steps.length > 0 && steps[steps.length - 1]?.status === "running" && (
        <div className="flex items-center gap-1 px-3 py-1">
          <span className="w-0.5 h-0.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-0.5 h-0.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-0.5 h-0.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}
