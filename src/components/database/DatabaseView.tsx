import { useState, useRef, useEffect } from "react";
import { 
  Mail, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign,
  Sparkles,
  ArrowUp,
  Loader2,
  ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// Database modules with valuable Google Workspace questions
const databaseModules = [
  {
    id: "email",
    code: "EML-X1",
    title: "EMAIL INTELLIGENCE",
    icon: Mail,
    gradient: "from-primary to-accent",
    questions: [
      "Who are my top 5 email contacts this month?",
      "What unread emails require urgent attention?",
      "Summarize email threads about project deadlines",
      "Which clients haven't responded in over a week?"
    ]
  },
  {
    id: "calendar",
    code: "CAL-Z2",
    title: "CALENDAR INSIGHTS",
    icon: Calendar,
    gradient: "from-accent to-primary",
    questions: [
      "What meetings are scheduled for this week?",
      "How much time am I spending in meetings vs deep work?",
      "Which recurring meetings could be optimized?",
      "What upcoming deadlines should I prepare for?"
    ]
  },
  {
    id: "docs",
    code: "DOC-A3",
    title: "DOCUMENT HUB",
    icon: FileText,
    gradient: "from-primary to-accent",
    questions: [
      "What documents were modified this week?",
      "Which shared documents need my review?",
      "Summarize the latest project proposal",
      "What contracts are pending signature?"
    ]
  },
  {
    id: "revenue",
    code: "REV-B4",
    title: "REVENUE TRACKER",
    icon: DollarSign,
    gradient: "from-accent to-primary",
    questions: [
      "What invoices are mentioned in recent emails?",
      "Identify payment-related conversations",
      "Which deals are discussed most frequently?",
      "Summarize financial updates from spreadsheets"
    ]
  },
  {
    id: "team",
    code: "TEM-C5",
    title: "TEAM ACTIVITY",
    icon: Users,
    gradient: "from-primary to-accent",
    questions: [
      "Who is most active in shared documents?",
      "What are the key discussion topics this week?",
      "Which team members need follow-ups?",
      "Summarize team meeting action items"
    ]
  },
  {
    id: "trends",
    code: "TRN-D6",
    title: "BUSINESS TRENDS",
    icon: TrendingUp,
    gradient: "from-accent to-primary",
    questions: [
      "What topics are trending in my inbox?",
      "Identify emerging opportunities from emails",
      "What competitors are mentioned in communications?",
      "Summarize market updates from documents"
    ]
  }
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function DatabaseView() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleQuestionClick = async (question: string) => {
    setShowChat(true);
    await sendMessage(question);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

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

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [...messages, userMessage].map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get response");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let assistantContent = "";
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.startsWith("data: "));

        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I couldn't process your request. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      setShowChat(true);
      sendMessage(inputValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col portal-bg relative overflow-hidden">
      {/* Stardust texture overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/stardust.png)',
          backgroundRepeat: 'repeat',
          opacity: 0.3
        }}
      />
      
      {/* Animated nebula background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-nebula"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-nebula"
          style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.25) 0%, transparent 70%)', animationDelay: '-7s' }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] animate-pulse-glow"
          style={{ background: 'radial-gradient(circle, hsl(270 70% 30% / 0.4) 0%, transparent 60%)' }}
        />
        
        {/* Falling stars */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-0.5 h-0.5 bg-foreground rounded-full animate-starfall"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-${Math.random() * 20}%`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: 0.3 + Math.random() * 0.5,
            }}
          />
        ))}
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 p-8">
        {/* Chat messages area */}
        {showChat && messages.length > 0 && (
          <div className="w-full max-w-3xl mb-8 flex-1 min-h-0">
            <ScrollArea className="h-full max-h-[400px]" ref={scrollRef}>
              <div className="space-y-4 p-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-5 py-3 text-sm",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card/80 backdrop-blur text-foreground rounded-bl-md border border-border/50"
                      )}
                    >
                      {message.content || (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Database cards grid - visible when not actively chatting or as quick access */}
        {!showChat && (
          <div className="w-full max-w-5xl">
            {/* Header */}
            <div className="text-center mb-10">
              <h1 className="text-2xl md:text-3xl font-normal mb-3">
                Your <span className="italic text-primary">Business Intelligence</span> Hub
              </h1>
              <p className="text-muted-foreground text-sm">
                Hover over a module to explore insights from your connected Google Workspace
              </p>
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {databaseModules.map((module) => {
                const Icon = module.icon;
                const isHovered = hoveredModule === module.id;

                return (
                  <div
                    key={module.id}
                    className="relative"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                  >
                    {/* Card */}
                    <div
                      className={cn(
                        "portal-card rounded-xl p-5 cursor-pointer transition-all duration-300",
                        isHovered ? "shadow-glow scale-[1.02]" : "hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={cn(
                          "p-2 rounded-lg bg-gradient-to-br",
                          module.gradient
                        )}>
                          <Icon className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate">{module.title}</h3>
                          <p className="text-[10px] text-muted-foreground font-mono">{module.code}</p>
                        </div>
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform duration-300",
                          isHovered && "rotate-180 text-primary"
                        )} />
                      </div>

                      {/* Synced indicator */}
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-[10px] text-muted-foreground">Connected</span>
                      </div>
                    </div>

                    {/* Dropdown on hover */}
                    <div
                      className={cn(
                        "absolute left-0 right-0 top-full mt-1 z-50 transition-all duration-300 origin-top",
                        isHovered 
                          ? "opacity-100 scale-100 translate-y-0" 
                          : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                      )}
                    >
                      <div className="portal-card rounded-xl p-3 shadow-glow-lg border border-primary/20 backdrop-blur-xl">
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wider mb-2 px-1">
                          QUICK INSIGHTS
                        </p>
                        <div className="space-y-1">
                          {module.questions.map((question, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleQuestionClick(question)}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs text-foreground hover:bg-primary/20 hover:text-primary transition-colors"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Back to modules when in chat */}
        {showChat && (
          <button
            onClick={() => setShowChat(false)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowUp className="h-4 w-4" />
            <span className="text-xs tracking-[0.2em] uppercase">Back to Modules</span>
          </button>
        )}
      </div>

      {/* Bottom chat input - always visible */}
      <div className="relative z-10 p-6 flex justify-center">
        <div className="w-full max-w-xl">
          <div className="relative flex items-center">
            <Sparkles className="absolute left-4 h-5 w-5 text-primary" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your business data..."
              className="w-full pl-12 pr-14 py-6 rounded-full bg-card/80 backdrop-blur border-border/50 text-foreground placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="absolute right-2 h-10 w-10 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 text-background animate-spin" />
              ) : (
                <ArrowUp className="h-5 w-5 text-background" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
