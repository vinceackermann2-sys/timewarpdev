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
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  ArrowRight
} from "lucide-react";
import { AgentStep } from "./AgentActivityLog";
import { AgentChatMessage } from "./AgentChatMessage";
import { AgentStepView } from "./AgentStepView";
import { RemoteBrowser } from "./RemoteBrowser";
import { cn } from "@/lib/utils";

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

interface SuggestionCard {
  id: string;
  title: string;
  description: string;
  task: string;
  gradient: string;
  icon: string;
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

// Default suggestion cards - these would be personalized based on user data
const DEFAULT_SUGGESTIONS: SuggestionCard[] = [
  {
    id: "1",
    title: "Create CRM Setup",
    description: "Set up a customer relationship management system in HubSpot",
    task: "Sign up for HubSpot and create a CRM with sales pipelines for leads, deals, and customers",
    gradient: "from-violet-500/20 to-purple-600/20",
    icon: "👥"
  },
  {
    id: "2",
    title: "Project Management",
    description: "Build a project workspace in Notion or Trello",
    task: "Create a Notion workspace with project tracking, task boards, and team documentation",
    gradient: "from-blue-500/20 to-cyan-600/20",
    icon: "📋"
  },
  {
    id: "3",
    title: "Email Campaign",
    description: "Set up email marketing in Mailchimp",
    task: "Sign up for Mailchimp and create an email newsletter template with signup form",
    gradient: "from-pink-500/20 to-rose-600/20",
    icon: "📧"
  },
  {
    id: "4",
    title: "Social Media Graphics",
    description: "Design marketing assets in Canva",
    task: "Create social media templates in Canva for Instagram, LinkedIn, and Twitter posts",
    gradient: "from-amber-500/20 to-orange-600/20",
    icon: "🎨"
  },
  {
    id: "5",
    title: "Analytics Dashboard",
    description: "Set up Google Analytics for your website",
    task: "Configure Google Analytics 4 and create a custom dashboard with key metrics",
    gradient: "from-emerald-500/20 to-green-600/20",
    icon: "📊"
  },
  {
    id: "6",
    title: "Landing Page",
    description: "Build a simple landing page on Carrd",
    task: "Create a professional landing page on Carrd with email capture and call-to-action",
    gradient: "from-indigo-500/20 to-blue-600/20",
    icon: "🌐"
  }
];

export function TimeWarpAIView({ initialTask, onTaskConsumed }: TimeWarpAIViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isWatchLive, setIsWatchLive] = useState(false);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const [suggestions] = useState<SuggestionCard[]>(DEFAULT_SUGGESTIONS);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);
  
  // Browser session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectUrl, setConnectUrl] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  const agentLoopRef = useRef<boolean>(false);
  const stepNumberRef = useRef<number>(0);
  const currentTaskRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  const visibleCards = 3;
  const maxIndex = Math.max(0, suggestions.length - visibleCards);

  // Auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, steps]);

  // Handle initial task from research flow
  useEffect(() => {
    if (initialTask && !isAgentRunning && messages.length === 0) {
      onTaskConsumed?.();
      setTimeout(() => {
        handleSubmit(initialTask.task);
      }, 500);
    }
  }, [initialTask]);

  const addStep = useCallback((step: Omit<AgentStep, "timestamp">) => {
    const newStep = { ...step, timestamp: new Date() };
    setSteps(prev => [...prev, newStep]);
    
    setMessages(prev => {
      const updated = [...prev];
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
      // Only show browser init step if watch live is enabled
      if (isWatchLive) {
        addStep({
          icon: "🚀",
          title: "Starting",
          message: "Initializing browser session...",
          type: "status"
        });
      }

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
      
      // Only show session ready step if watch live is enabled
      if (isWatchLive) {
        addStep({
          icon: "🎥",
          title: "Session Ready",
          message: "Browser session initialized",
          details: `Session ID: ${data.sessionId?.substring(0, 8)}...`,
          type: "status"
        });
      }

      setIsCreatingSession(false);
      return true;
    } catch (err) {
      console.error('Session creation error:', err);
      const errorMessage = err instanceof Error ? err.message : '';
      const isQuotaError = errorMessage.toLowerCase().includes('limit') || 
                          errorMessage.toLowerCase().includes('402') ||
                          errorMessage.toLowerCase().includes('payment');
      
      addStep({
        icon: isQuotaError ? "⚠️" : "❌",
        title: isQuotaError ? "Service Limit" : "Error",
        message: isQuotaError 
          ? "Browser automation limit reached. Please try again later or upgrade your plan."
          : (isWatchLive ? errorMessage || 'Failed to start browser session' : "Something went wrong. Please try again."),
        type: isQuotaError ? "warning" : "error"
      });
      setIsCreatingSession(false);
      setIsTaskActive(false);
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

      if (data.loginRequired) {
        setHandoff({
          required: true,
          type: "login",
          instructions: data.loginInstructions || "Please log in to continue."
        });
        return false;
      }

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
        icon: isWatchLive ? "🤖" : "✨",
        title: isWatchLive ? "Agent Started" : "Starting",
        message: isWatchLive ? "Beginning task execution..." : "Working on your task...",
        details: isWatchLive ? currentTaskRef.current : undefined,
        type: "action"
      });
    } else {
      addStep({
        icon: "▶️",
        title: isWatchLive ? "Resumed" : "Continuing",
        message: isWatchLive ? "Continuing after manual action..." : "Resuming task...",
        type: isWatchLive ? "status" : "action"
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
  }, [sessionId, connectUrl, executeStep, isPaused, isComplete, addStep, isWatchLive]);

  const handleSubmit = async (taskOverride?: string) => {
    const task = taskOverride || inputValue.trim();
    if (!task) return;

    setSteps([]);
    setSummary(null);
    setIsComplete(false);
    setHandoff(null);
    stepNumberRef.current = 0;
    currentTaskRef.current = task;
    setIsTaskActive(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: task
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Starting your task...",
      steps: []
    };
    setMessages(prev => [...prev, assistantMessage]);

    const success = await createBrowserSession(task);
    if (success) {
      runAgentLoop();
    }
  };

  const handleSuggestionClick = (suggestion: SuggestionCard) => {
    handleSubmit(suggestion.task);
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
    setIsTaskActive(false);
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

  const handleNewTask = () => {
    setIsTaskActive(false);
    setMessages([]);
    setSteps([]);
    setSummary(null);
    setIsComplete(false);
    setSessionId(null);
    setConnectUrl(null);
    setLiveViewUrl(null);
  };

  const getHandoffIcon = () => {
    switch (handoff?.type) {
      case "payment": return <CreditCard className="h-5 w-5" />;
      case "verification": return <ShieldAlert className="h-5 w-5" />;
      default: return <LogIn className="h-5 w-5" />;
    }
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (direction === "left") {
      setCarouselIndex(Math.max(0, carouselIndex - 1));
    } else {
      setCarouselIndex(Math.min(maxIndex, carouselIndex + 1));
    }
  };

  // Idle state - show floating chat and carousel
  if (!isTaskActive) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img 
              src="/favicon.png" 
              alt="TimeWarp" 
              className="h-10 w-10 rounded-xl object-cover shadow-glow"
            />
            <h1 className="text-2xl font-bold">TimeWarp AI</h1>
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm max-w-md">
            Your AI automation assistant. Describe a task and I'll handle it for you.
          </p>
        </div>

        {/* Suggestion Cards Carousel */}
        <div className="w-full max-w-4xl mb-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-sm font-medium text-muted-foreground">Suggested for you</h3>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollCarousel("left")}
                disabled={carouselIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => scrollCarousel("right")}
                disabled={carouselIndex >= maxIndex}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="overflow-hidden">
            <div 
              ref={carouselRef}
              className="flex gap-4 transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${carouselIndex * (100 / visibleCards + 1.5)}%)` }}
            >
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={cn(
                    "flex-shrink-0 w-[calc(33.333%-11px)] min-w-[200px] p-5 rounded-2xl border border-border/50",
                    "bg-gradient-to-br text-left transition-all duration-300",
                    "hover:border-primary/50 hover:shadow-glow-sm hover:scale-[1.02]",
                    "group",
                    suggestion.gradient
                  )}
                >
                  <span className="text-3xl mb-3 block">{suggestion.icon}</span>
                  <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">
                    {suggestion.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {suggestion.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Start task <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Floating Chat Input */}
        <div className="w-full max-w-2xl">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
            className="relative"
          >
            <div className="flex items-center gap-3 p-2 rounded-2xl bg-card/80 backdrop-blur border border-border/50 shadow-lg">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="What would you like me to do?"
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-base px-4"
              />
              <Button 
                type="submit" 
                size="icon"
                disabled={!inputValue.trim()}
                className="h-10 w-10 rounded-xl gradient-primary shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-3">
            I'll pause automatically for logins, payments, and sensitive information
          </p>
        </div>
      </div>
    );
  }

  // Active task state - show execution view
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
              {isAgentRunning && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
            </h1>
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {currentTaskRef.current}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex items-center gap-2">
            <Label htmlFor="watch-live" className="text-sm text-muted-foreground flex items-center gap-1.5">
              {isWatchLive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Live
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
          {isComplete && (
            <Button size="sm" onClick={handleNewTask} className="gradient-primary">
              <Sparkles className="h-4 w-4 mr-1.5" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat / Step view area */}
        <div className={cn("flex-1 flex flex-col", isWatchLive && liveViewUrl && "w-1/2")}>
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
                      Continue
                    </Button>
                    {!isWatchLive && (
                      <Button variant="outline" size="sm" onClick={() => setIsWatchLive(true)}>
                        <Eye className="h-4 w-4 mr-1.5" />
                        Watch Live
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/70 mt-2">
                    🔒 Your credentials are entered directly in the secure browser
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step Nodes View (default) */}
          <div className="flex-1 overflow-auto p-6" ref={scrollRef}>
            <div className="max-w-4xl mx-auto">
              {/* Task header */}
              <div className="mb-6 p-4 rounded-xl bg-card/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm">Current Task</h3>
                    <p className="text-sm text-muted-foreground truncate">{currentTaskRef.current}</p>
                  </div>
                  {isAgentRunning && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Running
                    </div>
                  )}
                </div>
              </div>

              {/* Live Step Nodes */}
              <div className="relative">
                {/* Connecting line */}
                {steps.length > 1 && (
                  <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent" />
                )}
                
                <div className="space-y-4">
                  {steps.map((step, idx) => {
                    const isLast = idx === steps.length - 1;
                    const isRunning = isLast && isAgentRunning && step.type !== "complete" && step.type !== "error";
                    
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "relative flex gap-4 p-4 rounded-xl border transition-all duration-500",
                          "animate-in fade-in slide-in-from-bottom-2",
                          isRunning ? "bg-primary/5 border-primary/30 shadow-glow-sm" :
                          step.type === "error" ? "bg-destructive/5 border-destructive/30" :
                          step.type === "warning" ? "bg-accent/5 border-accent/30" :
                          step.type === "complete" ? "bg-primary/5 border-primary/30" :
                          "bg-card/50 border-border/50"
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Step icon */}
                        <div className={cn(
                          "relative z-10 flex-shrink-0 h-12 w-12 rounded-xl flex items-center justify-center text-2xl",
                          isRunning ? "bg-primary/20 animate-pulse" :
                          step.type === "complete" ? "bg-primary/20" :
                          step.type === "error" ? "bg-destructive/20" :
                          step.type === "warning" ? "bg-accent/20" :
                          "bg-muted"
                        )}>
                          {step.icon}
                        </div>
                        
                        {/* Step content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{step.title}</span>
                            {isRunning && (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            )}
                            {step.type === "complete" && (
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{step.message}</p>
                          {step.details && (
                            <p className="text-xs text-muted-foreground/70 mt-1.5 font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                              {step.details}
                            </p>
                          )}
                        </div>
                        
                        {/* Timestamp */}
                        <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                          {step.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Waiting indicator */}
                  {steps.length === 0 && (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
                        <p className="text-sm text-muted-foreground">Starting task...</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Completion card */}
              {isComplete && summary && (
                <div className="mt-6 p-5 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/20">
                      <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary mb-1">Task Completed!</h4>
                      <p className="text-sm text-muted-foreground">{summary}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live browser view (only when toggled) */}
        {isWatchLive && liveViewUrl && (
          <div className="w-1/2 border-l border-border/50 flex flex-col">
            <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/30">
              <div className="flex items-center gap-1 px-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/50">
                <span className="text-xs text-muted-foreground truncate font-mono">
                  {handoff ? '🔐 Waiting for manual action...' : 'Browserbase Live View'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden">
              <RemoteBrowser
                liveViewUrl={liveViewUrl}
                onConnectionChange={(connected) => {
                  if (connected) {
                    console.log('Live browser connected');
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
