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
  AlertTriangle
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
  type: "navigate" | "click" | "type" | "screenshot" | "think" | "complete" | "error";
  content: string;
  timestamp: Date;
  screenshot?: string;
}

const roleLabels: Record<string, string> = {
  ceo: "CEO Agent",
  cmo: "CMO Agent", 
  cfo: "CFO Agent"
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
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

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
        addStep("think", "Initializing browser session...");
        
        // Refresh session to ensure we have a valid token
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          console.error("Refresh error:", refreshError);
        }
        
        // Get fresh session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw new Error(`Session error: ${sessionError.message}`);
        }
        if (!session?.access_token) {
          throw new Error("Not authenticated - please log in first");
        }
        
        console.log("Session ready, token length:", session.access_token.length);

        // Get Google token if available
        const googleToken = sessionStorage.getItem('googleProviderToken');

        // Start browser automation via edge function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/browser-agent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              role,
              task,
              timeEstimate,
              googleToken
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to start browser session');
        }

        // Stream the response
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
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') {
                setIsComplete(true);
                addStep("complete", "Task completed successfully!");
                break;
              }
              
              try {
                const data = JSON.parse(jsonStr);
                handleAgentEvent(data);
              } catch {
                // Ignore parse errors for incomplete JSON
              }
            }
          }
        }
      } catch (err) {
        console.error('Browser session error:', err);
        setError(err instanceof Error ? err.message : 'Failed to start browser session');
        setIsLoading(false);
        addStep("error", err instanceof Error ? err.message : 'Unknown error');
      }
    };

    startSession();
  }, [role, task, timeEstimate]);

  const addStep = (type: AgentStep["type"], content: string, screenshotData?: string) => {
    setSteps(prev => [...prev, {
      type,
      content,
      timestamp: new Date(),
      screenshot: screenshotData
    }]);
  };

  const handleAgentEvent = (data: any) => {
    switch (data.type) {
      case 'navigate':
        setCurrentUrl(data.url || 'unknown');
        addStep("navigate", `Navigating to ${data.url}`);
        break;
      case 'click':
        addStep("click", `Clicking: ${data.element || data.description}`);
        break;
      case 'type':
        addStep("type", `Typing: ${data.text ? data.text.slice(0, 50) + '...' : 'text'}`);
        break;
      case 'screenshot':
        if (data.image) {
          setScreenshot(`data:image/png;base64,${data.image}`);
          addStep("screenshot", "Screenshot captured", `data:image/png;base64,${data.image}`);
        }
        break;
      case 'think':
        addStep("think", data.content || data.thought);
        break;
      case 'error':
        addStep("error", data.message || 'An error occurred');
        setError(data.message);
        break;
      case 'session':
        setSessionId(data.id);
        addStep("think", `Session started: ${data.id?.slice(0, 8)}...`);
        break;
      case 'complete':
        setIsComplete(true);
        addStep("complete", data.summary || "Task completed!");
        break;
    }
  };

  const getStepIcon = (type: AgentStep["type"]) => {
    switch (type) {
      case "navigate": return <Globe className="h-3 w-3 text-blue-400" />;
      case "click": return <Hand className="h-3 w-3 text-amber-400" />;
      case "type": return <span className="text-xs text-green-400">⌨</span>;
      case "screenshot": return <span className="text-xs text-purple-400">📸</span>;
      case "think": return <Loader2 className="h-3 w-3 text-primary animate-spin" />;
      case "complete": return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "error": return <XCircle className="h-3 w-3 text-red-500" />;
    }
  };

  const getStepColor = (type: AgentStep["type"]) => {
    switch (type) {
      case "navigate": return "text-blue-400";
      case "click": return "text-amber-400";
      case "type": return "text-green-400";
      case "screenshot": return "text-purple-400";
      case "think": return "text-muted-foreground";
      case "complete": return "text-green-500";
      case "error": return "text-red-500";
    }
  };

  return (
    <div className={`h-full flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">{roleLabels[role]} Active</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Task: <span className="text-foreground">{task.slice(0, 50)}{task.length > 50 ? '...' : ''}</span>
          </div>
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
            Take Control
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
            ) : error && !screenshot ? (
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
            ) : screenshot ? (
              <img 
                src={screenshot} 
                alt="Browser view" 
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-border/50"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <Globe className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>Waiting for browser view...</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity log */}
        <div className="w-80 border-l border-border/50 flex flex-col bg-card/30">
          <div className="p-3 border-b border-border/50">
            <h3 className="font-medium text-sm">Activity Log</h3>
          </div>
          <div 
            ref={logRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs"
          >
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5">{getStepIcon(step.type)}</span>
                <div className="flex-1 min-w-0">
                  <span className={getStepColor(step.type)}>{step.content}</span>
                  <span className="text-muted-foreground/50 ml-2">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
            {steps.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                Starting agent...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
