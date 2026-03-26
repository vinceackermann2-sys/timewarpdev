import { useState, useRef, useEffect, useCallback } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { 
  Loader2,
  Sparkles,
  ArrowUp,
  Telescope,
  Images,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { extractSuggestions } from "@/lib/parseSuggestions";
import { supabase } from "@/integrations/supabase/client";
import { 
  DatabaseChatMessage, 
  parseInsightCards, 
  parseSuggestions,
  type InsightCard 
} from "./DatabaseChatMessage";
import { SuggestedActions } from "./dataconversion/SuggestedActions";
import { BgGradient } from "@/components/ui/bg-gradient";
import { ConnectBusinessDNA } from "./ConnectBusinessDNA";
import { ResearchChatMessage } from "./dataconversion/ResearchChatMessage";
import { ActionChatMessage, type ActionStep, type DocumentLink } from "./dataconversion/ActionChatMessage";

type ChatMode = "research" | "generation";

interface Message {
  role: "user" | "assistant";
  content: string;
  insights?: InsightCard[];
  suggestions?: string[];
  steps?: ActionStep[];
  documentLinks?: DocumentLink[];
  isStreaming?: boolean;
}

// Parse research response
function parseResearchResponse(text: string): { content: string; suggestions: string[]; insights: InsightCard[] } {
  const suggestions: string[] = [];
  let content = text;

  const { content: suggestStripped, suggestions: parsedSuggestions } = extractSuggestions(text);
  content = suggestStripped;
  suggestions.push(...parsedSuggestions);

  const { content: cleanContent, insights } = parseInsightCards(content);

  return { content: cleanContent, suggestions: suggestions.slice(0, 3), insights };
}

// Parse action/generation response
function parseGenerationResponse(text: string): {
  steps: ActionStep[];
  content: string;
  documentLinks: DocumentLink[];
  suggestions: string[];
} {
  const steps: ActionStep[] = [];
  const documentLinks: DocumentLink[] = [];
  const suggestions: string[] = [];
  let content = text;

  const stepMap = new Map<string, ActionStep>();
  const stepRegex = /\[STEP:([^:]+):([^:]+):([^\]]+)\]/g;
  let match;
  while ((match = stepRegex.exec(text)) !== null) {
    stepMap.set(match[2], {
      icon: match[1],
      label: match[2],
      status: match[3] as ActionStep["status"],
    });
  }
  steps.push(...stepMap.values());
  content = content.replace(stepRegex, "");

  const docRegex = /\[DOC:([^|]+)\|([^|]+)\|([^|\]]+)(?:\|([^\]]*))?\]/g;
  while ((match = docRegex.exec(text)) !== null) {
    documentLinks.push({
      type: match[1] as DocumentLink["type"],
      title: match[2],
      url: match[3],
      previewText: match[4] || undefined,
    });
  }
  content = content.replace(docRegex, "");

  const { content: suggestStripped2, suggestions: parsedSuggestions2 } = extractSuggestions(content);
  content = suggestStripped2;
  suggestions.push(...parsedSuggestions2);
  content = content.trim().replace(/\n{3,}/g, "\n\n");

  return { steps, content, documentLinks, suggestions: suggestions.slice(0, 3) };
}

// Module-level cache for chat messages across view switches
let _cachedChatMessages: { research: Message[]; generation: Message[] } = { research: [], generation: [] };
let _cachedHasConnected: boolean | null = null;

