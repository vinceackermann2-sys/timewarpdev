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
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface BusinessData {
  topContacts?: { email: string; count: number }[];
  emailSummaries?: { from: string; subject: string; snippet?: string }[];
  calendarEvents?: { summary: string; start: any; attendees?: number }[];
  documents?: { name: string }[];
  sheets?: { name: string; title?: string }[];
  slides?: { name: string; title?: string }[];
}

interface ResearchSummary {
  emailsAnalyzed?: number;
  eventsAnalyzed?: number;
  documentsAnalyzed?: number;
  sheetsAnalyzed?: number;
  analyzedAt?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Generate personalized questions from business data
function generatePersonalizedQuestions(
  moduleId: string,
  businessData: BusinessData | null,
  summary: ResearchSummary | null
): string[] {
  const fallbackQuestions: Record<string, string[]> = {
    email: [
      "Who are my top email contacts?",
      "What emails need my attention?",
      "Summarize my recent email threads"
    ],
    calendar: [
      "What meetings do I have this week?",
      "How is my time distributed?",
      "What deadlines are coming up?"
    ],
    docs: [
      "What documents were recently modified?",
      "Which documents need my review?",
      "Summarize my recent document activity"
    ],
    revenue: [
      "What financial topics appear in my data?",
      "Identify payment-related conversations",
      "Summarize financial activity"
    ],
    team: [
      "Who am I collaborating with most?",
      "What team discussions are happening?",
      "Which team members need follow-ups?"
    ],
    trends: [
      "What topics are trending in my business?",
      "Identify emerging patterns",
      "What should I focus on?"
    ]
  };

  if (!businessData) {
    return fallbackQuestions[moduleId] || [];
  }

  const questions: string[] = [];

  switch (moduleId) {
    case "email":
      if (businessData.topContacts?.length) {
        const topContact = businessData.topContacts[0];
        const contactName = topContact.email.split('@')[0].replace(/[._]/g, ' ');
        questions.push(`What does ${contactName} need from me?`);
        questions.push(`Summarize my conversations with ${contactName}`);
      }
      if (businessData.emailSummaries?.length) {
        questions.push(`What urgent emails should I respond to?`);
        questions.push(`What topics are discussed most in my inbox?`);
      }
      break;

    case "calendar":
      if (businessData.calendarEvents?.length) {
        const nextEvent = businessData.calendarEvents[0];
        if (nextEvent.summary) {
          questions.push(`How should I prepare for "${nextEvent.summary}"?`);
        }
        questions.push(`What meetings can I potentially reschedule?`);
        questions.push(`Who am I meeting with most frequently?`);
      }
      break;

    case "docs":
      if (businessData.documents?.length) {
        const recentDoc = businessData.documents[0];
        questions.push(`Summarize "${recentDoc.name}"`);
        questions.push(`What documents need updates?`);
      }
      if (businessData.sheets?.length) {
        const recentSheet = businessData.sheets[0];
        questions.push(`What trends do you see in "${recentSheet.name || recentSheet.title}"?`);
      }
      break;

    case "revenue":
      questions.push(`What payment discussions are in my emails?`);
      questions.push(`Identify any budget concerns from my data`);
      if (businessData.sheets?.length) {
        questions.push(`Analyze financial data from my spreadsheets`);
      }
      break;

    case "team":
      if (businessData.topContacts?.length && businessData.topContacts.length > 1) {
        const teamContacts = businessData.topContacts.slice(0, 3);
        questions.push(`What's the status with ${teamContacts.map(c => c.email.split('@')[0]).join(', ')}?`);
      }
      if (businessData.calendarEvents?.length) {
        questions.push(`What team meetings are scheduled?`);
      }
      questions.push(`Which collaborators need my attention?`);
      break;

    case "trends":
      questions.push(`What patterns do you see in my business activity?`);
      questions.push(`What should I prioritize this week?`);
      if (summary?.emailsAnalyzed && summary.emailsAnalyzed > 50) {
        questions.push(`What topics increased in frequency recently?`);
      }
      break;
  }

  while (questions.length < 3) {
    const fallback = fallbackQuestions[moduleId]?.[questions.length];
    if (fallback) questions.push(fallback);
    else break;
  }

  return questions.slice(0, 4);
}

// Database module definitions - styled as file tabs
const databaseModules = [
  { id: "email", code: "EML-X1", title: "EMAIL INTEL", icon: Mail, color: "from-blue-500 to-blue-600" },
  { id: "calendar", code: "CAL-Z2", title: "CALENDAR", icon: Calendar, color: "from-purple-500 to-purple-600" },
  { id: "docs", code: "DOC-A3", title: "DOCUMENTS", icon: FileText, color: "from-emerald-500 to-emerald-600" },
  { id: "revenue", code: "REV-B4", title: "REVENUE", icon: DollarSign, color: "from-amber-500 to-amber-600" },
  { id: "team", code: "TEM-C5", title: "TEAM", icon: Users, color: "from-pink-500 to-pink-600" },
  { id: "trends", code: "TRN-D6", title: "TRENDS", icon: TrendingUp, color: "from-cyan-500 to-cyan-600" }
];

export function DatabaseView() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [researchSummary, setResearchSummary] = useState<ResearchSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch business data from storage bucket
  useEffect(() => {
    const fetchBusinessData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoadingData(false);
          return;
        }

        const { data, error } = await supabase.storage
          .from('business-data')
          .download(`${session.user.id}/research.json`);

        if (error) {
          console.log('No business data found yet:', error.message);
          setIsLoadingData(false);
          return;
        }

        const text = await data.text();
        const parsed = JSON.parse(text);
        
        setBusinessData(parsed.rawData || null);
        setResearchSummary(parsed.summary || null);
        console.log('Loaded business data:', parsed.summary);
      } catch (error) {
        console.error('Error fetching business data:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchBusinessData();
  }, []);

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

