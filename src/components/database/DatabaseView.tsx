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
  ArrowUp,
  Upload
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { FileUploadZone } from "./FileUploadZone";
import { 
  DatabaseChatMessage, 
  parseInsightCards, 
  parseSuggestions,
  type InsightCard 
} from "./DatabaseChatMessage";
import { SuggestedActions } from "./dataconversion/SuggestedActions";
import { BgGradient } from "@/components/ui/bg-gradient";
import { ConnectBusinessDNA } from "./ConnectBusinessDNA";

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
  insights?: InsightCard[];
}

// Generate personalized questions from business data
function generatePersonalizedQuestions(
  moduleId: string,
  businessData: BusinessData | null,
  summary: ResearchSummary | null,
  researchFindings?: any
): string[] {
  const questions: string[] = [];

  // Extract findings from research if available
  const findings = researchFindings?.findings || researchFindings?.insights || [];
  const keyTopics = researchFindings?.keyTopics || [];
  const recommendations = researchFindings?.recommendations || [];

  switch (moduleId) {
    case "email":
      if (businessData?.topContacts?.length) {
        const topContact = businessData.topContacts[0];
        const contactName = topContact.email.split('@')[0].replace(/[._]/g, ' ');
        questions.push(`What does ${contactName} need from me?`);
        if (businessData.topContacts.length > 1) {
          const secondContact = businessData.topContacts[1].email.split('@')[0].replace(/[._]/g, ' ');
          questions.push(`Compare conversations with ${contactName} and ${secondContact}`);
        }
      }
      if (businessData?.emailSummaries?.length) {
        const recentSubject = businessData.emailSummaries[0]?.subject;
        if (recentSubject) {
          questions.push(`Follow up needed for "${recentSubject.slice(0, 30)}..."?`);
        }
      }
      // Add from findings
      const emailFinding = findings.find((f: any) => f?.category?.toLowerCase?.().includes('email') || f?.area?.toLowerCase?.().includes('communication'));
      if (emailFinding?.title || emailFinding?.issue) {
        questions.push(`How can I address: ${(emailFinding.title || emailFinding.issue).slice(0, 40)}?`);
      }
      break;

    case "calendar":
      if (businessData?.calendarEvents?.length) {
        const nextEvent = businessData.calendarEvents[0];
        if (nextEvent.summary) {
          questions.push(`How should I prepare for "${nextEvent.summary.slice(0, 25)}"?`);
        }
        const bigMeeting = businessData.calendarEvents.find(e => (e.attendees || 0) > 3);
        if (bigMeeting?.summary) {
          questions.push(`What's the agenda for "${bigMeeting.summary.slice(0, 25)}"?`);
        }
      }
      questions.push(`Which meetings can I reschedule this week?`);
      // From research findings
      const timeFinding = findings.find((f: any) => f?.category?.toLowerCase?.().includes('time') || f?.area?.toLowerCase?.().includes('schedule'));
      if (timeFinding) {
        questions.push(`How do I optimize my calendar based on findings?`);
      }
      break;

    case "docs":
      if (businessData?.documents?.length) {
        const recentDoc = businessData.documents[0];
        questions.push(`Summarize "${recentDoc.name.slice(0, 30)}"`);
        if (businessData.documents.length > 2) {
          questions.push(`Compare my ${businessData.documents.length} documents for trends`);
        }
      }
      if (businessData?.sheets?.length) {
        const sheet = businessData.sheets[0];
        questions.push(`What key numbers in "${(sheet.title || sheet.name).slice(0, 25)}"?`);
      }
      if (businessData?.slides?.length) {
        questions.push(`Review my presentation content`);
      }
      break;

    case "revenue":
      // Pull from financial findings
      const revenueFinding = findings.find((f: any) => 
        f?.category?.toLowerCase?.().includes('financ') || 
        f?.category?.toLowerCase?.().includes('revenue') ||
        f?.area?.toLowerCase?.().includes('money')
      );
      if (revenueFinding?.title || revenueFinding?.issue) {
        questions.push(`Explain: ${(revenueFinding.title || revenueFinding.issue).slice(0, 40)}`);
      }
      questions.push(`What payment discussions are in my emails?`);
      questions.push(`Identify budget concerns from my data`);
      // From recommendations
      const revenueRec = recommendations.find((r: any) => r?.toLowerCase?.().includes('cost') || r?.toLowerCase?.().includes('revenue'));
      if (revenueRec) {
        questions.push(`How do I implement: ${revenueRec.slice(0, 35)}?`);
      }
      break;

    case "team":
      if (businessData?.topContacts?.length && businessData.topContacts.length > 2) {
        questions.push(`Who are my top ${Math.min(5, businessData.topContacts.length)} collaborators?`);
      }
      const teamFinding = findings.find((f: any) => 
        f?.category?.toLowerCase?.().includes('team') || 
        f?.area?.toLowerCase?.().includes('collaborat')
      );
      if (teamFinding?.title) {
        questions.push(`Address team issue: ${teamFinding.title.slice(0, 35)}`);
      }
      questions.push(`Who needs follow-up this week?`);
      questions.push(`What team discussions are happening?`);
      break;

    case "trends":
      // Pull key topics from research
      if (keyTopics.length > 0) {
        questions.push(`Deep dive into: ${keyTopics[0]}`);
      }
      const trendFinding = findings[0];
      if (trendFinding?.title || trendFinding?.issue) {
        questions.push(`What's the impact of: ${(trendFinding.title || trendFinding.issue).slice(0, 30)}?`);
      }
      if (recommendations.length > 0) {
        questions.push(`Priority action: ${recommendations[0].slice(0, 35)}?`);
      }
      questions.push(`What patterns are emerging in my business?`);
      break;

    case "uploads":
      questions.push(`Analyze my uploaded files`);
      questions.push(`What key data is in my documents?`);
      questions.push(`Compare uploaded documents`);
      break;
  }

  // Fallback questions if we don't have enough
  const fallbackQuestions: Record<string, string[]> = {
    email: ["Who are my top contacts?", "Summarize urgent emails", "What needs my response?"],
    calendar: ["What's my week look like?", "Upcoming deadlines?", "Meeting time analysis"],
    docs: ["Recent document activity?", "Key document insights", "What needs my review?"],
    revenue: ["Financial overview", "Payment trends", "Budget analysis"],
    team: ["Team collaboration status", "Who's most active?", "Pending team items"],
    trends: ["Business patterns", "What should I focus on?", "Key opportunities"],
    uploads: ["File analysis", "Document summary", "Key extracted data"]
  };

  while (questions.length < 3) {
    const fallback = fallbackQuestions[moduleId]?.[questions.length];
    if (fallback && !questions.includes(fallback)) {
      questions.push(fallback);
    } else break;
  }

  return questions.slice(0, 4);
}

