import { useState, useRef, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingTimer } from "./ThinkingTimer";

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
  const [collapsed, setCollapsed] = useState(false);
  const [startTime] = useState(() => Date.now());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, currentStepIndex, collapsed]);

  if (steps.length === 0) return null;

  const doneCount = steps.filter(s => s.status === "done").length;
  const hasRunning = steps.some(s => s.status === "running");
  const allDone = !isStreaming && !hasRunning;

  // Group consecutive same-label steps
  const groupedSteps: { label: string; status: TaskStep["status"]; count: number; detail?: string }[] = [];
  for (const step of steps) {
    const last = groupedSteps[groupedSteps.length - 1];
    if (last && last.label === step.label && last.status === "done" && step.status !== "error") {
      last.count++;
      last.status = step.status;
    } else {
      groupedSteps.push({ label: step.label, status: step.status, count: 1, detail: step.detail });
    }
  }

  const headerLabel = allDone
    ? `Completed ${doneCount} task${doneCount !== 1 ? "s" : ""}`
    : `Hatching ${steps.length} task${steps.length !== 1 ? "s" : ""}...`;

  return (
    <div className="mb-3">
      {/* Header */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors py-1 select-none"
      >
        <span className="font-medium">{headerLabel}</span>
        <span className="text-muted-foreground/60">·</span>
        <ThinkingTimer startTime={startTime} className="text-[12px]" />
        {collapsed ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/60" />
        )}
      </button>

      {/* Steps list */}
      {!collapsed && (
        <div
          ref={scrollRef}
          className="max-h-[240px] overflow-y-auto ml-1 mt-1"
        >
          {groupedSteps.map((step, idx) => {
            const isActive = step.status === "running" && isStreaming;
            const isDone = step.status === "done";
            const isError = step.status === "error";
            const isLast = idx === groupedSteps.length - 1;

            return (
              <div key={idx} className="flex items-stretch gap-0">
                {/* Vertical timeline */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  {/* Icon */}
                  <div className="flex items-center justify-center w-5 h-5 shrink-0">
                    {isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground/60" />
                    ) : isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/50" />
                    ) : isError ? (
                      <XCircle className="w-3.5 h-3.5 text-destructive/60" />
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full border border-muted-foreground/20" />
                    )}
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div className="w-px flex-1 min-h-[12px] bg-muted-foreground/15" />
                  )}
                </div>

                {/* Label */}
                <div className={cn(
                  "flex items-center gap-1.5 pb-2 pt-0.5 text-[12px] leading-tight min-h-[28px]",
                  isActive && "text-foreground/80",
                  isDone && "text-muted-foreground/60",
                  isError && "text-destructive/70",
                  !isActive && !isDone && !isError && "text-muted-foreground/40"
                )}>
                  <span className="truncate">{step.label}</span>
                  {step.count > 1 && (
                    <span className="text-muted-foreground/40 text-[11px] shrink-0">({step.count}×)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
