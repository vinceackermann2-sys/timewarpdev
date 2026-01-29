import { useState, useEffect } from "react";
import { 
  Mail, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign,
  Loader2,
  Sparkles,
  BarChart3,
  PieChart,
  Activity,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { FloatingChat } from "./FloatingChat";

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

// Database module definitions
const databaseModules = [
  { id: "email", code: "EML-X1", title: "EMAIL", icon: Mail, color: "from-blue-500 to-blue-600", statIcon: BarChart3 },
  { id: "calendar", code: "CAL-Z2", title: "CALENDAR", icon: Calendar, color: "from-purple-500 to-purple-600", statIcon: PieChart },
  { id: "docs", code: "DOC-A3", title: "DOCS", icon: FileText, color: "from-emerald-500 to-emerald-600", statIcon: Activity },
  { id: "revenue", code: "REV-B4", title: "REVENUE", icon: DollarSign, color: "from-amber-500 to-amber-600", statIcon: TrendingUp },
  { id: "team", code: "TEM-C5", title: "TEAM", icon: Users, color: "from-pink-500 to-pink-600", statIcon: Zap },
  { id: "trends", code: "TRN-D6", title: "TRENDS", icon: TrendingUp, color: "from-cyan-500 to-cyan-600", statIcon: Sparkles }
];

export function DatabaseView() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [researchSummary, setResearchSummary] = useState<ResearchSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

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

  const handleQuestionClick = (question: string) => {
    setPendingQuestion(question);
  };

  const handleChatMessage = async (message: string): Promise<string> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return "Please log in to use the AI assistant.";
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
            messages: [{ role: "user", content: message }]
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      let content = "";
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
            if (delta) content += delta;
          } catch {
            // Skip malformed JSON
          }
        }
      }

      return content || "I couldn't generate a response. Please try again.";
    } catch (error) {
      console.error("Chat error:", error);
      return "Sorry, I couldn't process your request. Please try again.";
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
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-3xl md:text-4xl font-light mb-4">
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

        {/* File Storage Map - Horizontal Layout with Side Pullout */}
        <div className="flex items-center justify-center gap-3 w-full max-w-6xl">
          {databaseModules.map((module, index) => {
            const Icon = module.icon;
            const StatIcon = module.statIcon;
            const isHovered = hoveredModule === module.id;
            const questions = generatePersonalizedQuestions(module.id, businessData, researchSummary);

            return (
              <div
                key={module.id}
                className="relative"
                onMouseEnter={() => setHoveredModule(module.id)}
                onMouseLeave={() => setHoveredModule(null)}
              >
                {/* File Card - Bigger Size */}
                <div
                  className={cn(
                    "relative w-32 h-48 cursor-pointer transition-all duration-500 ease-out rounded-2xl overflow-hidden",
                    "bg-gradient-to-b from-card/90 to-card/60 backdrop-blur-xl",
                    "border border-border/40",
                    isHovered && "shadow-glow-lg border-primary/50 scale-105"
                  )}
                  style={{
                    transform: isHovered ? 'translateX(-100px) scale(1.08)' : 'translateX(0) scale(1)',
                    zIndex: isHovered ? 50 : 10 - index,
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  {/* Colored Header Strip */}
                  <div className={cn(
                    "h-16 bg-gradient-to-br flex flex-col items-center justify-center gap-1",
                    module.color
                  )}>
                    <span className="text-[9px] text-white/70 font-mono tracking-wider">{module.code}</span>
                    <Icon className="h-6 w-6 text-white drop-shadow-lg" />
                  </div>

                  {/* Card Body */}
                  <div className="p-3 flex flex-col items-center justify-between h-32">
                    <span className={cn(
                      "text-xs font-semibold tracking-wider text-center transition-colors",
                      isHovered ? "text-primary" : "text-foreground"
                    )}>
                      {module.title}
                    </span>

                    {/* Mini Visual Indicator */}
                    <div className="flex items-end gap-0.5 h-8">
                      {[0.4, 0.7, 0.5, 0.9, 0.6].map((h, i) => (
                        <div 
                          key={i}
                          className={cn(
                            "w-1.5 rounded-t transition-all duration-300",
                            isHovered ? "bg-primary" : "bg-muted-foreground/30"
                          )}
                          style={{ 
                            height: `${h * 100}%`,
                            transitionDelay: `${i * 50}ms`
                          }}
                        />
                      ))}
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        hasBusinessData ? "bg-primary animate-pulse" : "bg-muted-foreground/40"
                      )} />
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                        {hasBusinessData ? "Active" : "Sync"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Side Pullout Panel with Questions */}
                <div
                  className={cn(
                    "absolute top-0 left-full ml-2 w-72 h-48 transition-all duration-400 origin-left",
                    isHovered 
                      ? "opacity-100 scale-100 translate-x-0" 
                      : "opacity-0 scale-95 -translate-x-4 pointer-events-none"
                  )}
                  style={{ 
                    zIndex: 100,
                    transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                  }}
                >
                  <div className="h-full portal-card rounded-2xl p-4 shadow-glow border border-primary/40 backdrop-blur-xl flex flex-col">
                    {/* Panel Header */}
                    <div className="flex items-center gap-3 mb-3 pb-2 border-b border-border/30">
                      <div className={cn("p-2 rounded-xl bg-gradient-to-br shadow-lg", module.color)}>
                        <StatIcon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                          {hasBusinessData ? "Insights" : "Quick Access"}
                        </p>
                        <p className="text-xs font-semibold text-foreground">{module.title}</p>
                      </div>
                    </div>

                    {/* Questions */}
                    <div className="flex-1 overflow-hidden">
                      <div className="space-y-1">
                        {questions.slice(0, 3).map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuestionClick(question)}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs transition-all duration-200",
                              "bg-muted/30 hover:bg-primary/20 hover:text-primary",
                              "border border-transparent hover:border-primary/30",
                              "flex items-center gap-2 group"
                            )}
                          >
                            <Sparkles className="h-3 w-3 text-primary/60 group-hover:text-primary shrink-0" />
                            <span className="truncate">{question}</span>
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

      {/* Floating Chat - handles all chat functionality */}
      <FloatingChat 
        onSendMessage={handleChatMessage}
        pendingQuestion={pendingQuestion}
        onPendingQuestionConsumed={() => setPendingQuestion(null)}
      />
    </div>
  );
}
