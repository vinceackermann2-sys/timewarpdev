import { useState, useCallback, useEffect } from "react";
import { Search, Send, X, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import type { CanvasNode, Connection } from "./types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface BusinessData {
  topContacts?: { email: string; count: number }[];
  emailSummaries?: { from: string; subject: string; snippet?: string }[];
  calendarEvents?: { summary: string; start: any; attendees?: number }[];
  documents?: { name: string }[];
  sheets?: { name: string; title?: string }[];
  slides?: { name: string; title?: string }[];
}

interface ResearchData {
  rawData: BusinessData | null;
  summary: {
    emailsAnalyzed?: number;
    eventsAnalyzed?: number;
    documentsAnalyzed?: number;
    sheetsAnalyzed?: number;
    analyzedAt?: string;
  } | null;
  findings: any;
}

interface ResearchChatNodeProps {
  node: CanvasNode;
  connections: Connection[];
  connectedNodes: CanvasNode[];
  isSelected: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onClose: () => void;
}

export function ResearchChatNode({
  node,
  connections,
  connectedNodes,
  isSelected,
  onMouseDown,
  onInputPortMouseUp,
  onClose,
}: ResearchChatNodeProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Get connected data sources
  const inputConnections = connections.filter(c => c.toNodeId === node.id);
  const connectedDataSources = inputConnections
    .map(c => connectedNodes.find(n => n.id === c.fromNodeId))
    .filter(Boolean);

  // Check if business-db is connected
  const hasBusinessDb = connectedDataSources.some(n => n?.type === "business-db");

  // Fetch research data from storage bucket when business-db is connected
  useEffect(() => {
    const fetchResearchData = async () => {
      if (!hasBusinessDb) return;
      
      setIsLoadingData(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log("No authenticated session for research data fetch");
          setIsLoadingData(false);
          return;
        }

        // Fetch from storage bucket (same source as DatabaseView)
        const { data, error } = await supabase.storage
          .from('business-data')
          .download(`${session.user.id}/research.json`);

        if (error) {
          console.log("No business data found yet:", error.message);
          setIsLoadingData(false);
          return;
        }

        const text = await data.text();
        const parsed = JSON.parse(text);
        
        console.log("Research data loaded from storage:", {
          emails: parsed.summary?.emailsAnalyzed,
          docs: parsed.summary?.documentsAnalyzed,
          hasRawData: !!parsed.rawData
        });
        
        setResearchData({
          rawData: parsed.rawData || null,
          summary: parsed.summary || null,
          findings: parsed.findings || parsed.analysis || null
        });
      } catch (err) {
        console.error("Failed to fetch research data:", err);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchResearchData();
  }, [hasBusinessDb]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context from connected nodes
      const dataContext = connectedDataSources
        .map(n => `- ${n?.label} (${n?.type})`)
        .join("\n");

      // Get auth token for authenticated request
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
            messages: [...messages, { role: "user", content: userMessage }],
            dataSources: connectedDataSources.map(n => n?.type),
            dataContext,
            researchData: hasBusinessDb ? researchData : null,
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
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);

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
                  setMessages(prev => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1] = {
                      role: "assistant",
                      content: assistantMessage,
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
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, connectedDataSources, isLoading, hasBusinessDb, researchData]);

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

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-xl flex flex-col",
        isSelected ? "border-primary ring-2 ring-primary/30" : "border-border"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 360,
        height: 400,
      }}
      onMouseDown={onMouseDown}
      onWheel={handleWheel}
    >
      {/* Input port (left side) */}
      <div
        className={cn(
          "absolute -left-2 top-12 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          "border-primary scale-110 bg-primary/20 hover:scale-125"
        )}
        onMouseUp={onInputPortMouseUp}
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
      {connectedDataSources.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-muted/20">
          <p className="text-xs text-muted-foreground mb-1.5">Data Sources:</p>
          <div className="flex flex-wrap gap-1.5">
            {connectedDataSources.map((source, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded text-xs"
              >
                <Database className="h-3 w-3 text-primary" />
                <span>{source?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-3">
        {isLoadingData ? (
          <div className="text-center text-muted-foreground py-8">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading business data...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {connectedDataSources.length > 0
                ? hasBusinessDb && researchData
                  ? `Ask about ${researchData.summary?.emailsAnalyzed || 0} emails, ${researchData.summary?.documentsAnalyzed || 0} docs analyzed`
                  : "Ask a question about your connected data"
                : "Connect a data source, then ask questions"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "text-sm rounded-lg px-3 py-2",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted mr-8"
                )}
              >
                {msg.content || (isLoading && idx === messages.length - 1 && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ))}
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
            placeholder="Ask about your data..."
            className="min-h-[60px] resize-none text-sm"
            disabled={isLoading || connectedDataSources.length === 0}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading || connectedDataSources.length === 0}
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
