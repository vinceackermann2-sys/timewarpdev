import { useState, useRef, useEffect } from "react";
import { 
  Mail, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign,
  Loader2,
  Sparkles,
  ArrowUp
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

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
      }
      break;

    case "calendar":
      if (businessData.calendarEvents?.length) {
        const nextEvent = businessData.calendarEvents[0];
        if (nextEvent.summary) {
          questions.push(`How should I prepare for "${nextEvent.summary}"?`);
        }
        questions.push(`What meetings can I reschedule?`);
      }
      break;

    case "docs":
      if (businessData.documents?.length) {
        const recentDoc = businessData.documents[0];
        questions.push(`Summarize "${recentDoc.name}"`);
      }
      if (businessData.sheets?.length) {
        questions.push(`What trends in my spreadsheets?`);
      }
      break;

    case "revenue":
      questions.push(`What payment discussions are in my emails?`);
      questions.push(`Identify budget concerns`);
      break;

    case "team":
      if (businessData.topContacts?.length && businessData.topContacts.length > 1) {
        questions.push(`What's the status with my team?`);
      }
      questions.push(`Who needs my attention?`);
      break;

    case "trends":
      questions.push(`What patterns in my business?`);
      questions.push(`What should I prioritize?`);
      break;
  }

  while (questions.length < 3) {
    const fallback = fallbackQuestions[moduleId]?.[questions.length];
    if (fallback) questions.push(fallback);
    else break;
  }

  return questions.slice(0, 3);
}

// Database module definitions - styled as file folders
const databaseModules = [
  { id: "email", code: "EML", title: "EMAILS", icon: Mail, color: "from-blue-500 to-blue-600" },
  { id: "calendar", code: "CAL", title: "CALENDAR", icon: Calendar, color: "from-purple-500 to-purple-600" },
  { id: "docs", code: "DOC", title: "DOCUMENTS", icon: FileText, color: "from-emerald-500 to-emerald-600" },
  { id: "revenue", code: "REV", title: "REVENUE", icon: DollarSign, color: "from-amber-500 to-amber-600" },
  { id: "team", code: "TEAM", title: "TEAM", icon: Users, color: "from-pink-500 to-pink-600" },
  { id: "trends", code: "TRD", title: "TRENDS", icon: TrendingUp, color: "from-cyan-500 to-cyan-600" }
];

// AI Message renderer with visual styling
function AIMessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="text-sm text-foreground/90 leading-relaxed mb-2 last:mb-0">{children}</p>,
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

