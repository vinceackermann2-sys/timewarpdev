import { useState, useCallback, useEffect, useRef } from "react";
import { Zap, ArrowUp, X, Database, FileText, Type, Image, Globe, Loader2, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { ActionChatMessage, ActionStep, DocumentLink } from "./ActionChatMessage";
import { SuggestedActions } from "./SuggestedActions";
import type { CanvasNode, Connection } from "./types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  steps?: ActionStep[];
  documentLinks?: DocumentLink[];
  suggestions?: string[];
  isStreaming?: boolean;
}

interface ConnectedContext {
  type: string;
  label: string;
  content: any;
}

interface ActionChatNodeProps {
  node: CanvasNode;
  connections: Connection[];
  connectedNodes: CanvasNode[];
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onClose: () => void;
}

// Parse streaming response for steps, content, document links, and suggestions
function parseActionResponse(text: string): {
  steps: ActionStep[];
  content: string;
  documentLinks: DocumentLink[];
  suggestions: string[];
} {
  const steps: ActionStep[] = [];
  const documentLinks: DocumentLink[] = [];
  const suggestions: string[] = [];
  let content = text;

  // Parse step markers: [STEP:icon:label:status]
  // Deduplicate steps - keep only the latest status for each label
  const stepMap = new Map<string, ActionStep>();
  const stepRegex = /\[STEP:([^:]+):([^:]+):([^\]]+)\]/g;
  let match;
  while ((match = stepRegex.exec(text)) !== null) {
    const label = match[2];
    stepMap.set(label, {
      icon: match[1],
      label: label,
      status: match[3] as ActionStep["status"],
    });
  }
  steps.push(...stepMap.values());
  content = content.replace(stepRegex, "");

  // Parse document links: [DOC:type|title|url|preview?]
  // Using pipe delimiter to avoid URL colon conflicts
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

  // Parse suggestions: [SUGGEST:suggestion1|suggestion2|suggestion3]
  const suggestRegex = /\[SUGGEST:([^\]]+)\]/g;
  while ((match = suggestRegex.exec(text)) !== null) {
    const items = match[1].split("|").map(s => s.trim()).filter(Boolean);
    suggestions.push(...items);
  }
  content = content.replace(suggestRegex, "");

  // Clean up extra whitespace
  content = content.trim().replace(/\n{3,}/g, "\n\n");

  return { steps, content, documentLinks, suggestions: suggestions.slice(0, 3) };
}

export function ActionChatNode({
  node,
  connections,
  connectedNodes,
  isSelected,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onClose,
}: ActionChatNodeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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

  // Build context from all connected nodes
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
                  content: { 
                    url: source.websiteUrl,
                    title: source.websiteTitle,
                    analysis: source.analyzedContent
                  }
                });
              }
              break;
            }
            case "research": {
              // Research node connected - we can use its context
              contexts.push({
                type: "research",
                label: source.label,
                content: { note: "Research insights available" }
              });
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
      
      // Get Google access token from session provider_token OR sessionStorage
      const googleAccessToken = session?.provider_token || sessionStorage.getItem("googleProviderToken");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/action-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: messageToSend }],
            connectedContexts,
            googleAccessToken,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      if (reader) {
        // Add initial streaming message
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: "", 
          steps: [],
          documentLinks: [],
          suggestions: [],
          isStreaming: true 
        }]);

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
                  fullResponse += content;
                  const parsed = parseActionResponse(fullResponse);
                  
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
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }

        // Final parse and mark as complete
        const finalParsed = parseActionResponse(fullResponse);
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
      console.error("Action chat error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "**Error:** Sorry, I encountered an error. Please try again." },
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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  // Get the last assistant message for suggestions
  const lastAssistantMessage = messages.filter(m => m.role === "assistant").slice(-1)[0];

  return (
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
          isSelected && !isFullscreen ? "border-accent ring-2 ring-accent/30" : "border-border",
          isFullscreen ? "fixed inset-4 z-[101] max-w-4xl mx-auto" : "absolute"
        )}
        style={isFullscreen ? { height: 'calc(100vh - 32px)' } : {
          left: node.x,
          top: node.y,
          width: 540,
          height: 480,
        }}
        onMouseDown={isFullscreen ? undefined : onMouseDown}
        onWheel={handleWheel}
      >

      {/* Input port - hidden in fullscreen */}
      {!isFullscreen && (
        <div
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-accent cursor-crosshair transition-all z-20 hover:scale-125"
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onMouseUp={onInputPortMouseUp}
        />
      )}

      {/* Output port - hidden in fullscreen */}
      {!isFullscreen && (
        <div
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-accent cursor-crosshair transition-all z-20 hover:scale-125"
          )}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onOutputPortMouseDown(e);
          }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-accent/10 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-accent/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-accent-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Action Chat</p>
            <p className="text-xs text-muted-foreground">Execute workspace tasks</p>
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
                "research": Zap,
              };
              const Icon = IconMap[ctx.type] || Database;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 rounded text-xs"
                >
                  <Icon className="h-3 w-3 text-accent-foreground" />
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
          <div className="text-center text-muted-foreground py-6">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium mb-2">Execute Workspace Actions</p>
            <div className="text-xs space-y-1">
              <p>• "Draft a reply to John's email"</p>
              <p>• "Create an SOP for onboarding"</p>
              <p>• "Schedule a meeting tomorrow at 2pm"</p>
              <p>• "Write a strategy document"</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx}>
                <ActionChatMessage
                  role={msg.role}
                  content={msg.content}
                  steps={msg.steps}
                  documentLinks={msg.documentLinks}
                  isStreaming={msg.isStreaming}
                />
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
            placeholder="What action should I take?"
            className="min-h-[60px] resize-none text-sm"
            disabled={isLoading}
          />
          <Button
            size="icon"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-full self-end shrink-0 bg-accent hover:bg-accent/80"
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
}