export function DatabaseView() {
  const [messages, setMessages] = useState<Message[]>(() => _cachedChatMessages["research"]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasConnected, setHasConnected] = useState(_cachedHasConnected ?? false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(_cachedHasConnected === null);
  const [chatMode, setChatMode] = useState<ChatMode>("research");
  const [showModeSelector, setShowModeSelector] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const modeSelectorRef = useRef<HTMLDivElement>(null);
  const { checkCanUseAction } = useActionGate();

  // Check DB for existing connections — skip if already cached
  useEffect(() => {
    if (_cachedHasConnected !== null) return;

    const checkConnections = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const hasOAuthReturn = params.get("oauth_success") || params.get("oauth_error");

        if (hasOAuthReturn) {
          setIsCheckingConnection(false);
          return;
        }

        const dismissed = sessionStorage.getItem("businessDnaDismissed");
        if (dismissed === "true") {
          setHasConnected(true);
          _cachedHasConnected = true;
          setIsCheckingConnection(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsCheckingConnection(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('user_connections')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'connected')
          .limit(1);

        // Don't auto-skip — let user explicitly dismiss
      } catch (err) {
        console.error("Failed to check connections:", err);
      }
      setIsCheckingConnection(false);
    };

    checkConnections();
  }, []);

  // Sync messages to module-level cache
  useEffect(() => {
    _cachedChatMessages[chatMode] = messages.filter((m: any) => !m.isStreaming);
  }, [messages, chatMode]);

  // Loading data check
  useEffect(() => {
    const timer = setTimeout(() => setIsLoadingData(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  // Close mode selector on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(e.target as Node)) {
        setShowModeSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cachedContextsRef = useRef<any[] | null>(null);
  const cachedContextsTimeRef = useRef<number>(0);
  const CONTEXT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const buildContexts = useCallback(async () => {
    // Return cached result if fresh
    if (cachedContextsRef.current && Date.now() - cachedContextsTimeRef.current < CONTEXT_CACHE_TTL) {
      return cachedContextsRef.current;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return [];

    const workspaceId = localStorage.getItem("preferred_workspace_id");

    let query = (supabase as any)
      .from('user_business_data')
      .select('data_type, title, content, analyzed_content, metadata, is_analyzed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    } else {
      query = query.eq('user_id', session.user.id);
    }

    const { data: bizData, error } = await query;

    let result: any[] = [];
    if (!error && bizData && bizData.length > 0) {
      result = [{
        type: "business-db",
        label: "Business Data",
        content: {
          total_items: bizData.length,
          items: bizData.map((item: any) => ({
            type: item.data_type,
            title: item.title,
            content: item.content?.slice(0, 500),
            analysis: item.analyzed_content?.slice(0, 500),
          })),
        }
      }];
    }

    cachedContextsRef.current = result;
    cachedContextsTimeRef.current = Date.now();
    return result;
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;
    if (!checkCanUseAction()) return;

    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "Please log in to use the AI assistant."
        }]);
        setIsLoading(false);
        return;
      }

      const connectedContexts = await buildContexts();
      const endpoint = chatMode === "research" ? "research-chat" : "action-chat";

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content,
            })),
            connectedContexts,
            workspaceId: localStorage.getItem("preferred_workspace_id") || undefined,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 403) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || "Action limit reached. Upgrade your plan for more Actions.");
        }
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let fullResponse = "";
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "",
        isStreaming: true,
      }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const json = JSON.parse(line.slice(6));
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                fullResponse += delta;

                if (chatMode === "research") {
                  const parsed = parseResearchResponse(fullResponse);
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: parsed.content,
                      suggestions: parsed.suggestions,
                      insights: parsed.insights,
                      isStreaming: true,
                    };
                    return newMessages;
                  });
                } else {
                  const parsed = parseGenerationResponse(fullResponse);
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: parsed.content,
                      steps: parsed.steps,
                      documentLinks: parsed.documentLinks,
                      suggestions: parsed.suggestions,
                      isStreaming: true,
                    };
                    return newMessages;
                  });
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      // Final parse
      if (chatMode === "research") {
        const finalParsed = parseResearchResponse(fullResponse);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: finalParsed.content,
            suggestions: finalParsed.suggestions,
            insights: finalParsed.insights,
            isStreaming: false,
          };
          return newMessages;
        });
      } else {
        const finalParsed = parseGenerationResponse(fullResponse);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: finalParsed.content,
            steps: finalParsed.steps,
            documentLinks: finalParsed.documentLinks,
            suggestions: finalParsed.suggestions,
            isStreaming: false,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I couldn't process your request. Please try again.",
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, messages, isLoading, chatMode, buildContexts]);

  const handleSendMessage = () => {
    if (inputValue.trim()) sendMessage(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleConnectComplete = () => {
    sessionStorage.setItem("businessDnaDismissed", "true");
    setHasConnected(true);
    _cachedHasConnected = true;
  };

  const handleModeSwitch = (mode: ChatMode) => {
    if (mode !== chatMode) {
      // Save current messages before switching
      _cachedChatMessages[chatMode] = messages.filter((m: any) => !m.isStreaming);
      setChatMode(mode);
      setMessages(_cachedChatMessages[mode]);
    }
    setShowModeSelector(false);
  };

  // Get last message suggestions
  const lastMsg = messages.filter(m => m.role === "assistant" && !m.isStreaming).slice(-1)[0];
  const currentSuggestions = lastMsg?.suggestions || [];

  if (isCheckingConnection) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasConnected) {
    return <ConnectBusinessDNA onComplete={handleConnectComplete} />;
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      <BgGradient
        gradientFrom="hsl(var(--background))"
        gradientTo="hsl(var(--primary) / 0.3)"
        gradientSize="150% 60%"
        gradientPosition="50% 100%"
        gradientStop="70%"
        className="z-0"
      />

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Chat messages */}
        {messages.length > 0 ? (
          <div className="flex-1 min-h-0 px-8 pt-6">
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="max-w-3xl mx-auto space-y-4 pb-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex animate-fade-in",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {chatMode === "research" ? (
                      <ResearchChatMessage
                        role={message.role}
                        content={message.content}
                        insightCards={message.insights}
                        isStreaming={message.isStreaming}
                      />
                    ) : (
                      <ActionChatMessage
                        role={message.role}
                        content={message.content}
                        steps={message.steps}
                        documentLinks={message.documentLinks}
                        isStreaming={message.isStreaming}
                      />
                    )}
                  </div>
                ))}
                {/* Suggested actions */}
                {!isLoading && currentSuggestions.length > 0 && (
                  <div className="pt-2">
                    <SuggestedActions
                      suggestions={currentSuggestions}
                      onSelect={(suggestion) => sendMessage(suggestion)}
                      isLoading={isLoading}
                    />
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-5">
                {chatMode === "research" ? (
                  <Telescope className="h-7 w-7 text-primary" />
                ) : (
                  <Images className="h-7 w-7 text-primary" />
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-light mb-3">
                {chatMode === "research" ? (
                  <>Your <span className="italic text-primary font-normal">Research</span> Assistant</>
                ) : (
                  <>Your <span className="italic text-primary font-normal">Generation</span> Assistant</>
                )}
              </h1>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {chatMode === "research"
                  ? "Ask questions about your business data and get personalized insights"
                  : "Generate content, draft emails, create documents from your business data"
                }
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating chat input with mode switcher */}
      <div className="relative z-20 p-6 pt-0">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-center glass-portal rounded-full shadow-glow">
            {/* Mode indicator / toggle */}
            <div className="relative" ref={modeSelectorRef}>
              <button
                onClick={() => setShowModeSelector(!showModeSelector)}
                className={cn(
                  "absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all z-10",
                  chatMode === "research"
                    ? "bg-primary/15 text-primary hover:bg-primary/25"
                    : "bg-accent/15 text-accent-foreground hover:bg-accent/25"
                )}
              >
                {chatMode === "research" ? (
                  <Telescope className="h-3.5 w-3.5" />
                ) : (
                  <Images className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">
                  {chatMode === "research" ? "Research" : "Generation"}
                </span>
              </button>

              {/* Mode selector dropdown */}
              {showModeSelector && (
                <div className="absolute left-3 bottom-full mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px] z-50">
                  <button
                    onClick={() => handleModeSwitch("research")}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                      chatMode === "research"
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      chatMode === "research" ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Telescope className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Research</p>
                      <p className="text-xs text-muted-foreground">Analyze your data</p>
                    </div>
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={() => handleModeSwitch("generation")}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors",
                      chatMode === "generation"
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center",
                      chatMode === "generation" ? "bg-primary/20" : "bg-muted"
                    )}>
                      <Images className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Generation</p>
                      <p className="text-xs text-muted-foreground">Generate content</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatMode === "research" ? "Ask about your business data..." : "Generate content from your data..."}
              className="w-full pl-[120px] sm:pl-[140px] pr-16 py-7 rounded-full bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-3 h-11 w-11 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5 text-primary-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
