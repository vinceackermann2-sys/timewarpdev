import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, Mail, FileText, Calendar, CheckCircle2, 
  Loader2, AlertTriangle, Sparkles, ArrowRight,
  Eye, Lightbulb, Target
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AnalysisStep {
  type: "thought" | "action" | "observation" | "finding" | "complete";
  content: string;
  data?: any;
}

interface LiveAnalysisViewProps {
  role: string;
  mode: string;
  onComplete: () => void;
  onTakeControl: () => void;
}

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-workspace`;

export function LiveAnalysisView({ role, mode, onComplete, onTakeControl }: LiveAnalysisViewProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [finding, setFinding] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ emails: 0, docs: 0, events: 0 });

  const startAnalysis = useCallback(async () => {
    setIsRunning(true);
    setSteps([]);
    setCurrentItem(null);
    setFinding(null);
    setIsComplete(false);

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({
          title: "Authentication Required",
          description: "Please sign in with Google to analyze your workspace.",
          variant: "destructive",
        });
        setIsRunning(false);
        return;
      }

      const accessToken = session.provider_token;
      if (!accessToken) {
        toast({
          title: "Google Connection Required",
          description: "Please reconnect with Google to access your workspace data.",
          variant: "destructive",
        });
        setIsRunning(false);
        return;
      }

      const response = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accessToken, role }),
      });

      if (!response.ok) {
        throw new Error("Failed to start analysis");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const step: AnalysisStep = JSON.parse(jsonStr);
            
            setSteps(prev => [...prev, step]);

            // Update current item being viewed
            if (step.data && step.type === "observation") {
              setCurrentItem(step.data);
            }

            // Handle finding
            if (step.type === "finding" && step.data) {
              setFinding(step.data);
            }

            // Handle completion
            if (step.type === "complete") {
              setIsComplete(true);
              if (step.data?.summary) {
                setStats({
                  emails: step.data.summary.emailsAnalyzed || 0,
                  docs: step.data.summary.documentsAnalyzed || 0,
                  events: step.data.summary.eventsAnalyzed || 0,
                });
              }
              if (step.data?.issue && !finding) {
                setFinding(step.data);
              }
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze workspace",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  }, [role, toast, finding]);

  // Start analysis on mount
  useEffect(() => {
    startAnalysis();
  }, []);

  const getStepIcon = (type: string) => {
    switch (type) {
      case "thought": return <Brain className="h-4 w-4 text-purple-400" />;
      case "action": return <Target className="h-4 w-4 text-blue-400" />;
      case "observation": return <Eye className="h-4 w-4 text-cyan-400" />;
      case "finding": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "complete": return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "email": return <Mail className="h-5 w-5 text-red-400" />;
      case "document": return <FileText className="h-5 w-5 text-blue-400" />;
      case "event": return <Calendar className="h-5 w-5 text-green-400" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const roleLabel = role?.toUpperCase() || "CEO";

  return (
    <div className="min-h-screen portal-bg flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{ backgroundImage: 'url(/stardust.png)', backgroundRepeat: 'repeat', opacity: 0.3 }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-nebula"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-6 pb-4">
        <div className="container mx-auto px-4 flex flex-col items-center">
          <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase mb-2">
            {roleLabel} Intelligence Core
          </span>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : isComplete ? 'bg-green-400' : 'bg-muted'}`} />
            <span className="text-sm text-muted-foreground">
              {isRunning ? "Live Analysis in Progress" : isComplete ? "Analysis Complete" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <main className="flex-1 relative z-10 container mx-auto px-4 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          
          {/* Left Panel - "Browser" showing current data */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl">
            {/* Browser Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a2e]/80 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <div className="flex-1">
                <div className="px-3 py-1 rounded bg-white/5 border border-white/10 text-xs text-muted-foreground">
                  workspace://google/{currentItem?.type || 'connecting'}
                </div>
              </div>
            </div>

            {/* Browser Content */}
            <div className="p-6 h-[400px] flex flex-col">
              {!currentItem && isRunning && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-accent mb-4" />
                  <p className="text-muted-foreground">Connecting to Google Workspace...</p>
                </div>
              )}

              {currentItem && (
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    {getItemIcon(currentItem.type)}
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                      Currently Viewing: {currentItem.type}
                    </span>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    {currentItem.type === "email" && (
                      <>
                        <h3 className="font-medium text-lg mb-2 text-foreground">{currentItem.subject}</h3>
                        <p className="text-sm text-muted-foreground mb-3">From: {currentItem.from}</p>
                        {currentItem.snippet && (
                          <p className="text-sm text-muted-foreground/80 italic">
                            "{currentItem.snippet?.slice(0, 150)}..."
                          </p>
                        )}
                        <div className="flex gap-2 mt-4">
                          {currentItem.labels?.map((label: string) => (
                            <span key={label} className="text-xs px-2 py-1 rounded bg-white/10 text-muted-foreground">
                              {label}
                            </span>
                          ))}
                        </div>
                      </>
                    )}

                    {currentItem.type === "document" && (
                      <>
                        <h3 className="font-medium text-lg mb-2 text-foreground">{currentItem.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Type: {currentItem.mimeType?.split('.').pop() || 'File'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last modified: {new Date(currentItem.modifiedTime).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Shared: {currentItem.shared ? 'Yes' : 'No'}
                        </p>
                      </>
                    )}

                    {currentItem.type === "event" && (
                      <>
                        <h3 className="font-medium text-lg mb-2 text-foreground">{currentItem.summary}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Attendees: {currentItem.attendees || 0}
                        </p>
                        {currentItem.start && (
                          <p className="text-sm text-muted-foreground">
                            Starts: {new Date(currentItem.start.dateTime || currentItem.start.date).toLocaleString()}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Stats bar */}
              {(isComplete || stats.emails > 0) && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                    <div className="text-xl font-bold text-red-400">{stats.emails}</div>
                    <div className="text-xs text-muted-foreground">Emails</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                    <div className="text-xl font-bold text-blue-400">{stats.docs}</div>
                    <div className="text-xs text-muted-foreground">Documents</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                    <div className="text-xl font-bold text-green-400">{stats.events}</div>
                    <div className="text-xs text-muted-foreground">Events</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - AI Reasoning Stream */}
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl flex flex-col">
            {/* AI Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a2e]/80 border-b border-white/10">
              <Brain className="h-5 w-5 text-purple-400" />
              <span className="text-sm font-medium">AI Reasoning</span>
              {isRunning && <Loader2 className="h-4 w-4 animate-spin ml-auto text-accent" />}
            </div>

            {/* Reasoning Stream */}
            <ScrollArea className="flex-1 p-4 h-[350px]">
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={i} className="flex gap-3 animate-fade-in">
                    <div className="flex-shrink-0 mt-1">
                      {getStepIcon(step.type)}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${
                        step.type === "thought" ? "text-purple-300 italic" :
                        step.type === "action" ? "text-blue-300" :
                        step.type === "finding" ? "text-amber-300 font-medium" :
                        step.type === "complete" ? "text-green-300 font-medium" :
                        "text-muted-foreground"
                      }`}>
                        {step.content}
                      </p>
                    </div>
                  </div>
                ))}

                {isRunning && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Finding Card */}
            {finding && (
              <div className="p-4 border-t border-white/10 bg-gradient-to-b from-amber-500/10 to-transparent">
                <div className="flex items-start gap-3 mb-3">
                  <Lightbulb className="h-6 w-6 text-amber-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-foreground">{finding.issue?.title || "Improvement Found"}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{finding.issue?.description}</p>
                  </div>
                </div>

                {finding.improvement && (
                  <div className="bg-green-500/10 rounded-lg p-3 mt-3 border border-green-500/20">
                    <h4 className="font-medium text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {finding.improvement.title}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{finding.improvement.description}</p>
                    {finding.improvement.firstStep && (
                      <p className="text-sm text-green-400 mt-2">
                        ➡️ First step: {finding.improvement.firstStep}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            {isComplete && (
              <div className="p-4 border-t border-white/10 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => startAnalysis()}
                  className="flex-1 border-white/20"
                >
                  Run Again
                </Button>
                <Button
                  onClick={onComplete}
                  className="flex-1"
                >
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
