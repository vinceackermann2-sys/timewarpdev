import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Hand, 
  CheckCircle, 
  Globe,
  Lock,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle
} from "lucide-react";
import { RemoteBrowser } from "./RemoteBrowser";

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
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<{ index: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const roleInfo = roleLabels[role] || roleLabels.ceo;

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [steps]);

  // Start the browser automation session
  useEffect(() => {
    const startSession = async () => {
      try {
        addStep({
          icon: "🚀",
          title: "Starting",
          message: "Initializing Browserbase session...",
          type: "status"
        });
        
        // Call the run-agent edge function to create Browserbase session
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ role, task, timeEstimate })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create browser session');
        }

        const data = await response.json();
        console.log('Browserbase session created:', data);
        
        setLiveViewUrl(data.liveViewUrl);
        setCurrentUrl(data.liveViewUrl);
        setIsLoading(false);
        
        addStep({
          icon: "🎥",
          title: "Session Ready",
          message: "Browser session initialized",
          details: `Session ID: ${data.sessionId}`,
          type: "status"
        });

        // Now start the actual browser agent task
        addStep({
          icon: "🤖",
          title: "Agent Starting",
          message: `${roleInfo.label} is beginning the task...`,
          type: "action"
        });

      } catch (err) {
        console.error('Browser session error:', err);
        setError(err instanceof Error ? err.message : 'Failed to start browser session');
        setIsLoading(false);
        addStep({
          icon: "❌",
          title: "Error",
          message: err instanceof Error ? err.message : 'Unknown error',
          type: "error"
        });
      }
    };

    startSession();
  }, [role, task, timeEstimate]);

  const addStep = (step: Omit<AgentStep, "timestamp">) => {
    setSteps(prev => [...prev, { ...step, timestamp: new Date() }]);
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
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">{roleInfo.label}</span>
          </div>
          {currentStep && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(currentStep.index / currentStep.total) * 100}%` }}
                />
              </div>
              <span className="text-muted-foreground">
                Step {currentStep.index}/{currentStep.total}
              </span>
            </div>
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
            onClick={onTakeControl}
          >
            <Hand className="h-4 w-4 mr-2" />
            Stop
          </Button>
          {isComplete && (
            <Button
              size="sm"
              onClick={onComplete}
              className="gradient-primary"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
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
                {currentUrl}
              </span>
            </div>
          </div>

          {/* Browser content - using RemoteBrowser */}
          <div className="flex-1 overflow-hidden">
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
                <p className="text-sm">Starting agent...</p>
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
