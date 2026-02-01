import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Hand, 
  CheckCircle, 
  Lock,
  RefreshCw,
  Maximize2,
  Minimize2,
  Play,
  Pause
} from "lucide-react";
import { RemoteBrowser } from "./RemoteBrowser";
import { AgentActivityLog, AgentStep } from "./AgentActivityLog";

interface LiveBrowserViewProps {
  role: string;
  task: string;
  timeEstimate: string;
  onComplete: () => void;
  onTakeControl: () => void;
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
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState<{ index: number; total: number } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const agentLoopRef = useRef<boolean>(false);
  const stepNumberRef = useRef<number>(0);

  const roleInfo = roleLabels[role] || roleLabels.ceo;

  const addStep = useCallback((step: Omit<AgentStep, "timestamp">) => {
    setSteps(prev => [...prev, { ...step, timestamp: new Date() }]);
  }, []);

  // Create browser session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        addStep({
          icon: "🚀",
          title: "Starting",
          message: "Initializing browser session...",
          type: "status"
        });
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ 
              task, 
              role, 
              timeEstimate,
              action: 'create'
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create browser session');
        }

        const data = await response.json();
        console.log('Browserbase session created:', data);
        
        setLiveViewUrl(data.liveViewUrl);
        setSessionId(data.sessionId);
        setConnectUrl(data.connectUrl);
        setIsLoading(false);
        
        addStep({
          icon: "🎥",
          title: "Session Ready",
          message: "Browser session initialized",
          details: `Session ID: ${data.sessionId?.substring(0, 8)}...`,
          type: "status"
        });

        addStep({
          icon: "💡",
          title: "Ready to Start",
          message: "Click 'Start Agent' to begin automation",
          type: "status"
        });

      } catch (err) {
        console.error('Browser session error:', err);
        setIsLoading(false);
        addStep({
          icon: "❌",
          title: "Error",
          message: err instanceof Error ? err.message : 'Unknown error',
          type: "error"
        });
      }
    };

    createSession();
  }, [role, task, timeEstimate, addStep]);

  // Execute single agent step
  const executeStep = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !connectUrl) return false;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            action: 'execute',
            sessionId,
            connectUrl,
            task,
            role,
            stepNumber: stepNumberRef.current
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Step execution failed');
      }

      const data = await response.json();
      console.log('Step result:', data);

      stepNumberRef.current += 1;
      setCurrentStep({ index: stepNumberRef.current, total: 20 });

      // Add step to activity log
      const actionIcons: Record<string, string> = {
        navigate: "🌐",
        click: "👆",
        type: "⌨️",
        scroll: "📜",
        wait: "⏳",
        complete: "✅",
        error: "❌"
      };

      addStep({
        icon: actionIcons[data.action?.action] || "🔄",
        title: data.action?.action?.charAt(0).toUpperCase() + data.action?.action?.slice(1) || "Action",
        message: data.result?.message || data.action?.reasoning || "Executing...",
        details: data.action?.value || data.action?.target ? `Target: ${data.action?.target || data.action?.value}` : undefined,
        type: data.action?.action === 'error' ? 'error' : 
              data.action?.action === 'complete' ? 'complete' : 'action'
      });

      if (data.isComplete) {
        setSummary(data.action?.reasoning || "Task completed");
        setIsComplete(true);
        return false; // Stop the loop
      }

      return true; // Continue the loop
    } catch (err) {
      console.error('Step error:', err);
      addStep({
        icon: "❌",
        title: "Error",
        message: err instanceof Error ? err.message : 'Unknown error',
        type: "error"
      });
      return false;
    }
  }, [sessionId, connectUrl, task, role, addStep]);

  // Agent execution loop
  const runAgentLoop = useCallback(async () => {
    if (!sessionId || !connectUrl || agentLoopRef.current) return;
    
    agentLoopRef.current = true;
    setIsAgentRunning(true);
    stepNumberRef.current = 0;

    addStep({
      icon: "🤖",
      title: "Agent Started",
      message: `${roleInfo.label} is beginning the task...`,
      details: task,
      type: "action"
    });

    const maxSteps = 20;
    let shouldContinue = true;

    while (shouldContinue && stepNumberRef.current < maxSteps && agentLoopRef.current && !isPaused) {
      shouldContinue = await executeStep();
      
      // Small delay between steps to avoid overwhelming
      if (shouldContinue) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    if (stepNumberRef.current >= maxSteps && !isComplete) {
      addStep({
        icon: "⚠️",
        title: "Max Steps Reached",
        message: "Agent reached maximum step limit",
        type: "warning"
      });
    }

    setIsAgentRunning(false);
    agentLoopRef.current = false;
  }, [sessionId, connectUrl, task, roleInfo.label, addStep, executeStep, isPaused, isComplete]);

  const handleStartAgent = () => {
    if (!isAgentRunning && !isPaused) {
      runAgentLoop();
    } else if (isPaused) {
      setIsPaused(false);
      runAgentLoop();
    }
  };

  const handlePauseAgent = () => {
    setIsPaused(true);
    agentLoopRef.current = false;
    addStep({
      icon: "⏸️",
      title: "Paused",
      message: "Agent paused by user",
      type: "status"
    });
  };

  const handleStop = () => {
    agentLoopRef.current = false;
    setIsAgentRunning(false);
    setIsPaused(false);
    onTakeControl();
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
          {currentStep && (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((currentStep.index / currentStep.total) * 100, 100)}%` }}
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
          
          {!isAgentRunning && !isComplete && sessionId && (
            <Button
              size="sm"
              onClick={handleStartAgent}
              className="gradient-primary"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Agent
            </Button>
          )}
          
          {isAgentRunning && !isPaused && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseAgent}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleStop}
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
        <AgentActivityLog 
          steps={steps} 
          isComplete={isComplete} 
          summary={summary} 
        />
      </div>
    </div>
  );
}
