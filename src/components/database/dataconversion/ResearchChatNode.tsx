import { useState, useCallback, useEffect, useRef } from "react";
import { Search, Send, X, Database, FileText, Type, Image, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { SuggestedActions } from "./SuggestedActions";
import type { CanvasNode, Connection } from "./types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
  isStreaming?: boolean;
}

interface ConnectedContext {
  type: string;
  label: string;
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

// Parse suggestions from response: [SUGGEST:suggestion1|suggestion2|suggestion3]
function parseSuggestions(text: string): { content: string; suggestions: string[] } {
  const suggestions: string[] = [];
  let content = text;
  
  const suggestRegex = /\[SUGGEST:([^\]]+)\]/g;
  let match;
  while ((match = suggestRegex.exec(text)) !== null) {
    const items = match[1].split("|").map(s => s.trim()).filter(Boolean);
    suggestions.push(...items);
  }
  content = content.replace(suggestRegex, "").trim();
  
  return { content, suggestions: suggestions.slice(0, 3) };
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [connectedContexts, setConnectedContexts] = useState<ConnectedContext[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
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
              // Fetch business data from storage
              const { data: { session } } = await supabase.auth.getSession();
              if (session?.user) {
                const { data, error } = await supabase.storage
                  .from('business-data')
                  .download(`${session.user.id}/research.json`);
                
                if (!error && data) {
                  const text = await data.text();
                  const parsed = JSON.parse(text);
                  contexts.push({
                    type: "business-db",
                    label: source.label,
                    content: {
                      research_summary: parsed.summary || {},
                      findings: parsed.findings || parsed.analysis || [],
                      raw_data: parsed.rawData || {},
                      emails_analyzed: parsed.summary?.emailsAnalyzed || 0,
                      documents_analyzed: parsed.summary?.documentsAnalyzed || 0,
                      events_analyzed: parsed.summary?.eventsAnalyzed || 0,
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
                  content: { 
                    text: source.textContent,
                    analysis: source.analyzedContent // Include AI analysis
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
                  content: { 
                    name: source.documentName,
                    extractedText: source.documentContent, // Include extracted text
                    analysis: source.analyzedContent // Include AI analysis
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
                  content: { 
                    url: source.imageUrl,
                    analysis: source.analyzedContent // Include AI analysis of the image
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
                  content: { 
                    url: source.websiteUrl,
                    title: source.websiteTitle,
                    analysis: source.analyzedContent // Include AI analysis of the website
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
          }),
        }
      );

      if (!response.ok) {
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
                  const parsed = parseSuggestions(assistantMessage);
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: parsed.content,
                      suggestions: parsed.suggestions,
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
        const finalParsed = parseSuggestions(assistantMessage);
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            role: "assistant",
            content: finalParsed.content,
            suggestions: finalParsed.suggestions,
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

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-xl flex flex-col select-none",
        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 540,
        height: 480,
      }}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >
      {/* Input port (centered on left edge of card) */}
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

      {/* Output port (centered on right edge of card) */}
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

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Research Chat</p>
            <p className="text-xs text-muted-foreground">Ask about your data</p>
          </div>
        </div>
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
        {isLoadingData ? (
          <div className="text-center text-muted-foreground py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading context...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {connectedContexts.length > 0
                ? `Ask about ${connectedContexts.map(c => c.label).join(", ")}`
                : "Connect a data source, then ask questions"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <div
                  className={cn(
                    "text-sm rounded-lg px-3 py-2",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground ml-8"
                      : "bg-muted mr-4"
                  )}
                >
                  {msg.content || (msg.isStreaming && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ))}
                  {msg.isStreaming && msg.content && (
                    <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />
                  )}
                </div>
                {/* Show suggestions for the last assistant message when not streaming */}
                {msg.role === "assistant" && 
                 !msg.isStreaming && 
                 idx === messages.length - 1 && 
                 msg.suggestions && 
                 msg.suggestions.length > 0 && (
                  <div className="mt-2 mr-4">
                    <SuggestedActions
                      suggestions={msg.suggestions}
                      onSelect={(suggestion) => handleSend(suggestion)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
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
            className="h-[60px] w-10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
