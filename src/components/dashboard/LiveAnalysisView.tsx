import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Brain, Mail, FileText, Calendar, CheckCircle2, 
  Loader2, AlertTriangle, Sparkles, Play,
  Eye, Lightbulb, Target, Search, Zap, Shield, Lock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
interface AnalysisStep {
  type: "thought" | "action" | "observation" | "finding" | "complete";
  content: string;
  data?: any;
  timestamp?: Date;
}

interface LiveAnalysisViewProps {
  role: string;
  mode: string;
  googleToken: string | null;
  onComplete: () => void;
  onTakeControl: () => void;
}

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-workspace`;

export function LiveAnalysisView({ role, mode, googleToken, onComplete }: LiveAnalysisViewProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<AnalysisStep[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [finding, setFinding] = useState<any>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [stats, setStats] = useState({ emails: 0, docs: 0, events: 0 });
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("Initializing...");
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const startAnalysis = useCallback(async () => {
    setIsRunning(true);
    setSteps([]);
    setCurrentItem(null);
    setFinding(null);
    setIsComplete(false);
    setProgress(0);
    setCurrentPhase("Connecting to Google Workspace...");
    setCurrentAction("Establishing secure connection...");

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

      const accessToken =
        googleToken ||
        sessionStorage.getItem("googleProviderToken") ||
        session.provider_token;
      if (!accessToken) {
        toast({
          title: "Google Connection Required",
          description: "Please sign out and reconnect with Google to access your workspace data.",
          variant: "destructive",
        });
        setIsRunning(false);
        return;
      }

      setProgress(5);
      setCurrentPhase("Starting analysis...");
      setCurrentAction("Initializing AI agent...");

      const response = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accessToken, role, mode }),
      });

      if (!response.ok) {
        throw new Error("Failed to start analysis");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let stepCount = 0;

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
            step.timestamp = new Date();
            stepCount++;
            
            setSteps(prev => [...prev, step]);

            // Update progress and phase based on step type
            if (step.type === "action") {
              setCurrentPhase(step.content);
              setCurrentAction(step.content);
              const newProgress = Math.min(10 + stepCount * 5, 90);
              setProgress(newProgress);
            }

            if (step.type === "thought") {
              setCurrentAction(step.content);
            }

            if (step.data && step.type === "observation") {
              setCurrentItem(step.data);
              setCurrentAction(`Analyzing ${step.data.type || 'data'}...`);
            }

            if (step.type === "finding" && step.data) {
              setFinding(step.data);
              setProgress(95);
              setCurrentPhase("Found improvement opportunity!");
              setCurrentAction("Preparing recommendations...");
            }

            if (step.type === "complete") {
              setIsComplete(true);
              setProgress(100);
              setCurrentPhase("Analysis complete");
              setCurrentAction(null);
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
  }, [role, mode, googleToken, toast, finding]);

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
      case "email": return <Mail className="h-6 w-6 text-red-400" />;
      case "document": return <FileText className="h-6 w-6 text-blue-400" />;
      case "event": return <Calendar className="h-6 w-6 text-green-400" />;
      default: return <FileText className="h-6 w-6" />;
    }
  };

  const roleLabel = role?.toUpperCase() || "CEO";
  const modeLabel = mode === "action" ? "Action" : "Research";
  const ModeIcon = mode === "action" ? Zap : Search;

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
          <div className="flex items-center gap-2 mb-2">
            <ModeIcon className="h-4 w-4 text-accent" />
            <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
              {roleLabel} {modeLabel} Mode
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : isComplete ? 'bg-green-400' : 'bg-muted'}`} />
            <span className="text-sm text-muted-foreground">
              {isRunning ? "Live Analysis in Progress" : isComplete ? "Analysis Complete" : "Ready"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content - Stacked Layout */}
      <main className="flex-1 relative z-10 container mx-auto px-4 pb-6 flex flex-col gap-4">
        
        {/* Secure Private Browser Window */}
        <div className="rounded-2xl overflow-hidden border border-accent/20 bg-[#050510]/95 backdrop-blur-xl flex-1 min-h-[400px] shadow-[0_0_60px_rgba(139,92,246,0.15)]">
          {/* Secure Browser Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#0f0f1a] to-[#1a1a2e] border-b border-accent/20">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            
            {/* Secure URL Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/30 text-xs flex-1">
                <Lock className="h-3 w-3 text-green-400" />
                <span className="text-green-400 font-medium">secure://</span>
                <span className="text-muted-foreground">private-workspace/{currentItem?.type || 'initializing'}</span>
                {isRunning && <Loader2 className="h-3 w-3 animate-spin ml-auto text-accent" />}
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/30">
              <Shield className="h-3 w-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-medium uppercase tracking-wider">Private</span>
            </div>
          </div>

          {/* Browser Content */}
          <div className="p-8 h-full flex flex-col items-center justify-center">
            {/* Loading State with Animation */}
            {isRunning && !currentItem && (
              <div className="flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="relative mb-6">
                  <div className="w-20 h-20 rounded-full border-2 border-accent/30 flex items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-accent" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping" />
                </div>
                <p className="text-foreground font-medium mb-2">{currentPhase}</p>
                {currentAction && (
                  <p className="text-sm text-muted-foreground animate-pulse">{currentAction}</p>
                )}
              </div>
            )}

            {/* Active Analysis with Current Action */}
            {isRunning && currentItem && (
              <div className="w-full max-w-2xl animate-fade-in">
                {/* Current Action Banner */}
                <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-accent/10 border border-accent/20">
                  <div className="relative">
                    <Brain className="h-5 w-5 text-accent" />
                    <div className="absolute inset-0 animate-ping">
                      <Brain className="h-5 w-5 text-accent/50" />
                    </div>
                  </div>
                  <span className="text-sm text-accent font-medium flex-1">{currentAction}</span>
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                </div>

                <div className="flex items-center gap-3 mb-4">
                  {getItemIcon(currentItem.type)}
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">
                    Analyzing: {currentItem.type}
                  </span>
                </div>

                <div className="bg-white/5 rounded-xl p-6 border border-white/10 animate-scale-in">
                  {currentItem.type === "email" && (
                    <>
                      <h3 className="font-medium text-xl mb-3 text-foreground">{currentItem.subject}</h3>
                      <p className="text-sm text-muted-foreground mb-4">From: {currentItem.from}</p>
                      {currentItem.snippet && (
                        <p className="text-sm text-muted-foreground/80 italic border-l-2 border-accent/30 pl-4">
                          "{currentItem.snippet?.slice(0, 200)}..."
                        </p>
                      )}
                    </>
                  )}

                  {currentItem.type === "document" && (
                    <>
                      <h3 className="font-medium text-xl mb-3 text-foreground">{currentItem.name}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Type: {currentItem.mimeType?.split('.').pop() || 'File'}</span>
                        <span>Modified: {new Date(currentItem.modifiedTime).toLocaleDateString()}</span>
                      </div>
                    </>
                  )}

                  {currentItem.type === "event" && (
                    <>
                      <h3 className="font-medium text-xl mb-3 text-foreground">{currentItem.summary}</h3>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>Attendees: {currentItem.attendees || 0}</span>
                        {currentItem.start && (
                          <span>Starts: {new Date(currentItem.start.dateTime || currentItem.start.date).toLocaleString()}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Stats bar */}
                {stats.emails > 0 && (
                  <div className="mt-6 grid grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                      <div className="text-2xl font-bold text-red-400">{stats.emails}</div>
                      <div className="text-xs text-muted-foreground">Emails</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                      <div className="text-2xl font-bold text-blue-400">{stats.docs}</div>
                      <div className="text-xs text-muted-foreground">Documents</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                      <div className="text-2xl font-bold text-green-400">{stats.events}</div>
                      <div className="text-xs text-muted-foreground">Events</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Complete State */}
            {isComplete && (
              <div className="w-full max-w-2xl animate-fade-in">
                <div className="flex flex-col items-center justify-center text-center mb-8">
                  <div className="relative mb-4">
                    <CheckCircle2 className="h-16 w-16 text-green-400" />
                  </div>
                  <p className="text-xl font-medium text-foreground">Analysis Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scanned {stats.emails} emails, {stats.docs} documents, and {stats.events} events
                  </p>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
                    <div className="text-3xl font-bold text-red-400">{stats.emails}</div>
                    <div className="text-sm text-muted-foreground">Emails</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
                    <div className="text-3xl font-bold text-blue-400">{stats.docs}</div>
                    <div className="text-sm text-muted-foreground">Documents</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
                    <div className="text-3xl font-bold text-green-400">{stats.events}</div>
                    <div className="text-sm text-muted-foreground">Events</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl p-6">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : isComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <Brain className="h-4 w-4 text-purple-400" />
                )}
                <span className="text-sm font-medium text-foreground">{currentPhase}</span>
              </div>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Steps Accordion */}
          {steps.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="steps" className="border-white/10">
                <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground hover:no-underline py-2">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    <span>View {steps.length} analysis steps</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-[200px] overflow-y-auto space-y-2 pt-2">
                    {steps.map((step, i) => (
                      <div key={i} className="flex gap-3 py-1 animate-fade-in">
                        <div className="flex-shrink-0 mt-0.5">
                          {getStepIcon(step.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${
                            step.type === "thought" ? "text-purple-300 italic" :
                            step.type === "action" ? "text-blue-300" :
                            step.type === "finding" ? "text-amber-300 font-medium" :
                            step.type === "complete" ? "text-green-300 font-medium" :
                            "text-muted-foreground"
                          }`}>
                            {step.content}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground/50 flex-shrink-0">
                          {step.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    ))}
                    
                    {isRunning && (
                      <div className="flex items-center gap-2 text-muted-foreground py-1">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Solution Recommendation Card */}
          {finding && (
            <div className="mt-4 rounded-xl overflow-hidden border border-accent/30 bg-gradient-to-b from-accent/10 via-accent/5 to-transparent animate-fade-in">
              {/* Recommendation Header */}
              <div className="px-5 py-4 bg-accent/10 border-b border-accent/20 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/20">
                  <Lightbulb className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-accent uppercase tracking-wider font-medium">AI Recommendation</p>
                  <h3 className="font-semibold text-foreground">{finding.issue?.title || "Improvement Opportunity"}</h3>
                </div>
              </div>
              
              {/* Issue Description */}
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {finding.issue?.description}
                </p>
              </div>

              {/* Solution Section */}
              {finding.improvement && (
                <div className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">Recommended Solution</span>
                  </div>
                  
                  <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 mb-4">
                    <h4 className="font-medium text-foreground mb-2">{finding.improvement.title}</h4>
                    <p className="text-sm text-muted-foreground">{finding.improvement.description}</p>
                    {finding.improvement.firstStep && (
                      <div className="mt-3 pt-3 border-t border-green-500/20">
                        <p className="text-sm text-green-400 flex items-start gap-2">
                          <Target className="h-4 w-4 flex-shrink-0 mt-0.5" />
                          <span><strong>First step:</strong> {finding.improvement.firstStep}</span>
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Execute Action Button */}
                  <Button
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-accent to-purple-500 hover:from-accent/90 hover:to-purple-500/90 shadow-[0_0_30px_rgba(139,92,246,0.3)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] transition-all duration-300"
                    onClick={() => {
                      // Placeholder - action execution will be implemented later
                      console.log("Execute action clicked", finding);
                    }}
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Execute This Action
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    AI will preview the action before executing
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
