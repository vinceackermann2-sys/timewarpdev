import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Loader2, 
  Hand, 
  CheckCircle, 
  XCircle, 
  Globe,
  Lock,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";
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
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<{ index: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
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
          message: "Initializing browser session...",
          type: "status"
        });
        
        // Refresh session
        await supabase.auth.refreshSession();
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session?.access_token) {
          throw new Error("Not authenticated - please log in first");
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/browser-agent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ role, task, timeEstimate })
          }
        );

        if (!response.ok) {
          let message = 'Failed to start browser session';
          try {
            const errorData = await response.json();
            message = errorData?.details
              ? `${errorData.error || message}: ${errorData.details}`
              : (errorData?.error || message);
          } catch {
            try {
              const text = await response.text();
              if (text) message = text;
            } catch { /* ignore */ }
          }
          throw new Error(message);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response stream');
        }

        setIsLoading(false);

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') {
                setIsComplete(true);
                break;
              }
              
              try {
                const data = JSON.parse(jsonStr);
                handleAgentEvent(data);
              } catch { /* ignore parse errors */ }
            }
          }
        }
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

  const handleAgentEvent = (data: any) => {
    switch (data.type) {
      case 'status':
      case 'action':
        addStep({
          icon: data.icon || "•",
          title: data.title || data.type,
          message: data.message,
          details: data.details,
          type: data.type as "status" | "action"
        });
        // Update URL if action is navigate
        if (data.details?.startsWith('http')) {
          setCurrentUrl(data.details);
        }
        break;
        
      case 'navigate':
        setCurrentUrl(data.url || 'unknown');
        break;
        
      case 'step':
        setCurrentStep({ index: data.index, total: data.total });
        break;
        
      case 'screenshot':
        if (data.image) {
          setScreenshot(`data:image/jpeg;base64,${data.image}`);
        }
        break;
        
      case 'warning':
        addStep({
          icon: data.icon || "⚠️",
          title: data.title || "Warning",
          message: data.message,
          type: "warning"
        });
        break;
        
      case 'error':
        addStep({
          icon: data.icon || "❌",
          title: data.title || "Error",
          message: data.message,
          type: "error"
        });
        setError(data.message);
        break;
        
      case 'session':
        if (data.liveUrl) {
          setLiveUrl(data.liveUrl);
        }
        break;
        
      case 'liveUrl':
        setLiveUrl(data.url);
        addStep({
          icon: "🎥",
          title: "Live View Ready",
          message: "Interactive browser session available",
          type: "status"
        });
        break;
        
      case 'complete':
        setIsComplete(true);
        setSummary(data.summary);
        if (data.liveUrl && !liveUrl) {
          setLiveUrl(data.liveUrl);
        }
        addStep({
          icon: data.icon || "✅",
          title: data.title || "Complete",
          message: data.summary || "Task completed!",
          type: "complete"
        });
        break;
    }
  };

  const getStepColor = (type: AgentStep["type"]) => {
    switch (type) {
      case "status": return "text-blue-400";
      case "action": return "text-primary";
      case "warning": return "text-amber-400";
      case "error": return "text-red-400";
      case "complete": return "text-green-400";
    }
  };

  const openLiveUrlInNewTab = () => {
    if (liveUrl) {
      window.open(liveUrl, '_blank', 'noopener,noreferrer');
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
          {liveUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={openLiveUrlInNewTab}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Open Live View
            </Button>
          )}
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
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/50">
              <Lock className="h-3 w-3 text-green-500" />
              <span className="text-xs text-muted-foreground truncate font-mono">
                {currentUrl}
              </span>
            </div>
          </div>

          {/* Browser content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {isLoading ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">Starting browser session...</p>
              </div>
            ) : error && !screenshot && !liveUrl ? (
              <Card className="p-8 max-w-md text-center space-y-4">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg">Connection Issue</h3>
                  <p className="text-sm text-muted-foreground mt-2">{error}</p>
                </div>
                <Button variant="outline" onClick={onTakeControl}>
                  Return to Task Setup
                </Button>
              </Card>
            ) : liveUrl ? (
              <div className="w-full h-full flex flex-col">
                <iframe 
                  src={liveUrl} 
                  className="w-full h-full rounded-lg border border-border/50"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="Live Browser View"
                />
                <p className="text-xs text-center text-muted-foreground mt-2">
                  🎥 Live interactive session — click and type directly
                </p>
              </div>
            ) : screenshot ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <img 
                  src={screenshot} 
                  alt="Browser view" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-border/50"
                />
                <p className="text-xs text-center text-muted-foreground mt-2">
                  📸 Screenshot view — updates after each action
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Waiting for browser view...</p>
              </div>
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
                  step.type === 'error' ? 'bg-red-500/10 border-red-500/20' :
                  step.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                  step.type === 'complete' ? 'bg-green-500/10 border-green-500/20' :
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
            <div className="p-4 border-t border-border/50 bg-green-500/5">
              <h4 className="font-medium text-sm text-green-400 mb-2">✅ Summary</h4>
              <p className="text-sm text-muted-foreground">{summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
