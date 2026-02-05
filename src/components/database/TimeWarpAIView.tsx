import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  Hand,
  LogIn,
  Play,
  Pause,
  CheckCircle,
  CreditCard,
  ShieldAlert
} from "lucide-react";
import { AgentStep } from "./AgentActivityLog";
import { AgentChatMessage } from "./AgentChatMessage";
import { AgentStepView } from "./AgentStepView";
import { RemoteBrowser } from "./RemoteBrowser";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
}

interface HandoffState {
  required: boolean;
  type: "login" | "payment" | "verification" | "captcha" | "sensitive";
  instructions: string;
}

interface TimeWarpAIViewProps {
  initialTask?: {
    role: string;
    task: string;
    timeEstimate: string;
  } | null;
  onTaskConsumed?: () => void;
}

const SENSITIVE_PATTERNS = {
  login: ["login", "sign in", "log in", "signin", "oauth", "authenticate"],
  payment: ["payment", "checkout", "credit card", "billing", "pay now", "card number"],
  verification: ["2fa", "two-factor", "verify", "verification code", "otp", "authenticator"],
  captcha: ["captcha", "i'm not a robot", "security check"],
  sensitive: ["ssn", "social security", "passport", "driver's license", "bank account"]
};

export function TimeWarpAIView({ initialTask, onTaskConsumed }: TimeWarpAIViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your AI assistant. Tell me what task you'd like me to complete, and I'll handle it for you. I'll pause automatically if I need you to log in or enter sensitive information."
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isWatchLive, setIsWatchLive] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  
  // Browser session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  const agentLoopRef = useRef<boolean>(false);
  const stepNumberRef = useRef<number>(0);
  const currentTaskRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, steps]);

  // Handle initial task from research flow
  useEffect(() => {
    if (initialTask && !isAgentRunning && messages.length === 1) {
      setInputValue(initialTask.task);
      onTaskConsumed?.();
      // Auto-submit after a short delay
      setTimeout(() => {
        handleSubmit(initialTask.task);
      }, 500);
    }
  }, [initialTask]);

  const addStep = useCallback((step: Omit<AgentStep, "timestamp">) => {
    const newStep = { ...step, timestamp: new Date() };
    setSteps(prev => [...prev, newStep]);
    
    // Update the last assistant message with steps
    setMessages(prev => {
      const updated = [...prev];
      // Find last assistant message (iterate backwards)
      let lastAssistantIdx = -1;
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].role === "assistant") {
          lastAssistantIdx = i;
          break;
        }
      }
      if (lastAssistantIdx !== -1) {
        updated[lastAssistantIdx] = {
          ...updated[lastAssistantIdx],
          steps: [...(updated[lastAssistantIdx].steps || []), newStep]
        };
      }
      return updated;
    });
  }, []);

  const createBrowserSession = async (task: string): Promise<boolean> => {
    setIsCreatingSession(true);
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
            role: 'assistant',
            timeEstimate: '15min',
            action: 'create'
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create browser session');
      }

      const data = await response.json();
      setSessionId(data.sessionId);
      setConnectUrl(data.connectUrl);
      setLiveViewUrl(data.liveViewUrl);
      
      addStep({
        icon: "🎥",
        title: "Session Ready",
        message: "Browser session initialized",
        details: `Session ID: ${data.sessionId?.substring(0, 8)}...`,
        type: "status"
      });

      setIsCreatingSession(false);
      return true;
    } catch (err) {
      console.error('Session creation error:', err);
      addStep({
        icon: "❌",
        title: "Error",
        message: err instanceof Error ? err.message : 'Failed to start browser',
        type: "error"
      });
      setIsCreatingSession(false);
      return false;
    }
  };

  const detectSensitiveContent = (pageContent: string): HandoffState | null => {
    const content = pageContent.toLowerCase();
    
    for (const [type, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
      if (patterns.some(p => content.includes(p))) {
        const handoffType = type as HandoffState["type"];
        const instructions = {
          login: "Please log in to continue. I'll resume once you're authenticated.",
          payment: "This page requires payment information. Please complete the payment, then click Continue.",
          verification: "Two-factor authentication required. Please complete verification, then click Continue.",
          captcha: "Please solve the CAPTCHA, then click Continue.",
          sensitive: "This page requires sensitive personal information. Please fill it in, then click Continue."
        };
        return {
          required: true,
          type: handoffType,
          instructions: instructions[handoffType]
        };
      }
    }
    return null;
  };

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
            task: currentTaskRef.current,
            role: 'assistant',
            stepNumber: stepNumberRef.current
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Step execution failed');
      }

      const data = await response.json();
      stepNumberRef.current += 1;

      const actionIcons: Record<string, string> = {
        navigate: "🌐",
        click: "👆",
        type: "⌨️",
        scroll: "📜",
        wait: "⏳",
        login_required: "🔐",
        payment_required: "💳",
        complete: "✅",
        error: "❌"
      };

      addStep({
        icon: actionIcons[data.action?.action] || "🔄",
        title: data.action?.action?.charAt(0).toUpperCase() + data.action?.action?.slice(1) || "Action",
        message: data.result?.message || data.action?.reasoning || "Executing...",
        details: data.action?.value || data.action?.target ? `Target: ${data.action?.target || data.action?.value}` : undefined,
        type: data.action?.action === 'error' ? 'error' :
              data.action?.action === 'complete' ? 'complete' :
              data.loginRequired ? 'warning' : 'action'
      });

      // Check for login/sensitive content from backend
      if (data.loginRequired) {
        setHandoff({
          required: true,
          type: "login",
          instructions: data.loginInstructions || "Please log in to continue."
        });
        return false;
      }

      // Additional client-side detection for payment/sensitive pages
      if (data.pageContent) {
        const detected = detectSensitiveContent(data.pageContent);
        if (detected) {
          setHandoff(detected);
          addStep({
            icon: detected.type === "payment" ? "💳" : "🔐",
            title: "Manual Action Required",
            message: detected.instructions,
            type: "warning"
          });
          return false;
        }
      }

      if (data.isComplete) {
        setSummary(data.action?.reasoning || "Task completed successfully!");
        setIsComplete(true);
        return false;
      }

      return true;
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
  }, [sessionId, connectUrl, addStep]);

  const runAgentLoop = useCallback(async () => {
    if (!sessionId || !connectUrl || agentLoopRef.current) return;

    agentLoopRef.current = true;
    setIsAgentRunning(true);
    setHandoff(null);

    if (stepNumberRef.current === 0) {
      addStep({
        icon: "🤖",
        title: "Agent Started",
        message: "Beginning task execution...",
        details: currentTaskRef.current,
        type: "action"
      });
    } else {
      addStep({
        icon: "▶️",
        title: "Resumed",
        message: "Continuing after manual action...",
        type: "status"
      });
    }

    const maxSteps = 30;
    let shouldContinue = true;

    while (shouldContinue && stepNumberRef.current < maxSteps && agentLoopRef.current && !isPaused) {
      shouldContinue = await executeStep();
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
  }, [sessionId, connectUrl, executeStep, isPaused, isComplete, addStep]);

  const handleSubmit = async (taskOverride?: string) => {
    const task = taskOverride || inputValue.trim();
    if (!task) return;

    // Reset state for new task
    setSteps([]);
    setSummary(null);
    setIsComplete(false);
    setHandoff(null);
    stepNumberRef.current = 0;
    currentTaskRef.current = task;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: task
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Add assistant acknowledgment
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Got it! Starting your task now...",
      steps: []
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Create session and start
    const success = await createBrowserSession(task);
    if (success) {
      runAgentLoop();
    }
  };

  const handleContinue = () => {
    setHandoff(null);
    runAgentLoop();
  };

  const handlePause = () => {
    setIsPaused(true);
    agentLoopRef.current = false;
    addStep({
      icon: "⏸️",
      title: "Paused",
      message: "Task paused by user",
      type: "status"
    });
  };

  const handleStop = () => {
    agentLoopRef.current = false;
    setIsAgentRunning(false);
    setIsPaused(false);
    setHandoff(null);
    addStep({
      icon: "🛑",
      title: "Stopped",
      message: "Task stopped by user",
      type: "status"
    });
  };

  const handleResume = () => {
    setIsPaused(false);
    runAgentLoop();
  };

  const getHandoffIcon = () => {
    switch (handoff?.type) {
      case "payment": return <CreditCard className="h-5 w-5" />;
      case "verification": return <ShieldAlert className="h-5 w-5" />;
      default: return <LogIn className="h-5 w-5" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-card/30">
        <div className="flex items-center gap-3">
          <img 
            src="/favicon.png" 
            alt="TimeWarp" 
            className="h-8 w-8 rounded-lg object-cover"
          />
          <div>
            <h1 className="font-semibold flex items-center gap-2">
              TimeWarp AI
              <Sparkles className="h-4 w-4 text-primary" />
            </h1>
            <p className="text-xs text-muted-foreground">Your AI automation assistant</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="watch-live" className="text-sm text-muted-foreground flex items-center gap-1.5">
              {isWatchLive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Watch Live
            </Label>
            <Switch
              id="watch-live"
              checked={isWatchLive}
              onCheckedChange={setIsWatchLive}
            />
          </div>

          {/* Control buttons */}
          {isAgentRunning && !isPaused && (
            <Button variant="outline" size="sm" onClick={handlePause}>
              <Pause className="h-4 w-4 mr-1.5" />
              Pause
            </Button>
          )}
          {isPaused && (
            <Button size="sm" onClick={handleResume} className="gradient-primary">
              <Play className="h-4 w-4 mr-1.5" />
              Resume
            </Button>
          )}
          {(isAgentRunning || isPaused) && (
            <Button variant="outline" size="sm" onClick={handleStop}>
              <Hand className="h-4 w-4 mr-1.5" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat / Step view area */}
        <div className={`flex-1 flex flex-col ${isWatchLive ? 'w-1/2' : 'w-full'}`}>
          {/* Handoff banner */}
          {handoff && (
            <div className="bg-accent/10 border-b border-accent/30 p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-accent/20 text-accent">
                  {getHandoffIcon()}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-accent mb-1">
                    {handoff.type === "login" && "Login Required"}
                    {handoff.type === "payment" && "Payment Required"}
                    {handoff.type === "verification" && "Verification Required"}
                    {handoff.type === "captcha" && "CAPTCHA Required"}
                    {handoff.type === "sensitive" && "Sensitive Information Required"}
                  </h4>
                  <p className="text-sm text-muted-foreground mb-3">{handoff.instructions}</p>
                  <div className="flex items-center gap-3">
                    <Button size="sm" onClick={handleContinue} className="bg-accent hover:bg-accent/90">
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Continue After Completing
                    </Button>
                    {!isWatchLive && (
                      <Button variant="outline" size="sm" onClick={() => setIsWatchLive(true)}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        Watch Live to Complete
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    🔒 Your credentials are entered directly in the secure browser - we never see them
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Messages / Steps */}
          {!isWatchLive ? (
            // Chat view with inline steps
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-4">
                {messages.map((message) => (
                  <AgentChatMessage
                    key={message.id}
                    role={message.role}
                    content={message.content}
                    steps={message.steps}
                    isStreaming={isAgentRunning && message.id === messages[messages.length - 1]?.id}
                  />
                ))}
                
                {isComplete && summary && (
                  <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mt-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-primary mb-1">Task Completed!</h4>
                        <p className="text-sm text-muted-foreground">{summary}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          ) : (
            // Step view panel (sidebar style when watching live)
            <AgentStepView 
              steps={steps} 
              isComplete={isComplete} 
              summary={summary}
              className="flex-1"
            />
          )}

          {/* Input area */}
          <div className="p-4 border-t border-border/50 bg-card/30">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="max-w-3xl mx-auto flex gap-3"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe what you'd like me to do..."
                disabled={isAgentRunning || isCreatingSession}
                className="flex-1"
              />
              <Button 
                type="submit" 
                disabled={!inputValue.trim() || isAgentRunning || isCreatingSession}
                className="gradient-primary"
              >
                {isCreatingSession ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-2 max-w-3xl mx-auto">
              The AI will browse the web and complete tasks. It pauses automatically for logins, payments, and sensitive data.
            </p>
          </div>
        </div>

        {/* Live browser view (when toggled) */}
        {isWatchLive && (
          <div className="w-1/2 border-l border-border/50 flex flex-col">
            {/* Browser toolbar */}
            <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/30">
              <div className="flex items-center gap-1 px-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/50">
                <span className="text-xs text-muted-foreground truncate font-mono">
                  {!sessionId ? 'Waiting for session...' : 
                   handoff ? '🔐 Waiting for manual action...' : 
                   'Browserbase Live View'}
                </span>
              </div>
            </div>

            {/* Browser content */}
            <div className="flex-1 overflow-hidden">
              {!liveViewUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-muted/20">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary/50" />
                    <p className="text-sm text-muted-foreground">
                      {isCreatingSession ? 'Starting browser...' : 'Submit a task to start'}
                    </p>
                  </div>
                </div>
              ) : (
                <RemoteBrowser
                  liveViewUrl={liveViewUrl}
                  onConnectionChange={(connected) => {
                    if (connected) {
                      console.log('Live browser connected');
                    }
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