  const hasBusinessData = businessData && Object.keys(businessData).length > 0;

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

        {/* File Storage Map - visible when not actively chatting */}
        {!showChat && (
          <div className="w-full max-w-4xl">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-2xl md:text-3xl font-normal mb-3">
                Your <span className="italic text-primary">Business</span> Storage
              </h1>
              {isLoadingData ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading your business data...
                </div>
              ) : hasBusinessData ? (
                <p className="text-muted-foreground text-sm">
                  <span className="text-primary">●</span> {researchSummary?.emailsAnalyzed || 0} emails • {researchSummary?.eventsAnalyzed || 0} events synced
                </p>
              ) : (
                <p className="text-muted-foreground text-sm">
                  Complete research to unlock personalized insights
                </p>
              )}
            </div>

            {/* File Tabs - Map Storage Style */}
            <div className="flex items-end justify-center gap-1 h-[420px]">
              {databaseModules.map((module, index) => {
                const Icon = module.icon;
                const isHovered = hoveredModule === module.id;
                const questions = generatePersonalizedQuestions(module.id, businessData, researchSummary);

                return (
                  <div
                    key={module.id}
                    className="relative flex flex-col items-center"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                  >
                    {/* File Tab */}
                    <div
                      className={cn(
                        "relative w-20 cursor-pointer transition-all duration-500 ease-out origin-bottom",
                        isHovered ? "h-[380px] -translate-y-8 z-20" : "h-[340px] z-10"
                      )}
                      style={{
                        transform: isHovered ? 'translateY(-40px) scale(1.05)' : 'translateY(0) scale(1)',
                        zIndex: isHovered ? 50 : 10 - index
                      }}
                    >
                      {/* Tab top - colored header */}
                      <div className={cn(
                        "h-20 rounded-t-xl bg-gradient-to-b transition-all duration-300",
                        module.color,
                        isHovered && "shadow-glow"
                      )}>
                        <div className="p-2 text-center">
                          <span className="text-[9px] text-white/80 font-mono tracking-wider">{module.code}</span>
                          <div className="mt-1.5 flex justify-center">
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      </div>

                      {/* Tab body - dark with vertical text */}
                      <div className="flex-1 bg-gradient-to-b from-card to-background/95 border-x border-b border-border/30 rounded-b-lg h-[260px] flex flex-col items-center py-4 backdrop-blur-sm">
                        {/* Vertical text */}
                        <div 
                          className="flex-1 flex items-center justify-center"
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                          <span className={cn(
                            "text-xs font-medium tracking-[0.25em] rotate-180 transition-colors duration-300",
                            isHovered ? "text-primary" : "text-muted-foreground"
                          )}>
                            {module.title}
                          </span>
                        </div>

                        {/* Status dots */}
                        <div className="flex flex-col gap-1 mt-2">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                            hasBusinessData ? "bg-primary" : "bg-muted-foreground/40"
                          )} />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                        </div>
                      </div>
                    </div>

                    {/* Pulled out panel with questions */}
                    <div
                      className={cn(
                        "absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 transition-all duration-300 origin-bottom",
                        isHovered 
                          ? "opacity-100 scale-100 translate-y-0" 
                          : "opacity-0 scale-90 translate-y-4 pointer-events-none"
                      )}
                      style={{ zIndex: 100 }}
                    >
                      <div className="portal-card rounded-xl p-4 shadow-glow-lg border border-primary/30 backdrop-blur-xl">
                        <div className="flex items-center gap-2 mb-3">
                          <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", module.color)}>
                            <Icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{module.title}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wider mb-2">
                          {hasBusinessData ? "YOUR INSIGHTS" : "QUICK QUERIES"}
                        </p>
                        <div className="space-y-1">
                          {questions.map((question, idx) => (
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
            <span className="text-xs tracking-[0.2em] uppercase">Back to Storage</span>
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
              placeholder={hasBusinessData ? "Ask about your business data..." : "Ask a question..."}
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
