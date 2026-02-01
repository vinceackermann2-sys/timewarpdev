import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Hand, 
  CheckCircle, 
  Lock,
  RefreshCw,
  Maximize2,
  Minimize2
} from "lucide-react";
import { RemoteBrowser } from "./RemoteBrowser";
import { supabase } from "@/integrations/supabase/client";

interface LiveBrowserViewProps {
  role: string;
  task: string;
  timeEstimate: string;
  onComplete: () => void;
  onTakeControl: () => void;
}

interface AgentStep {
  icon: string;
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  type: "status" | "action" | "warning" | "error" | "complete";
}

const roleLabels: Record<string, { label: string; emoji: string }> = {
  ceo: { label: "CEO Agent", emoji: "👑" },
  cmo: { label: "CMO Agent", emoji: "📣" }, 
  cfo: { label: "CFO Agent", emoji: "💵" }
};

export function LiveBrowserView({ 
  role, 
  task, 
  timeEstimate, 
  onComplete, 
  onTakeControl 
}: LiveBrowserViewProps) {
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [currentUrl, setCurrentUrl] = useState("about:blank");
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const roleInfo = roleLabels[role] || roleLabels.ceo;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [steps]);

  const addStep = useCallback((step: Omit<AgentStep, "timestamp">) => {
    setSteps(prev => [...prev, { ...step, timestamp: new Date() }]);
  }, []);

  // Start Stagehand session via Edge Function bridge to Replit
  useEffect(() => {
    const startStagehandSession = async () => {
      try {
        addStep({
          icon: "🚀",
          title: "Starting",
          message: "Connecting to Stagehand server...",
          type: "status"
        });
        
        const { data, error } = await supabase.functions.invoke('run-agent', {
          body: { task, role, timeEstimate }
        });

        if (error) {
          throw new Error(error.message || 'Failed to start Stagehand session');
        }

        console.log('Stagehand session started:', data);
        
        setLiveViewUrl(data.liveUrl || data.liveViewUrl);
        setSessionId(data.sessionId);
        setIsLoading(false);
        setIsAgentRunning(true);
        
        addStep({
          icon: "🎥",
          title: "Browser Connected",
          message: "Live browser session active",
          details: `Session: ${data.sessionId?.slice(0, 8)}...`,
          type: "status"
        });

        addStep({
          icon: "🤖",
          title: "AI Working",
          message: "Stagehand is executing your task...",
          details: task,
          type: "action"
        });

      } catch (err) {
        console.error('Stagehand session error:', err);
        setIsLoading(false);
        addStep({
          icon: "❌",
          title: "Connection Error",
          message: err instanceof Error ? err.message : 'Unknown error',
          type: "error"
        });
      }
    };

    startStagehandSession();
  }, [role, task, timeEstimate, addStep]);

  // Stagehand handles execution - just mark complete when user clicks Done
  const handleMarkComplete = () => {
    setSummary("Task execution completed by Stagehand AI agent.");
    setIsComplete(true);
    setIsAgentRunning(false);
    addStep({
      icon: "✅",
      title: "Complete",
      message: "Task finished",
      type: "complete"
    });
  };

  const handleStop = () => {
    setIsAgentRunning(false);
    onTakeControl();
  };

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
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="text-lg">{roleInfo.emoji}</span>
            {isAgentRunning && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
            <span className="text-sm font-medium text-primary">{roleInfo.label}</span>
          </div>
          {isAgentRunning && (
            <span className="text-sm text-muted-foreground animate-pulse">
              AI is working...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
          >
            <Hand className="h-4 w-4 mr-2" />
            Stop
          </Button>
          
          {isAgentRunning && !isComplete && (
            <Button
              size="sm"
              onClick={handleMarkComplete}
              className="gradient-primary"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Done
            </Button>
          )}
          
          {isComplete && (
            <Button
              size="sm"
              onClick={onComplete}
              className="gradient-primary"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Finish
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Browser view */}
        <div className="flex-1 flex flex-col bg-muted/20">
          {/* Browser toolbar */}
          <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/30">
            <div className="flex items-center gap-1 px-2">
              <div className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-accent/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/50">
              <Lock className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground truncate font-mono">
                {isLoading ? 'Initializing...' : 'Browserbase Live View'}
              </span>
            </div>
          </div>

          {/* Browser content */}
          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center bg-muted/20">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                  <p className="text-muted-foreground">Starting browser session...</p>
                </div>
              </div>
            ) : (
              <RemoteBrowser 
                liveViewUrl={liveViewUrl}
                onConnectionChange={(connected) => {
                  if (connected) {
                    addStep({
                      icon: "🎥",
                      title: "Connected",
                      message: "Live browser view connected",
                      type: "status"
                    });
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Activity log */}
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
      </div>
    </div>
  );
}
