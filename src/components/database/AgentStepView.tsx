import { useRef, useEffect } from "react";
import { AgentStep } from "./AgentActivityLog";
import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, AlertTriangle, Clock } from "lucide-react";

interface AgentStepViewProps {
  steps: AgentStep[];
  isComplete: boolean;
  summary: string | null;
  className?: string;
}

export function AgentStepView({ steps, isComplete, summary, className }: AgentStepViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [steps]);

  const getStepStatus = (step: AgentStep, isLast: boolean) => {
    if (step.type === "complete") return "complete";
    if (step.type === "error") return "error";
    if (step.type === "warning") return "warning";
    if (isLast) return "running";
    return "done";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle className="h-4 w-4 text-primary" />;
      case "error":
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-accent" />;
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      default:
        return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCardStyle = (status: string) => {
    switch (status) {
      case "error":
        return "bg-destructive/10 border-destructive/30";
      case "warning":
        return "bg-accent/10 border-accent/30";
      case "complete":
        return "bg-primary/10 border-primary/30";
      case "running":
        return "bg-card border-primary/50 shadow-glow-sm";
      default:
        return "bg-card/50 border-border/50";
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Task Progress
        </h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {steps.length} steps
        </span>
      </div>

      {/* Steps */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {steps.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary/50" />
              <p className="text-sm">Waiting to start...</p>
            </div>
          </div>
        ) : (
          steps.map((step, idx) => {
            const status = getStepStatus(step, idx === steps.length - 1 && !isComplete);
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-xl border p-4 transition-all duration-300",
                  getCardStyle(status)
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl flex-shrink-0">{step.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{step.title}</span>
                        {getStatusIcon(status)}
                      </div>
                      <span className="text-xs text-muted-foreground/60">
                        {step.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.message}</p>
                    {step.details && (
                      <p className="text-xs text-muted-foreground/70 mt-2 font-mono bg-muted/50 px-2 py-1 rounded truncate">
                        {step.details}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary */}
      {isComplete && summary && (
        <div className="p-4 border-t border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm text-primary mb-1">Task Completed</h4>
              <p className="text-sm text-muted-foreground">{summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