// Database module definitions - styled as file folders
const databaseModules = [
  { id: "email", code: "EML", title: "EMAILS", icon: Mail, color: "from-status-info to-status-info/80" },
  { id: "calendar", code: "CAL", title: "CALENDAR", icon: Calendar, color: "from-primary to-primary/80" },
  { id: "docs", code: "DOC", title: "DOCUMENTS", icon: FileText, color: "from-status-success to-status-success/80" },
  { id: "uploads", code: "UPL", title: "UPLOADS", icon: Upload, color: "from-status-error to-status-error/80" },
  { id: "revenue", code: "REV", title: "REVENUE", icon: DollarSign, color: "from-status-warning to-status-warning/80" },
  { id: "team", code: "TEAM", title: "TEAM", icon: Users, color: "from-accent-foreground to-accent-foreground/80" },
  { id: "trends", code: "TRD", title: "TRENDS", icon: TrendingUp, color: "from-status-info to-primary" }
];

// Helper to process message content
function processMessageContent(content: string): { displayContent: string; insights: InsightCard[]; suggestions: string[] } {
  const { content: withoutInsights, insights } = parseInsightCards(content);
  const { content: displayContent, suggestions } = parseSuggestions(withoutInsights);
  return { displayContent, insights, suggestions };
}

export function DatabaseView() {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [businessData, setBusinessData] = useState<BusinessData | null>(null);
  const [researchSummary, setResearchSummary] = useState<ResearchSummary | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
  const [researchFindings, setResearchFindings] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hasConnected, setHasConnected] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Check DB for existing connections instead of localStorage
  useEffect(() => {
    const checkConnections = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsCheckingConnection(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('user_connections')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('status', 'connected')
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasConnected(true);
        }
      } catch (err) {
        console.error("Failed to check connections:", err);
      }
      setIsCheckingConnection(false);
    };

    checkConnections();
  }, []);
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
        setResearchFindings(parsed.findings || parsed.analysis || null);
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
    setSuggestions([]);

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
              // Parse and update with insights
              const { displayContent, insights, suggestions: newSuggestions } = processMessageContent(assistantContent);
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: displayContent,
                  insights: insights.length > 0 ? insights : undefined
                };
                return newMessages;
              });
              if (newSuggestions.length > 0) {
                setSuggestions(newSuggestions);
              }
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

  const handleConnectComplete = () => {
    setHasConnected(true);
  };

  if (isCheckingConnection) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasConnected) {
    return <ConnectBusinessDNA onComplete={handleConnectComplete} />;
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      {/* Theme blue radial gradient at the bottom */}
      <BgGradient
        gradientFrom="hsl(var(--background))"
        gradientTo="hsl(var(--primary) / 0.3)"
        gradientSize="150% 60%"
        gradientPosition="50% 100%"
        gradientStop="70%"
        className="z-0"
      />

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
                    <DatabaseChatMessage
                      role={message.role}
                      content={message.content}
                      insightCards={message.insights}
                      isStreaming={isLoading && index === messages.length - 1 && message.role === "assistant"}
                    />
                  </div>
                ))}
                {/* Suggested actions after last message */}
                {!isLoading && suggestions.length > 0 && (
                  <div className="pt-2">
                    <SuggestedActions
                      suggestions={suggestions}
                      onSelect={(suggestion) => sendMessage(suggestion)}
                      isLoading={isLoading}
                    />
                  </div>
                )}
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
                const questions = generatePersonalizedQuestions(module.id, businessData, researchSummary, researchFindings);

                return (
                  <div
                    key={module.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredModule(module.id)}
                    onMouseLeave={() => setHoveredModule(null)}
                    onClick={() => module.id === "uploads" && setShowUploadPanel(true)}
                    style={{ zIndex: isHovered ? 50 : 10 - index }}
                  >
                    {/* Tab-style card that expands on hover */}
                    <div
                      className={cn(
                        "relative cursor-pointer transition-all duration-400 ease-out origin-bottom",
                        isHovered ? "w-72" : "w-28"
                      )}
                    >
                      {/* Folder tab */}
                      <div className={cn(
                        "absolute -top-6 left-2 h-7 rounded-t-lg transition-all duration-300",
                        "bg-gradient-to-b",
                        module.color,
                        isHovered ? "right-4 shadow-glow" : "right-8"
                      )}>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/90 tracking-wider">
                          {module.code}
                        </span>
                      </div>

                      {/* Main card body */}
                      <div className={cn(
                        "relative rounded-lg transition-all duration-400 overflow-hidden",
                        "bg-gradient-to-b from-card to-card/80",
                        "border border-border/50",
                        isHovered ? "h-auto min-h-[160px] border-primary/50 shadow-glow" : "h-36"
                      )}>
                        {/* Collapsed view - icon and title */}
                        <div className={cn(
                          "absolute inset-0 flex flex-col items-center justify-center p-3 transition-all duration-300",
                          isHovered ? "opacity-0 pointer-events-none" : "opacity-100"
                        )}>
                          <div className={cn(
                            "p-2.5 rounded-xl mb-2 transition-all duration-300",
                            "bg-gradient-to-br",
                            module.color
                          )}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <span className="text-[10px] font-semibold tracking-wider text-center text-muted-foreground">
                            {module.title}
                          </span>
                          <div className="flex gap-1 mt-2">
                            <span className={cn(
                              "h-1 w-1 rounded-full",
                              hasBusinessData ? "bg-primary" : "bg-muted-foreground/30"
                            )} />
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/10" />
                          </div>
                        </div>

                        {/* Expanded view - questions panel */}
                        <div className={cn(
                          "p-4 transition-all duration-400",
                          isHovered ? "opacity-100" : "opacity-0"
                        )}>
                          {/* Header */}
                          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/30">
                            <div className={cn("p-1.5 rounded-lg bg-gradient-to-br shrink-0", module.color)}>
                              <Icon className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{module.title}</p>
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                {hasBusinessData ? "Your Insights" : "Quick Access"}
                              </p>
                            </div>
                          </div>

                          {/* Questions */}
                          <div className="space-y-1.5">
                            {questions.map((question, idx) => (
                              <button
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuestionClick(question);
                                }}
                                className={cn(
                                  "w-full text-left px-2.5 py-2 rounded-lg text-[11px] transition-all duration-200",
                                  "bg-muted/40 hover:bg-primary/20 hover:text-primary",
                                  "border border-transparent hover:border-primary/30",
                                  "flex items-center gap-2 group/q"
                                )}
                              >
                                <Sparkles className="h-3 w-3 text-primary/50 group-hover/q:text-primary shrink-0" />
                                <span className="line-clamp-2 leading-tight">{question}</span>
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

        {/* Upload Panel - slides up when uploads folder is clicked */}
        {showUploadPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl border border-border/50 shadow-2xl overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Upload Files</h3>
                    <p className="text-xs text-muted-foreground">PDFs, images, and documents for AI analysis</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadPanel(false)}
                  className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Upload zone */}
              <div className="p-6">
                <FileUploadZone 
                  onFileUploaded={() => {
                    setUploadedFilesCount(prev => prev + 1);
                  }}
                />
              </div>
              
              {/* Panel footer */}
              <div className="flex items-center justify-between p-4 border-t border-border/30 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  {uploadedFilesCount > 0 
                    ? `${uploadedFilesCount} file${uploadedFilesCount > 1 ? 's' : ''} analyzed` 
                    : "Uploaded files become part of your AI context"
                  }
                </p>
                <button
                  onClick={() => setShowUploadPanel(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
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
