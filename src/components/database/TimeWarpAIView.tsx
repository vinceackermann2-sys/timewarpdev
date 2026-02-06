import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Send, 
  Sparkles, 
  Eye, 
  EyeOff, 
  Loader2, 
  Hand,
  LogIn,
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

// Default suggestion cards
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
  const [isTaskRunning, setIsTaskRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<HandoffState | null>(null);
  const [suggestions] = useState<SuggestionCard[]>(DEFAULT_SUGGESTIONS);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isTaskActive, setIsTaskActive] = useState(false);
  
  // Browser session state — single session, no polling
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
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
    if (initialTask && !isTaskRunning && messages.length === 0) {
      onTaskConsumed?.();
      setTimeout(() => {
        handleSubmit(initialTask.task);
      }, 500);
    }
  }, [initialTask]);

  const addStep = useCallback((step: Omit<AgentStep, "timestamp">) => {
    const newStep = { ...step, timestamp: new Date() };
    setSteps(prev => [...prev, newStep]);
    
    // Also update the last assistant message with this step
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

  /**
   * Create a browser session via the run-browser-task edge function.
   * Browserbase handles all automation (Stagehand + Playwright).
   * We just get back a sessionId + iframeUrl for live viewing.
   */
  const startBrowserTask = async (task: string): Promise<boolean> => {
    setIsCreatingSession(true);
    try {
      addStep({
        icon: "🚀",
        title: "Starting",
        message: "Creating browser automation session...",
        type: "status"
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-browser-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            task,
            businessContext: {
              companyName: "User's Business",
              industry: "General",
              tools: ["Web Browser"],
              goal: task,
            },
            userContext: {
              userId: "anonymous",
              role: "assistant",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to start browser task");
      }

      const data = await response.json();
      console.log("[TimeWarpAI] Browser task started:", data);

      setSessionId(data.sessionId);
      setIframeUrl(data.iframeUrl);
      setIsCreatingSession(false);

      addStep({
        icon: "🤖",
        title: "Agent Running",
        message: "Browser automation is executing your task autonomously",
        details: `Session: ${data.sessionId?.substring(0, 8)}...`,
        type: "action"
      });

      addStep({
        icon: "👁️",
        title: "Live View Available",
        message: "Toggle 'Watch Live' to see the browser in real-time",
        type: "status"
      });

      return true;
    } catch (err) {
      console.error("[TimeWarpAI] Task start error:", err);
      const errorMessage = err instanceof Error ? err.message : "";
      const isQuotaError =
        errorMessage.toLowerCase().includes("limit") ||
        errorMessage.toLowerCase().includes("402") ||
        errorMessage.toLowerCase().includes("payment");

      addStep({
        icon: isQuotaError ? "⚠️" : "❌",
        title: isQuotaError ? "Service Limit" : "Error",
        message: isQuotaError
          ? "Browser automation limit reached. Please try again later or upgrade your plan."
          : errorMessage || "Failed to start browser task",
        type: isQuotaError ? "warning" : "error",
      });
      setIsCreatingSession(false);
      setIsTaskActive(false);
      return false;
    }
  };

  const handleSubmit = async (taskOverride?: string) => {
    const task = taskOverride || inputValue.trim();
    if (!task) return;

    // Reset state
    setSteps([]);
    setSummary(null);
    setIsComplete(false);
    setHandoff(null);
    setSessionId(null);
    setIframeUrl(null);
    setIsTaskActive(true);
    setIsTaskRunning(true);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: task,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Starting your task...",
      steps: [],
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Single call — Browserbase handles everything
    const success = await startBrowserTask(task);
    if (!success) {
      setIsTaskRunning(false);
    }
  };

  const handleSuggestionClick = (suggestion: SuggestionCard) => {
    handleSubmit(suggestion.task);
  };

  const handleStop = () => {
    setIsTaskRunning(false);
    setIsTaskActive(false);
    setHandoff(null);
    addStep({
      icon: "🛑",
      title: "Stopped",
      message: "Task stopped by user",
      type: "status",
    });
  };

  const handleNewTask = () => {
    setIsTaskActive(false);
    setIsTaskRunning(false);
    setMessages([]);
    setSteps([]);
    setSummary(null);
    setIsComplete(false);
    setSessionId(null);
    setIframeUrl(null);
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

  // ========== IDLE STATE — show suggestions + chat input ==========
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
                placeholder="Describe a task... e.g. 'Set up a Trello board for my project'"
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!inputValue.trim()}
                className="rounded-xl h-10 w-10 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ========== ACTIVE TASK STATE ==========
  return (
    <div className="h-full flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            {isTaskRunning && <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
            <span className="text-sm font-medium text-primary">TimeWarp AI</span>
          </div>

          {/* Watch Live toggle */}
          {iframeUrl && (
            <div className="flex items-center gap-2 ml-2">
              <Switch
                id="watch-live"
                checked={isWatchLive}
                onCheckedChange={setIsWatchLive}
              />
              <Label htmlFor="watch-live" className="text-xs flex items-center gap-1.5 cursor-pointer">
                {isWatchLive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                Watch Live
              </Label>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isTaskRunning && (
            <Button variant="outline" size="sm" onClick={handleStop}>
              <Hand className="h-4 w-4 mr-2" />
              Stop
            </Button>
          )}
          {!isTaskRunning && (
            <Button variant="outline" size="sm" onClick={handleNewTask}>
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Handoff Banner */}
      {handoff?.required && (
        <div className="bg-status-warning/10 border-b border-status-warning/30 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-status-warning/20 text-status-warning">
              {getHandoffIcon()}
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-status-warning mb-1">Manual Action Required</h4>
              <p className="text-sm text-muted-foreground">{handoff.instructions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat / Step View panel */}
        <div className="flex-1 flex flex-col">
          {/* Messages / Steps */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <AgentChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                steps={msg.steps}
                isStreaming={isTaskRunning && msg.role === "assistant"}
              />
            ))}
          </div>

          {/* Input bar */}
          <div className="p-3 border-t border-border/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!isTaskRunning) handleSubmit();
              }}
              className="flex items-center gap-2"
            >
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isTaskRunning ? "Task is running..." : "Describe another task..."}
                disabled={isTaskRunning}
                className="flex-1 text-sm"
              />
              <Button
                type="submit"
                size="icon"
                disabled={isTaskRunning || !inputValue.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>

        {/* Live Browser View — only shown when Watch Live is on */}
        {isWatchLive && iframeUrl && (
          <div className="w-1/2 border-l border-border/50 flex flex-col bg-muted/20">
            {/* Browser toolbar */}
            <div className="flex items-center gap-2 p-2 border-b border-border/50 bg-card/30">
              <div className="flex items-center gap-1 px-2">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent/80" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/80" />
              </div>
              <div className="flex-1 flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50 border border-border/50">
                <span className="text-xs text-muted-foreground truncate font-mono">
                  Browserbase Live View
                </span>
                {isTaskRunning && <Loader2 className="h-3 w-3 animate-spin text-primary ml-auto" />}
              </div>
            </div>

            {/* Iframe — Browserbase live session */}
            <div className="flex-1 overflow-hidden">
              <RemoteBrowser
                liveViewUrl={iframeUrl}
                onConnectionChange={(connected) => {
                  if (connected) {
                    addStep({
                      icon: "🎥",
                      title: "Connected",
                      message: "Live browser view connected",
                      type: "status",
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Step View — shown when Watch Live is off */}
        {!isWatchLive && steps.length > 0 && (
          <div className="w-80 border-l border-border/50">
            <AgentStepView
              steps={steps}
              isComplete={isComplete}
              summary={summary}
            />
          </div>
        )}
      </div>
    </div>
  );
}