export function DatabaseView() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
        throw new Error("Failed to get response");
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
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent
                };
                return newMessages;
              });
            }
          } catch {
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
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Chat messages - above the file storage */}
        {messages.length > 0 && (
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
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground px-5 py-3 rounded-br-md"
                          : "bg-card/80 backdrop-blur border border-border/50 p-4 rounded-bl-md"
                      )}
                    >
                      {message.role === "assistant" ? (
                        message.content ? (
                          <AIMessageContent content={message.content} />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )
                      ) : (
                        <p className="text-sm">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* File Storage Shelf - Map folder style */}
        <div className={cn(
          "px-8 py-6",
          messages.length === 0 && "flex-1 flex flex-col justify-center"
        )}>
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-light mb-3">
              Your <span className="italic text-primary font-normal">Business</span> Storage
            </h1>
            {isLoadingData ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading your business data...
              </div>
            ) : hasBusinessData ? (
              <p className="text-muted-foreground text-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-primary mr-2 animate-pulse" />
                {researchSummary?.emailsAnalyzed || 0} emails • {researchSummary?.eventsAnalyzed || 0} events synced
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                Complete research to unlock personalized insights
              </p>
            )}
          </div>

          {/* Shelf - horizontal bar that holds the files */}
          <div className="relative max-w-5xl mx-auto">
            {/* Shelf surface */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-b from-muted/50 to-muted/20 rounded-lg border-b-2 border-primary/20" />
            
            {/* File folders on shelf */}
            <div className="flex items-end justify-center gap-1 pb-3">
              {databaseModules.map((module, index) => {
                const Icon = module.icon;
                const isHovered = hoveredModule === module.id;
                const questions = generatePersonalizedQuestions(module.id, businessData, researchSummary);

                return (
                  <div
                    key={module.id}
                    className="relative"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                    style={{ zIndex: isHovered ? 50 : 10 - index }}
                  >
                    {/* File folder container */}
                    <div
                      className={cn(
                        "relative cursor-pointer transition-all duration-500 ease-out",
                        "w-28 origin-bottom"
                      )}
                      style={{
                        transform: isHovered 
                          ? 'translateY(-20px) rotateX(-5deg) scale(1.05)' 
                          : 'translateY(0) rotateX(0deg) scale(1)',
                        transformStyle: 'preserve-3d',
                        perspective: '1000px'
                      }}
                    >
                      {/* Folder tab - sticks up */}
                      <div className={cn(
                        "absolute -top-6 left-2 right-8 h-7 rounded-t-lg transition-all duration-300",
                        "bg-gradient-to-b",
                        module.color,
                        isHovered && "shadow-glow"
                      )}>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 tracking-wider">
                          {module.code}
                        </span>
                      </div>

                      {/* Main folder body */}
                      <div className={cn(
                        "relative h-36 rounded-lg transition-all duration-300",
                        "bg-gradient-to-b from-card to-card/80",
                        "border border-border/50",
                        isHovered && "border-primary/50 shadow-glow"
                      )}>
                        {/* Folder content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                          <div className={cn(
                            "p-2.5 rounded-xl mb-2 transition-all duration-300",
                            "bg-gradient-to-br",
                            module.color,
                            isHovered && "scale-110 shadow-lg"
                          )}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className={cn(
                            "text-[10px] font-semibold tracking-wider text-center transition-colors",
                            isHovered ? "text-primary" : "text-muted-foreground"
                          )}>
                            {module.title}
                          </span>
                          
                          {/* Data indicator dots */}
                          <div className="flex gap-1 mt-2">
                            <span className={cn(
                              "h-1 w-1 rounded-full transition-colors",
                              hasBusinessData ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/10" />
                          </div>
                        </div>

                        {/* Paper sheets inside folder - visible on hover */}
                        <div className={cn(
                          "absolute inset-x-1 top-1 h-full transition-all duration-500",
                          isHovered ? "opacity-100" : "opacity-0"
                        )}>
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="absolute inset-x-0 h-full bg-gradient-to-b from-foreground/5 to-transparent rounded-t-lg border-t border-x border-foreground/10"
                              style={{
                                transform: `translateY(${-4 - i * 3}px) scale(${1 - i * 0.02})`,
                                opacity: 1 - i * 0.3
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Opened file content - questions panel */}
                    <div
                      className={cn(
                        "absolute left-full top-0 ml-3 w-64 transition-all duration-400 origin-left",
                        isHovered 
                          ? "opacity-100 scale-100 translate-x-0" 
                          : "opacity-0 scale-95 -translate-x-4 pointer-events-none"
                      )}
                      style={{ 
                        zIndex: 100,
                      }}
                    >
                      {/* Paper document appearance */}
                      <div className="relative">
                        {/* Paper shadow layers */}
                        <div className="absolute inset-0 bg-card/50 rounded-lg transform translate-x-1 translate-y-1" />
                        <div className="absolute inset-0 bg-card/70 rounded-lg transform translate-x-0.5 translate-y-0.5" />
                        
                        {/* Main paper */}
                        <div className="relative bg-card rounded-lg p-4 border border-border/50 shadow-xl">
                          {/* Paper header line */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
                            <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", module.color)}>
                              <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-foreground">{module.title}</p>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                {hasBusinessData ? "Your Insights" : "Quick Access"}
                              </p>
                            </div>
                          </div>

                          {/* Questions as paper content */}
                          <div className="space-y-2">
                            {questions.map((question, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuestionClick(question)}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-200",
                                  "bg-muted/40 hover:bg-primary/20 hover:text-primary",
                                  "border border-transparent hover:border-primary/30",
                                  "flex items-center gap-2 group"
                                )}
                              >
                                <Sparkles className="h-3 w-3 text-primary/50 group-hover:text-primary shrink-0" />
                                <span className="line-clamp-2">{question}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Floating chat input - always at bottom */}
      <div className="relative z-20 p-6 pt-0">
        <div className="max-w-2xl mx-auto">
          <div className="relative flex items-center glass-portal rounded-full shadow-glow">
            <Sparkles className="absolute left-5 h-5 w-5 text-primary" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={hasBusinessData ? "Ask about your business data..." : "Ask a question..."}
              className="w-full pl-14 pr-16 py-7 rounded-full bg-transparent border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
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
