import { useState, useCallback, useEffect } from "react";
import { Zap, Send, X, Database, FileText, Type, Image, Globe, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { CanvasNode, Connection } from "./types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actionStatus?: "pending" | "success" | "error";
  actionType?: string;
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

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Get Google access token from session provider_token
      const googleAccessToken = session?.provider_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/action-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: [...messages, { role: "user", content: userMessage }],
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
      let assistantMessage = "";
      let actionType = "";
      let actionStatus: "pending" | "success" | "error" = "pending";

      if (reader) {
        setMessages(prev => [...prev, { role: "assistant", content: "", actionStatus: "pending" }]);

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
                  
                  // Detect action type from response
                  if (assistantMessage.toLowerCase().includes("email")) actionType = "email";
                  else if (assistantMessage.toLowerCase().includes("calendar")) actionType = "calendar";
                  else if (assistantMessage.toLowerCase().includes("document")) actionType = "document";
                  else if (assistantMessage.toLowerCase().includes("strategy")) actionType = "strategy";
                  
                  // Detect success/error status
                  if (assistantMessage.toLowerCase().includes("✅") || assistantMessage.toLowerCase().includes("successfully")) {
                    actionStatus = "success";
                  } else if (assistantMessage.toLowerCase().includes("❌") || assistantMessage.toLowerCase().includes("error")) {
                    actionStatus = "error";
                  }
                  
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: assistantMessage,
                      actionType,
                      actionStatus,
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
      }
    } catch (error) {
      console.error("Action chat error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again.", actionStatus: "error" },
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

  const getStatusIcon = (status?: "pending" | "success" | "error") => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-xl flex flex-col select-none",
        isSelected ? "border-accent ring-2 ring-accent/30" : "border-border"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 460,
        height: 336,
      }}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >
      {/* Input port */}
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

      {/* Output port */}
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
      <ScrollArea className="flex-1 p-3">
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
              <div
                key={idx}
                className={cn(
                  "text-sm rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "bg-accent text-accent-foreground ml-8"
                    : "bg-muted mr-8"
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    {msg.content || (isLoading && idx === messages.length - 1 && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ))}
                  </div>
                  {msg.role === "assistant" && getStatusIcon(msg.actionStatus)}
                </div>
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
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-[60px] w-10 bg-accent hover:bg-accent/80"
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
