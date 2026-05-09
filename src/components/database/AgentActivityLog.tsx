import { useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

export interface AgentStep {
  icon: string;
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  type: "status" | "action" | "warning" | "error" | "complete";
}

interface AgentActivityLogProps {
  steps: AgentStep[];
  isComplete: boolean;
  summary: string | null;
}

export function AgentActivityLog({ steps, isComplete, summary }: AgentActivityLogProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [steps]);

  const getStepColor = (type: AgentStep["type"]) => {
    switch (type) {
      case "status": return "text-muted-foreground";
      case "action": return "text-foreground";
      case "warning": return "text-foreground";
      case "error": return "text-destructive";
      case "complete": return "text-primary";
    }
  };

  return (
    <div className="w-96 border-l border-border/50 flex flex-col bg-card/30">
      <div className="p-3 border-b border-border/50 flex items-center justify-between">
        <h3 className="font-medium text-sm">Activity Log</h3>
        <span className="text-xs text-muted-foreground">{steps.length} events</span>
      </div>
      <div 
        ref={logRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {steps.map((step, i) => (
          <div 
            key={i} 
            className={`rounded-lg p-3 border ${
              step.type === 'error' ? 'bg-destructive/10 border-destructive/20' :
              step.type === 'warning' ? 'bg-accent/10 border-accent/20' :
              step.type === 'complete' ? 'bg-primary/10 border-primary/20' :
              'bg-card/50 border-border/50'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">{step.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-medium text-sm ${getStepColor(step.type)}`}>
                    {step.title}
                  </span>
                  <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                    {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{step.message}</p>
                {step.details && (
                  <p className="text-xs text-muted-foreground/70 mt-1 font-mono truncate">
                    {step.details}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
        {steps.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Initializing...</p>
          </div>
        )}
      </div>
      
      {/* Summary section */}
      {isComplete && summary && (
        <div className="p-4 border-t border-border/50 bg-primary/5">
          <h4 className="font-medium text-sm text-primary mb-2">✅ Summary</h4>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      )}
    </div>
  );
}
