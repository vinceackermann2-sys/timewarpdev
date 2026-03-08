import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Telescope, ArrowUp, X, Database, FileText, Type, Image, Globe, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractSuggestions } from "@/lib/parseSuggestions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { SuggestedActions } from "./SuggestedActions";
import { ResearchChatMessage, parseInsightCards, InsightCard } from "./ResearchChatMessage";
import { useWhiteboardChatHistory } from "@/hooks/useWhiteboardChatHistory";
import type { CanvasNode, Connection } from "./types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  insightCards?: InsightCard[];
  isStreaming?: boolean;
}

interface ConnectedContext {
  type: string;
  label: string;
  isAnalyzed?: boolean;
  content: any;
}

interface ResearchChatNodeProps {
  node: CanvasNode;
  connections: Connection[];
  connectedNodes: CanvasNode[];
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onClose: () => void;
}

// Parse suggestions and insights from response
function parseResponse(text: string): { content: string; suggestions: string[]; insights: InsightCard[] } {
  const { content: stripped, suggestions } = extractSuggestions(text);
  
  // Parse insight cards
  const { content: cleanContent, insights } = parseInsightCards(stripped);
  
  return { content: cleanContent, suggestions, insights };
}

export function ResearchChatNode({
  node,
  connections,
  connectedNodes,
  isSelected,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onClose,
}: ResearchChatNodeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(`chat_history_${node.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Persist chat history
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_history_${node.id}`, JSON.stringify(messages.filter(m => !m.isStreaming)));
    }
  }, [messages, node.id]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectedContexts, setConnectedContexts] = useState<ConnectedContext[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  // Get connected data sources
  const inputConnections = connections.filter(c => c.toNodeId === node.id);
  const connectedDataSources = inputConnections
    .map(c => connectedNodes.find(n => n.id === c.fromNodeId))
    .filter(Boolean);

  // Build context from all connected nodes - use analyzed content when available
  useEffect(() => {
    const buildContexts = async () => {
      if (connectedDataSources.length === 0) {
        setConnectedContexts([]);
        return;
      }

      setIsLoadingData(true);
      const contexts: ConnectedContext[] = [];

      for (const source of connectedDataSources) {
        if (!source) continue;

        try {
          switch (source.type) {
            case "business-db": {
              // Fetch all user business data from DB
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
              const wsId = localStorage.getItem("preferred_workspace_id");
                let query = (supabase as any)
                  .from('user_business_data')
                  .select('data_type, title, content, analyzed_content, metadata, is_analyzed');
                if (wsId) {
                  query = query.eq('workspace_id', wsId);
                } else {
                  query = query.eq('user_id', session.user.id);
                }
                const { data: bizData, error } = await query
                  .order('created_at', { ascending: false })
                  .limit(50);

                if (!error && bizData && bizData.length > 0) {
                  contexts.push({
                    type: "business-db",
                    label: source.label,
                    content: {
                      total_items: bizData.length,
                      items: bizData.map((item: any) => ({
                        type: item.data_type,
                        title: item.title,
                        content: item.content?.slice(0, 500),
                        analysis: item.analyzed_content?.slice(0, 500),
                      })),
                    }
                  });
                }
              }
              break;
            }
            case "text": {
              if (source.textContent) {
                contexts.push({
                  type: "text",
                  label: source.label,
                  isAnalyzed: !!source.analyzedContent,
                  content: { 
                    text: source.textContent,
                    analysis: source.analyzedContent
                  }
                });
              }
              break;
            }
            case "document": {
              if (source.documentName) {
                contexts.push({
                  type: "document",
                  label: source.label,
                  isAnalyzed: !!source.analyzedContent,
                  content: { 
                    name: source.documentName,
                    extractedText: source.documentContent,
                    analysis: source.analyzedContent
                  }
                });
              }
              break;
            }
            case "image": {
              if (source.imageUrl) {
                contexts.push({
                  type: "image",
                  label: source.label,
                  isAnalyzed: !!source.analyzedContent,
                  content: { 
                    url: source.imageUrl,
                    analysis: source.analyzedContent
                  }
                });
              }
              break;
            }
            case "website": {
              if (source.websiteUrl) {
                contexts.push({
                  type: "website",
                  label: source.label,
                  isAnalyzed: !!source.analyzedContent,
                  content: { 
                    url: source.websiteUrl,
                    title: source.websiteTitle,
                    analysis: source.analyzedContent
                  }
                });
              }
              break;
            }
          }
        } catch (err) {
          console.error(`Failed to build context for ${source.type}:`, err);
        }
      }

      setConnectedContexts(contexts);
      setIsLoadingData(false);
    };

    buildContexts();
  }, [connectedDataSources.map(n => `${n?.id}-${n?.textContent}-${n?.documentUrl}-${n?.imageUrl}-${n?.websiteUrl}-${n?.analyzedContent}-${n?.isAnalyzed}`).join(",")]);

  const handleSend = useCallback(async (messageOverride?: string) => {
    const messageToSend = messageOverride || input.trim();
    if (!messageToSend || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: messageToSend }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: messageToSend }],
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

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";

      if (reader) {
        setMessages(prev => [...prev, { role: "assistant", content: "", isStreaming: true }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.choices?.[0]?.delta?.content;
                if (content) {
                  assistantMessage += content;
                  const parsed = parseResponse(assistantMessage);
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: parsed.content,
                      suggestions: parsed.suggestions,
                      insightCards: parsed.insights,
                      isStreaming: true,
                    };
                    return newMessages;
                  });
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Final parse
        const finalParsed = parseResponse(assistantMessage);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: finalParsed.content,
            suggestions: finalParsed.suggestions,
            insightCards: finalParsed.insights,
            isStreaming: false,
          };
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, connectedContexts, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Prevent wheel events from propagating to canvas (stops zoom when scrolling chat)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  // Get the last assistant message for suggestions
  const lastAssistantMessage = messages.filter(m => m.role === "assistant").slice(-1)[0];

  const chatContent = (
    <>
      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[100]" 
          onClick={() => setIsFullscreen(false)}
        />
      )}
      <div
        className={cn(
          "bg-card border rounded-xl shadow-xl flex flex-col select-none transition-all duration-200",
          isSelected && !isFullscreen ? "border-primary ring-2 ring-primary/30" : "border-border",
          isFullscreen ? "fixed inset-0 z-[101] rounded-none" : "absolute canvas-node-smooth"
        )}
        style={isFullscreen ? {} : {
          left: node.x,
          top: node.y,
          width: 540,
          height: 480,
        }}
        onMouseDown={isFullscreen ? undefined : onMouseDown}
        onWheel={handleWheel}
      >
      {/* Input port (centered on left edge of card) - hidden in fullscreen */}
      {!isFullscreen && (
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-primary cursor-crosshair transition-all z-20 hover:scale-125"
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={onInputPortMouseUp}
        />
      )}

      {/* Output port (centered on right edge of card) - hidden in fullscreen */}
      {!isFullscreen && (
        <div
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-primary cursor-crosshair transition-all z-20 hover:scale-125"
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOutputPortMouseDown(e);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Telescope className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Research Chat</p>
            <p className="text-xs text-muted-foreground">Research your data</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              setIsFullscreen(!isFullscreen);
            }}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {!isFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Connected data sources */}
      {connectedContexts.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground mb-1.5">Context Sources:</p>
          <div className="flex flex-wrap gap-1.5">
            {connectedContexts.map((ctx, idx) => {
              const IconMap: Record<string, any> = {
                "business-db": Database,
                "text": Type,
                "document": FileText,
                "image": Image,
                "website": Globe,
              };
              const Icon = IconMap[ctx.type] || Database;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs"
                >
                  <Icon className="h-3 w-3 text-primary" />
                  <span>{ctx.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className={cn(isFullscreen && "max-w-3xl mx-auto")}>
        {isLoadingData ? (
          <div className="text-center text-muted-foreground py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading context...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Telescope className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {connectedContexts.length > 0
                ? `Ask about ${connectedContexts.map(c => c.label).join(", ")}`
                : "Connect a data source, then ask questions"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ResearchChatMessage
                    role={msg.role}
                    content={msg.content}
                    insightCards={msg.insightCards}
                    isStreaming={msg.isStreaming}
                  />
                  {msg.role === "assistant" && 
                   !msg.isStreaming && 
                   idx === messages.length - 1 && 
                   msg.suggestions && 
                   msg.suggestions.length > 0 && (
                    <motion.div
                      className="mt-2 mr-4"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.3 }}
                    >
                      <SuggestedActions
                        suggestions={msg.suggestions}
                        onSelect={(suggestion) => handleSend(suggestion)}
                      />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className={cn("p-3 border-t border-border", isFullscreen && "flex justify-center")}>
        <div className={cn("flex gap-2", isFullscreen && "max-w-3xl w-full")}>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onMouseDown={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            placeholder="Ask about your data..."
            className="min-h-[60px] resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading || connectedContexts.length === 0}
            className={cn("h-10 w-10 rounded-full self-end shrink-0", input.trim() && !isLoading ? "bg-primary hover:bg-primary/90 text-primary-foreground" : "bg-muted border border-border text-muted-foreground")}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
    </>
  );

  if (isFullscreen) {
    return createPortal(chatContent, document.body);
  }

  return chatContent;
}
