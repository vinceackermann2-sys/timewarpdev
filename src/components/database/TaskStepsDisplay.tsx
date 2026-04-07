import { useState, useRef, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, ChevronDown } from "lucide-react";
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

const stepEmoji: Record<string, string> = {
  "Working on memory...": "🧠",
  "Analyzing request...": "🔍",
  "Generating response...": "✍️",
  "Continuing generation...": "🔄",
  "Done": "✅",
  "Error": "❌",
  "Cancelled by user": "⏹",
};

function getStepEmoji(label: string): string {
  for (const [key, emoji] of Object.entries(stepEmoji)) {
    if (label.startsWith(key.replace("...", ""))) return emoji;
  }
  if (label.toLowerCase().includes("error") || label.toLowerCase().includes("fail")) return "❌";
  if (label.toLowerCase().includes("cancel")) return "⏹";
  if (label.toLowerCase().includes("continu")) return "🔄";
  if (label.toLowerCase().includes("navigat")) return "🌐";
  if (label.toLowerCase().includes("click")) return "👆";
  if (label.toLowerCase().includes("type") || label.toLowerCase().includes("fill")) return "⌨️";
  if (label.toLowerCase().includes("extract") || label.toLowerCase().includes("read")) return "📋";
  if (label.toLowerCase().includes("scroll")) return "📜";
  if (label.toLowerCase().includes("wait")) return "⏳";
  return "⚡";
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

  return (
    <div className="mb-4">
      {/* Collapsible header */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="flex items-center gap-2 w-full group"
      >
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] transition-colors",
          allDone
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        )}>
          {!allDone && <Loader2 className="w-3 h-3 animate-spin" />}
          {allDone && <CheckCircle2 className="w-3 h-3" />}
          <span className="font-medium">
            {allDone ? `Done · ${doneCount} step${doneCount !== 1 ? "s" : ""}` : "Working..."}
          </span>
          <span className="text-[11px] opacity-60">·</span>
          <ThinkingTimer startTime={startTime} stopped={allDone} className="text-[11px] opacity-70" />
        </div>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 text-muted-foreground/40 transition-transform duration-200",
          !collapsed && "rotate-180"
        )} />
      </button>

      {/* Steps */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        collapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
      )}>
        <div ref={scrollRef} className="max-h-[240px] overflow-y-auto mt-2 ml-1 space-y-0.5">
          {groupedSteps.map((step, idx) => {
            const isActive = step.status === "running" && isStreaming;
            const isDone = step.status === "done";
            const isError = step.status === "error";

            return (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-2 py-1.5 px-2 rounded-md text-[12px] animate-in fade-in slide-in-from-bottom-1 duration-200",
                  isActive && "bg-muted/60"
                )}
              >
                {/* Status icon */}
                <span className="w-4 text-center shrink-0">
                  {isActive ? (
                    <Loader2 className="w-3 h-3 animate-spin text-primary mx-auto" />
                  ) : isError ? (
                    <XCircle className="w-3 h-3 text-destructive mx-auto" />
                  ) : isDone ? (
                    <span className="text-[11px]">{getStepEmoji(step.label)}</span>
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mx-auto" />
                  )}
                </span>

                {/* Label */}
                <span className={cn(
                  "truncate",
                  isActive && "text-foreground font-medium",
                  isDone && "text-muted-foreground",
                  isError && "text-destructive",
                )}>
                  {step.label}
                </span>

                {step.count > 1 && (
                  <span className="text-muted-foreground/40 text-[10px] shrink-0">×{step.count}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
