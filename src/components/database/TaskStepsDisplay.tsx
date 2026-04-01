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
    <div className="space-y-1.5 mb-4">
      {/* Progress summary */}
      {totalCount > 1 && (
        <div className="flex items-center gap-2 mb-2 px-1">
          <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground font-medium tabular-nums">
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
              "rounded-xl border transition-all duration-300 overflow-hidden",
              isRunning ? "border-primary/30 bg-primary/[0.04] shadow-sm shadow-primary/5 animate-in fade-in slide-in-from-bottom-1" : "",
              isDone ? "border-border/30" : "",
              isError ? "border-destructive/30 bg-destructive/[0.04]" : "",
              !isRunning && !isDone && !isError ? "border-border/20 opacity-50" : ""
            )}
          >
            <button
              onClick={() => hasDetail && toggleStep(idx)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors",
                hasDetail ? "cursor-pointer hover:bg-muted/20" : "cursor-default"
              )}
            >
              {/* Status icon */}
              <div className="shrink-0">
                {isRunning ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                ) : isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                ) : isError ? (
                  <XCircle className="w-4 h-4 text-destructive" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-[1.5px] border-muted-foreground/25" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                "flex-1 text-[13px] leading-snug",
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
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              )}
            </button>

            {/* Detail panel */}
            {hasDetail && isExpanded && (
              <div className="px-3.5 pb-3 border-t border-border/20">
                <p className="text-[12px] text-muted-foreground leading-relaxed pt-2 pl-7">
                  {step.detail}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Pulsing dots while working */}
      {isStreaming && steps.length > 0 && steps[steps.length - 1]?.status === "running" && (
        <div className="flex items-center gap-1.5 px-4 py-1.5">
          <span className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "0ms" }} />
          <span className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "150ms" }} />
          <span className="w-1 h-1 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "300ms" }} />
        </div>
      )}
    </div>
  );
}
