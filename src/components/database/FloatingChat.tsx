import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles, TrendingUp, Users, Mail, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FloatingChatProps {
  onSendMessage?: (message: string) => Promise<string>;
  pendingQuestion?: string | null;
  onPendingQuestionConsumed?: () => void;
}

// Visual insight card component for AI responses
function InsightCard({ icon: Icon, title, value, trend }: { 
  icon: React.ElementType; 
  title: string; 
  value: string; 
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
      <div className="p-2 rounded-lg bg-primary/20">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value}</p>
      </div>
      {trend && (
        <div className={cn(
          "p-1 rounded-full",
          trend === "up" && "bg-primary/20 text-primary",
          trend === "down" && "bg-destructive/20 text-destructive",
          trend === "neutral" && "bg-muted text-muted-foreground"
        )}>
          <TrendingUp className={cn("h-3 w-3", trend === "down" && "rotate-180")} />
        </div>
      )}
    </div>
  );
}

// Parse and render AI message with visual components
function AIMessageContent({ content }: { content: string }) {
  // Check for structured data patterns and render visually
  const hasContactMention = content.match(/(?:top contact|contact)[:s]*([w.]+@[w.]+)/i);
  const hasNumberMention = content.match(/(d+)s*(?:emails?|messages?|meetings?|events?)/i);
  const hasPercentMention = content.match(/(d+(?:.d+)?%)/);

  // If content is short or simple, render with markdown styling
  if (content.length < 200 && !hasContactMention && !hasNumberMention) {
    return (
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="text-sm text-foreground leading-relaxed mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
            ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
            li: ({ children }) => (
              <li className="flex items-start gap-2 text-sm">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
                <span>{children}</span>
              </li>
            ),
            h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-primary mb-1">{children}</h3>,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // For longer content, break into visual sections
  const sections = content.split(/\n\n+/);
  
  return (
    <div className="space-y-3">
      {/* Quick stats bar if numbers detected */}
      {(hasContactMention || hasNumberMention || hasPercentMention) && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          {hasNumberMention && (
            <InsightCard 
              icon={Mail} 
              title="Activity" 
              value={hasNumberMention[0]}
              trend="up"
            />
          )}
          {hasContactMention && (
            <InsightCard 
              icon={Users} 
              title="Key Contact" 
              value={hasContactMention[1].split('@')[0]}
            />
          )}
          {hasPercentMention && !hasNumberMention && (
            <InsightCard 
              icon={BarChart3} 
              title="Metric" 
              value={hasPercentMention[1]}
              trend="up"
            />
          )}
        </div>
      )}

      {/* Main content with visual styling */}
      <div className="prose prose-sm prose-invert max-w-none">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="text-sm text-foreground/90 leading-relaxed mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="text-primary font-semibold">{children}</strong>,
            em: ({ children }) => <em className="text-accent italic">{children}</em>,
            ul: ({ children }) => <ul className="space-y-2 my-3">{children}</ul>,
            ol: ({ children }) => <ol className="space-y-2 my-3 list-none">{children}</ol>,
            li: ({ children }) => (
              <li className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30 border border-border/30">
                <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                <span className="text-foreground/90">{children}</span>
              </li>
            ),
            h1: ({ children }) => <h1 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mb-2 border-l-2 border-primary pl-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-semibold text-primary mb-1">{children}</h3>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-2 border-accent pl-3 italic text-muted-foreground my-2">
                {children}
              </blockquote>
            ),
            code: ({ children }) => (
              <code className="px-1.5 py-0.5 rounded bg-muted text-primary text-xs font-mono">
                {children}
              </code>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

export function FloatingChat({ onSendMessage, pendingQuestion, onPendingQuestionConsumed }: FloatingChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle pending question from file cards
  useEffect(() => {
    if (pendingQuestion) {
      setIsOpen(true);
      setInput(pendingQuestion);
      onPendingQuestionConsumed?.();
      // Auto-send after short delay
      setTimeout(() => {
        handleSendWithMessage(pendingQuestion);
      }, 100);
    }
  }, [pendingQuestion]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendWithMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const response = onSendMessage 
        ? await onSendMessage(message)
        : "I'm analyzing your business data from Google Workspace. This feature will provide insights based on your connected data.";
      
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't process your request. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    await handleSendWithMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full shadow-glow-lg transition-all duration-300 flex items-center justify-center",
          "bg-gradient-to-br from-primary to-accent text-primary-foreground",
          "hover:scale-110 active:scale-95",
          "border border-primary/50",
          isOpen && "opacity-0 pointer-events-none scale-75"
        )}
      >
        <MessageCircle className="h-7 w-7" />
        {/* Pulse ring */}
        <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
      </button>

      {/* Full Chat Panel - Extends to bottom */}
      <div
        className={cn(
          "fixed bottom-0 right-6 z-50 w-[420px] transition-all duration-500 flex flex-col overflow-hidden",
          "bg-gradient-to-b from-card/95 to-card backdrop-blur-xl",
          "border border-border/50 rounded-t-3xl shadow-2xl",
          isOpen ? "opacity-100 translate-y-0 h-[600px]" : "opacity-0 translate-y-8 h-0 pointer-events-none"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/30 bg-gradient-to-r from-primary/10 to-accent/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">TimeWarp AI</h3>
              <p className="text-xs text-muted-foreground">Your business intelligence</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 border border-primary/30">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h4 className="font-semibold text-foreground mb-2">How can I help?</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask questions about your business data from Google Workspace
              </p>
              {/* Quick prompts */}
              <div className="mt-6 space-y-2 w-full">
                {["What's my top priority today?", "Summarize my week", "Who needs a follow-up?"].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendWithMessage(prompt)}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm bg-muted/30 hover:bg-primary/20 hover:text-primary transition-colors border border-border/30 hover:border-primary/30"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex animate-fade-in",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl",
                      message.role === "user"
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground px-4 py-3 rounded-br-md"
                        : "bg-muted/50 text-foreground p-4 rounded-bl-md border border-border/30"
                    )}
                  >
                    {message.role === "assistant" ? (
                      message.content ? (
                        <AIMessageContent content={message.content} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">Analyzing...</span>
                        </div>
                      )
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-border/30 bg-gradient-to-t from-card to-transparent">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business..."
              className="flex-1 bg-muted/30 border-border/50 rounded-xl py-6 px-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
              disabled={isLoading}
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent hover:opacity-90"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
