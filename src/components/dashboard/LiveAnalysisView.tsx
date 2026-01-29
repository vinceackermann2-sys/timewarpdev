import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Brain, Mail, FileText, Calendar, CheckCircle2, 
  Loader2, Sparkles, Rocket, Eye, AlertTriangle,
  Lightbulb, Target, Search, Zap, Shield, Lock,
  LayoutDashboard, BarChart3, Users
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
          <div className="p-6 h-full flex flex-col">
            {/* Analysis State - Activity Log */}
            {isRunning && (
              <div className="w-full h-full flex flex-col animate-fade-in">
                {/* Live Activity Log Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Brain className="h-4 w-4 text-accent" />
                      <div className="absolute inset-0 animate-ping">
                        <Brain className="h-4 w-4 text-accent/50" />
                      </div>
                    </div>
                    <span className="text-sm font-medium text-accent">Live Activity Log</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Mail className="h-3 w-3 text-red-400" />{stats.emails}</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3 text-blue-400" />{stats.docs}</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-green-400" />{stats.events}</span>
                  </div>
                </div>

                {/* Scrollable Activity Log */}
                <div className="flex-1 overflow-y-auto rounded-xl bg-[#030308] border border-white/5 p-3 font-mono text-xs space-y-1.5">
                  {steps.slice(-15).map((step, index) => (
                    <div key={index} className="flex items-start gap-2 animate-fade-in">
                      <span className="text-muted-foreground/50 w-16 flex-shrink-0">
                        {step.timestamp?.toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <span className="flex-shrink-0">{getStepIcon(step.type)}</span>
                      <span className={`flex-1 ${
                        step.type === 'thought' ? 'text-purple-300/80' :
                        step.type === 'action' ? 'text-blue-300/80' :
                        step.type === 'observation' ? 'text-cyan-300/80' :
                        step.type === 'finding' ? 'text-amber-300' :
                        'text-muted-foreground'
                      }`}>
                        {step.type === 'action' && <span className="text-blue-400">[SCAN] </span>}
                        {step.type === 'observation' && <span className="text-cyan-400">[DATA] </span>}
                        {step.type === 'thought' && <span className="text-purple-400">[THINK] </span>}
                        {step.type === 'finding' && <span className="text-amber-400">[FOUND] </span>}
                        {step.content.length > 80 ? step.content.slice(0, 80) + '...' : step.content}
                      </span>
                    </div>
                  ))}
                  {steps.length === 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Initializing secure connection...</span>
                    </div>
                  )}
                  {/* Auto-scroll anchor */}
                  <div className="h-1" />
                </div>

                {/* Current Item Preview */}
                {currentItem && (
                  <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center gap-2 mb-2">
                      {getItemIcon(currentItem.type)}
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        Currently Analyzing
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium truncate">
                      {currentItem.subject || currentItem.name || currentItem.summary || 'Processing...'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Complete State - Show Recommendation in Browser */}
            {isComplete && finding && (
              <div className="w-full max-w-3xl animate-fade-in">
                {/* Header - CEO Analysis */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-red-500/20">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-xs text-accent uppercase tracking-wider font-medium">{roleLabel} Analysis</p>
                    <h3 className="font-semibold text-lg text-foreground">Inefficiency Detected</h3>
                  </div>
                </div>

                {/* Before/After Visual Comparison */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {/* Before - Problem Visualization */}
                  <div className="rounded-xl overflow-hidden border border-red-500/30 bg-gradient-to-br from-red-950/40 to-red-900/10">
                    <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/20 flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3 text-red-400" />
                      <span className="text-xs font-medium text-red-400 uppercase tracking-wider">Current State</span>
                    </div>
                    <div className="aspect-video relative overflow-hidden p-4">
                      {/* Visual: Scattered emails, docs, calendar chaos */}
                      <div className="absolute inset-0 flex flex-col justify-center items-center gap-1">
                        {/* Overlapping, rotated, chaotic items */}
                        <div className="relative w-full h-full">
                          <div className="absolute top-2 left-3 rotate-[-8deg] bg-red-400/10 border border-red-400/20 rounded-lg p-2 w-24">
                            <Mail className="h-3 w-3 text-red-400/60 mb-1" />
                            <div className="h-1.5 bg-red-400/20 rounded w-full" />
                            <div className="h-1.5 bg-red-400/10 rounded w-2/3 mt-1" />
                          </div>
                          <div className="absolute top-6 right-4 rotate-[12deg] bg-red-400/10 border border-red-400/20 rounded-lg p-2 w-20">
                            <FileText className="h-3 w-3 text-red-400/50 mb-1" />
                            <div className="h-1 bg-red-400/15 rounded w-full" />
                            <div className="h-1 bg-red-400/10 rounded w-1/2 mt-1" />
                          </div>
                          <div className="absolute bottom-4 left-8 rotate-[5deg] bg-red-400/10 border border-red-400/20 rounded-lg p-2 w-22">
                            <Calendar className="h-3 w-3 text-red-400/40 mb-1" />
                            <div className="h-1 bg-red-400/10 rounded w-full" />
                          </div>
                          <div className="absolute bottom-2 right-6 rotate-[-15deg] bg-red-400/10 border border-red-400/20 rounded-lg p-2 w-16">
                            <Mail className="h-3 w-3 text-red-400/30 mb-1" />
                            <div className="h-1 bg-red-400/10 rounded w-full" />
                          </div>
                          {/* Question marks indicating confusion */}
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl text-red-400/40">?</div>
                          <div className="absolute top-3 right-12 text-sm text-red-400/30">?</div>
                          <div className="absolute bottom-8 left-4 text-sm text-red-400/25">?</div>
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-red-950/80 via-transparent to-transparent" />
                    </div>
                    <div className="p-3 border-t border-red-500/20 bg-red-950/20">
                      <p className="text-xs text-red-300 font-medium mb-1">{finding.issue?.title || "Scattered Data"}</p>
                      <p className="text-[10px] text-red-300/60 line-clamp-2">{finding.issue?.description || "Information spread across emails, docs, and calendars with no central view"}</p>
                    </div>
                  </div>

                  {/* After - Solution Visualization */}
                  <div className="rounded-xl overflow-hidden border border-green-500/30 bg-gradient-to-br from-green-950/40 to-green-900/10">
                    <div className="px-3 py-2 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span className="text-xs font-medium text-green-400 uppercase tracking-wider">Recommended</span>
                    </div>
                    <div className="aspect-video relative overflow-hidden p-4">
                      {/* Visual: Organized dashboard with clear structure */}
                      <div className="absolute inset-0 flex flex-col p-3 gap-2">
                        {/* Dashboard header */}
                        <div className="flex items-center gap-2 mb-1">
                          <LayoutDashboard className="h-4 w-4 text-green-400" />
                          <div className="h-2 bg-green-400/40 rounded flex-1" />
                          <div className="h-2 bg-green-400/20 rounded w-12" />
                        </div>
                        {/* Dashboard widgets */}
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          <div className="rounded-lg bg-green-400/15 border border-green-400/20 p-2 flex flex-col items-center justify-center">
                            <BarChart3 className="h-4 w-4 text-green-400/80 mb-1" />
                            <div className="h-1 bg-green-400/30 rounded w-8" />
                          </div>
                          <div className="rounded-lg bg-green-400/12 border border-green-400/15 p-2 flex flex-col items-center justify-center">
                            <Users className="h-4 w-4 text-green-400/70 mb-1" />
                            <div className="h-1 bg-green-400/25 rounded w-6" />
                          </div>
                          <div className="rounded-lg bg-green-400/10 border border-green-400/10 p-2 flex flex-col items-center justify-center">
                            <Target className="h-4 w-4 text-green-400/60 mb-1" />
                            <div className="h-1 bg-green-400/20 rounded w-7" />
                          </div>
                        </div>
                        {/* Status bars */}
                        <div className="flex gap-2">
                          <div className="flex-1 h-2 bg-green-400/20 rounded-full overflow-hidden">
                            <div className="h-full w-3/4 bg-green-400/50 rounded-full" />
                          </div>
                          <CheckCircle2 className="h-3 w-3 text-green-400/60" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-green-950/80 via-transparent to-transparent" />
                    </div>
                    <div className="p-3 border-t border-green-500/20 bg-green-950/20">
                      <p className="text-xs text-green-300 font-medium mb-1">{finding.improvement?.title || "Unified Dashboard"}</p>
                      <p className="text-[10px] text-green-300/60 line-clamp-2">{finding.improvement?.description || "Centralized view with real-time metrics and organized workflows"}</p>
                    </div>
                  </div>
                </div>

                {/* Step-by-Step Action Plan with Business Benefits */}
                <div className="rounded-xl p-4 bg-gradient-to-br from-accent/10 to-purple-900/10 border border-accent/20 mb-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 rounded-lg bg-accent/20">
                      <Lightbulb className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground text-sm">What Your AI {roleLabel} Will Do</h4>
                      <p className="text-[10px] text-muted-foreground">3-step implementation plan</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Step 1 */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">1</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium mb-1">Consolidate Data Sources</p>
                        <p className="text-xs text-muted-foreground mb-2">Pull together all scattered information from emails, documents, and calendar events into a single unified view.</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Saves 5+ hours/week searching for information</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Step 2 */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">2</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium mb-1">Create Organized Structure</p>
                        <p className="text-xs text-muted-foreground mb-2">{finding?.improvement?.description || "Build clear categories, workflows, and processes that make sense for your business operations."}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Reduces confusion and duplicate work</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Step 3 */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-white">3</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium mb-1">Enable Real-Time Tracking</p>
                        <p className="text-xs text-muted-foreground mb-2">Set up automated dashboards and metrics so you always know the current status without asking anyone.</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Make faster, data-driven decisions</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set Your CEO To Work Button */}
                <div className="relative">
                  <Button
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-accent via-purple-500 to-accent bg-[length:200%_100%] animate-shimmer hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] transition-all duration-500 group"
                    onClick={() => {
                      console.log("Execute action clicked", finding);
                    }}
                  >
                    <Rocket className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                    Set Your {roleLabel} To Work
                    <Sparkles className="h-4 w-4 ml-2 animate-pulse" />
                  </Button>
                  
                  {/* Pulsing glow effect behind button */}
                  <div className="absolute inset-0 -z-10 rounded-md bg-accent/30 blur-xl animate-pulse-glow" />
                </div>
              </div>
            )}

            {/* Complete State - No finding */}
            {isComplete && !finding && (
              <div className="w-full max-w-2xl animate-fade-in">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="relative mb-4">
                    <CheckCircle2 className="h-16 w-16 text-green-400" />
                  </div>
                  <p className="text-xl font-medium text-foreground">Analysis Complete</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Scanned {stats.emails} emails, {stats.docs} documents, and {stats.events} events
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    No immediate improvements found. Your workspace looks well organized!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Simplified Progress Section - Just the loading bar */}
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl p-4">
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
      </main>
    </div>
  );
}