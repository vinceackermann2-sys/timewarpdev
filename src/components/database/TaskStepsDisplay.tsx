import { useRef, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, currentStepIndex]);

  if (steps.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="mb-2 max-h-[200px] overflow-y-auto space-y-0.5 pr-1"
    >
      {steps.map((step, idx) => {
        const isActive = step.status === "running" && idx === currentStepIndex && isStreaming;
        const isDone = step.status === "done";
        const isError = step.status === "error";

        return (
          <div
            key={idx}
            className={cn(
              "flex items-center gap-1.5 py-0.5 text-[11px] leading-tight",
              isActive && "text-foreground",
              isDone && "text-muted-foreground",
              isError && "text-destructive",
              !isActive && !isDone && !isError && "text-muted-foreground/50"
            )}
          >
            {isActive ? (
              <Loader2 className="w-3 h-3 animate-spin text-primary shrink-0" />
            ) : isDone ? (
              <CheckCircle2 className="w-3 h-3 text-primary/50 shrink-0" />
            ) : isError ? (
              <XCircle className="w-3 h-3 text-destructive shrink-0" />
            ) : (
              <div className="w-3 h-3 rounded-full border border-muted-foreground/20 shrink-0" />
            )}
            <span className="truncate flex-1">{step.label}</span>
            {isActive && (
              <span className="flex items-center gap-[3px] shrink-0 ml-1">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "0ms" }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "200ms" }} />
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{ animationDelay: "400ms" }} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
