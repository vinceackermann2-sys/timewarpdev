import { cn } from "@/lib/utils";
import { AgentStep } from "./AgentActivityLog";
import { CheckCircle, Clock, Loader2, AlertTriangle } from "lucide-react";

export interface AgentChatMessageProps {
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
  isStreaming?: boolean;
}

export function AgentChatMessage({ role, content, steps, isStreaming }: AgentChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-br-md px-5 py-3 text-sm">
          {content}
        </div>
      </div>
    );
  }

  const getStepIcon = (type: AgentStep["type"], isLast: boolean) => {
    if (isLast && type !== "complete" && type !== "error") {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;
    }
    switch (type) {
      case "complete":
        return <CheckCircle className="h-3.5 w-3.5 text-primary" />;
      case "error":
        return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-3.5 w-3.5 text-accent" />;
      default:
        return <CheckCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStepBorderColor = (type: AgentStep["type"]) => {
    switch (type) {
      case "error":
        return "border-l-destructive";
      case "warning":
        return "border-l-accent";
      case "complete":
        return "border-l-primary";
      default:
        return "border-l-border";
    }
  };

  return (
    <div className="flex justify-start">
      <div className="bg-card/80 backdrop-blur border border-border/50 max-w-[85%] rounded-2xl rounded-bl-md overflow-hidden">
        {/* Text content */}
        {content && (
          <div className="px-5 py-3 text-sm text-foreground/90">
            {content}
            {isStreaming && !steps?.length && (
              <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />
            )}
          </div>
        )}

        {/* Step nodes */}
        {steps && steps.length > 0 && (
          <div className="px-4 pb-4 pt-1 space-y-2">
            {steps.map((step, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg bg-muted/50 border-l-2",
                  getStepBorderColor(step.type)
                )}
              >
                <span className="text-base flex-shrink-0 mt-0.5">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">
                      {step.title}
                    </span>
                    {getStepIcon(step.type, idx === steps.length - 1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {step.message}
                  </p>
                  {step.details && (
                    <p className="text-xs text-muted-foreground/70 mt-1 font-mono truncate">
                      {step.details}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                  {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {!content && !steps?.length && isStreaming && (
          <div className="px-5 py-4 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Processing your request...</span>
          </div>
        )}
      </div>
    </div>
  );
}
