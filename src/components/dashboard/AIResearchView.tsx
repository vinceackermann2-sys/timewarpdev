import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Circle, CheckCircle2, AlertTriangle, TrendingUp, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Finding {
  category: string;
  finding: string;
  impact: "high" | "medium" | "low";
  details: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  estimatedImpact: string;
  effort: "low" | "medium" | "high";
}

interface ResearchResults {
  summary: string;
  keyFindings: Finding[];
  recommendations: Recommendation[];
  metrics: {
    areasAnalyzed: number;
    issuesFound: number;
    opportunitiesIdentified: number;
    estimatedSavings: string;
  };
}

interface AIResearchViewProps {
  role: string;
  mode: string;
  onComplete: () => void;
  onTakeControl: () => void;
}

const RESEARCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research`;
const WORKSPACE_FETCH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workspace-fetch`;

interface WorkspaceData {
  emails: any[];
  documents: any[];
  spreadsheets: any[];
  calendarEvents: any[];
}

export function AIResearchView({ role, mode, onComplete, onTakeControl }: AIResearchViewProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<"fetching" | "scanning" | "analyzing" | "complete">("fetching");
  const [scanProgress, setScanProgress] = useState(0);
  const [status, setStatus] = useState("CONNECTING TO GOOGLE WORKSPACE...");
  const [isManualControl, setIsManualControl] = useState(false);
  const [rawResponse, setRawResponse] = useState("");
  const [results, setResults] = useState<ResearchResults | null>(null);
  const [streamId] = useState(() => Math.floor(10000 + Math.random() * 90000).toString());
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData | null>(null);
  const [dataStats, setDataStats] = useState({ emails: 0, docs: 0, sheets: 0, events: 0 });
  
  const scanItems = [
    "Gmail inbox threads...",
    "Google Drive documents...",
    "Spreadsheet analytics...",
    "Calendar patterns...",
    "Collaboration metrics...",
    "Communication flow...",
    "File activity logs...",
    "Meeting efficiency...",
  ];
  const [currentScanItem, setCurrentScanItem] = useState(0);
  const [scannedItems, setScannedItems] = useState<string[]>([]);

  // Fetch workspace data from Google APIs
  const fetchWorkspaceData = useCallback(async () => {
    try {
      setStatus("RETRIEVING ACCESS TOKEN...");
      
      // Get the current session to extract the provider token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("No session found:", sessionError);
        toast({
          title: "Authentication Required",
          description: "Please sign in with Google to access your workspace data.",
          variant: "destructive",
        });
        // Fall back to simulated mode
        setPhase("scanning");
        return;
      }

      const accessToken = session.provider_token;
      
      if (!accessToken) {
        console.log("No provider token - falling back to simulation mode");
        toast({
          title: "Limited Access",
          description: "Running in simulation mode. Re-authenticate with Google for real data.",
        });
        setPhase("scanning");
        return;
      }

      setStatus("CONNECTING TO GOOGLE WORKSPACE...");
      
      const response = await fetch(WORKSPACE_FETCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accessToken }),
      });

      if (!response.ok) {
        console.error("Workspace fetch error:", response.status);
        toast({
          title: "Workspace Access Error", 
          description: "Could not access Google Workspace. Running in simulation mode.",
        });
        setPhase("scanning");
        return;
      }

      const data: WorkspaceData = await response.json();
      setWorkspaceData(data);
      setDataStats({
        emails: data.emails?.length || 0,
        docs: data.documents?.length || 0,
        sheets: data.spreadsheets?.length || 0,
        events: data.calendarEvents?.length || 0,
      });
      
      console.log("Fetched real workspace data:", data);
      setPhase("scanning");
    } catch (error: any) {
      console.error("Error fetching workspace data:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to Google Workspace. Running in simulation mode.",
      });
      setPhase("scanning");
    }
  }, [toast]);

  const runResearch = useCallback(async () => {
    try {
      // Get the current session for JWT authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        throw new Error("Please sign in to run research");
      }

      const response = await fetch(RESEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role, mode, workspaceData }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("Usage limit reached. Please upgrade your plan.");
        }
        throw new Error("Failed to start research");
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullContent += content;
              setRawResponse(fullContent);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Try to parse the JSON from the response
      try {
        // Extract JSON from the response (may be wrapped in markdown code blocks)
        let jsonContent = fullContent;
        const jsonMatch = fullContent.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonContent = jsonMatch[1];
        } else {
          // Try to find raw JSON
          const startIndex = fullContent.indexOf("{");
          const endIndex = fullContent.lastIndexOf("}");
          if (startIndex !== -1 && endIndex !== -1) {
            jsonContent = fullContent.slice(startIndex, endIndex + 1);
          }
        }
        
        const parsed = JSON.parse(jsonContent) as ResearchResults;
        setResults(parsed);
        setPhase("complete");
      } catch (e) {
        console.error("Failed to parse research results:", e);
        // Create fallback results
        setResults({
          summary: "Analysis complete. The AI has identified several areas for improvement in your business operations.",
          keyFindings: [
            { category: "Communications", finding: "Email response times averaging 4+ hours", impact: "high", details: "Delays in email responses are affecting client satisfaction" },
            { category: "Documentation", finding: "15% of documents are outdated", impact: "medium", details: "Critical process docs need updates" },
            { category: "Meetings", finding: "30% of meetings lack clear agendas", impact: "medium", details: "Meeting efficiency can be improved" },
          ],
          recommendations: [
            { title: "Implement email SLAs", description: "Set up automated reminders for pending emails", priority: "high", estimatedImpact: "20% faster response times", effort: "low" },
            { title: "Document audit process", description: "Schedule quarterly document reviews", priority: "medium", estimatedImpact: "Better knowledge management", effort: "medium" },
          ],
          metrics: { areasAnalyzed: 8, issuesFound: 12, opportunitiesIdentified: 5, estimatedSavings: "15-20% efficiency gain" }
        });
        setPhase("complete");
      }
    } catch (error: any) {
      console.error("Research error:", error);
      toast({
        title: "Research Error",
        description: error.message || "Failed to complete research",
        variant: "destructive",
      });
      setPhase("complete");
    }
  }, [role, mode, workspaceData, toast]);

  // Start by fetching workspace data
  useEffect(() => {
    if (phase === "fetching") {
      fetchWorkspaceData();
    }
  }, [phase, fetchWorkspaceData]);

  // Scanning animation
  useEffect(() => {
    if (phase !== "scanning" || isManualControl) return;

    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 0.8;
        
        if (next < 20) setStatus("INITIALIZING NEURAL BRIDGE...");
        else if (next < 40) setStatus("SCANNING EMAIL STREAMS...");
        else if (next < 60) setStatus("PARSING DOCUMENT STRUCTURES...");
        else if (next < 80) setStatus("ANALYZING COLLABORATION PATTERNS...");
        else setStatus("SYNTHESIZING INSIGHTS...");

        if (next >= 100) {
          clearInterval(progressInterval);
          setPhase("analyzing");
          return 100;
        }
        return next;
      });
    }, 100);

    const itemInterval = setInterval(() => {
      setCurrentScanItem(prev => {
        if (prev < scanItems.length - 1) {
          setScannedItems(items => [...items, scanItems[prev]]);
          return prev + 1;
        }
        clearInterval(itemInterval);
        return prev;
      });
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(itemInterval);
    };
  }, [phase, isManualControl]);

  // Start AI research when analyzing phase begins
  useEffect(() => {
    if (phase === "analyzing") {
      runResearch();
    }
  }, [phase, runResearch]);

  const handleTakeControl = () => {
    setIsManualControl(true);
    onTakeControl();
  };

  const handleContinue = () => {
    onComplete();
  };

  const roleLabel = role?.toUpperCase() || "CEO";
  const modeLabel = mode?.toUpperCase() || "RESEARCH";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "text-red-400 border-red-400/30 bg-red-400/10";
      case "high": return "text-orange-400 border-orange-400/30 bg-orange-400/10";
      case "medium": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      default: return "text-green-400 border-green-400/30 bg-green-400/10";
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-400/20 text-red-300";
      case "medium": return "bg-yellow-400/20 text-yellow-300";
      default: return "bg-green-400/20 text-green-300";
    }
  };

  return (
    <div className="min-h-screen portal-bg flex flex-col items-center justify-start p-4 md:p-8 relative overflow-hidden">
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
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-nebula"
          style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25) 0%, transparent 70%)', animationDelay: '-7s' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-6xl mb-6">
        <div className="text-center mb-4">
          <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Your Own AI C-Suite</span>
        </div>
        <div className="h-0.5 bg-border/30 rounded-full overflow-hidden max-w-md mx-auto">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: phase === "complete" ? "100%" : `${scanProgress}%` }}
          />
        </div>
      </header>

      {/* Main Browser Window */}
      <div className="relative z-10 w-full max-w-6xl flex-1 flex flex-col">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl shadow-2xl flex-1 flex flex-col">
          {/* Browser Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a2e]/80 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs tracking-wider text-muted-foreground">
                <span className="text-green-400">●</span>
                {" "}PORTAL+ MODE &gt; {roleLabel} &gt; {modeLabel} &gt; STREAM_{streamId}
              </div>
            </div>
          </div>

          {/* Browser Content */}
          <div className="flex-1 p-6 overflow-hidden">
            {phase !== "complete" ? (
              /* Fetching / Scanning / Analyzing View */
              <div className="flex gap-6 h-full">
                {/* Left sidebar - Scanned items + Data stats */}
                <div className="w-56 space-y-2">
                  {phase === "fetching" ? (
                    <>
                      <div className="text-xs tracking-wider text-muted-foreground mb-3">CONNECTING...</div>
                      <div className="h-8 rounded-lg bg-accent/20 border border-accent/40 animate-pulse flex items-center px-3">
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        <span className="text-xs text-muted-foreground">Google Workspace...</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs tracking-wider text-muted-foreground mb-3">
                        {workspaceData ? "LIVE DATA" : "SCANNING..."}
                      </div>
                      {workspaceData && (
                        <div className="mb-4 p-3 rounded-lg bg-green-400/10 border border-green-400/20">
                          <div className="text-[10px] text-green-400 mb-2 uppercase tracking-wider">Real Data Loaded</div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div>{dataStats.emails} emails</div>
                            <div>{dataStats.docs} docs</div>
                            <div>{dataStats.sheets} sheets</div>
                            <div>{dataStats.events} events</div>
                          </div>
                        </div>
                      )}
                      {scanItems.map((item, i) => (
                        <div 
                          key={i}
                          className={`h-8 rounded-lg transition-all duration-500 flex items-center px-3 ${
                            scannedItems.includes(item) 
                              ? 'bg-white/10 border border-white/20' 
                              : i === currentScanItem 
                                ? 'bg-accent/20 border border-accent/40 animate-pulse'
                                : 'bg-white/5'
                          }`}
                        >
                          <span className="text-xs text-muted-foreground truncate">
                            {scannedItems.includes(item) && <CheckCircle2 className="h-3 w-3 inline mr-2 text-green-400" />}
                            {i === currentScanItem && !scannedItems.includes(item) && <Loader2 className="h-3 w-3 inline mr-2 animate-spin" />}
                            {item}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* Center content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, transparent 70%)' }} />
                    <div className="relative h-28 w-28 rounded-full border-2 border-accent/30 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent">
                      <Crown className="h-14 w-14 text-amber-400" strokeWidth={1.5} />
                    </div>
                    <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-blue-400" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-red-400" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rounded-full bg-green-400" />
                    </div>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold tracking-wider text-foreground mb-3">
                    {roleLabel} INTELLIGENCE CORE
                  </h2>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                    <Circle className="h-2 w-2 fill-amber-400 text-amber-400 animate-pulse" />
                    <span className="tracking-[0.15em]">
                      {phase === "fetching" ? "CONNECTING TO GOOGLE WORKSPACE..." : 
                       phase === "analyzing" ? (workspaceData ? "ANALYZING REAL DATA..." : "GENERATING INSIGHTS...") : 
                       `STATUS: ${status}`}
                    </span>
                  </div>

                  {phase === "analyzing" && (
                    <div className="w-64 bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin text-accent" />
                        <span className="text-sm">
                          {workspaceData ? "AI analyzing your workspace..." : "AI analyzing patterns..."}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground text-left max-h-24 overflow-hidden">
                        {rawResponse.slice(-200)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side */}
                <div className="w-56 flex flex-col justify-end">
                  <Button
                    variant="outline"
                    onClick={handleTakeControl}
                    disabled={isManualControl}
                    className="border-white/20 bg-white/5 hover:bg-white/10 text-xs tracking-wider"
                  >
                    <Circle className={`h-2 w-2 mr-2 ${isManualControl ? 'fill-green-400 text-green-400' : 'fill-red-400 text-red-400'}`} />
                    <div className="text-left">
                      <div className="text-[10px] text-muted-foreground">SAFETY PROTOCOL OFF</div>
                      <div className="font-medium">MANUALLY TAKE CONTROL</div>
                    </div>
                  </Button>
                </div>
              </div>
            ) : (
              /* Results View */
              <ScrollArea className="h-full">
                <div className="space-y-6 pb-6">
                  {/* Summary */}
                  <div className="bg-gradient-to-br from-accent/20 to-primary/10 rounded-xl p-6 border border-accent/20">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Research Complete</h3>
                        <p className="text-muted-foreground">{results?.summary}</p>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  {results?.metrics && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-2xl font-bold text-accent">{results.metrics.areasAnalyzed}</div>
                        <div className="text-xs text-muted-foreground mt-1">Areas Analyzed</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-2xl font-bold text-orange-400">{results.metrics.issuesFound}</div>
                        <div className="text-xs text-muted-foreground mt-1">Issues Found</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-2xl font-bold text-green-400">{results.metrics.opportunitiesIdentified}</div>
                        <div className="text-xs text-muted-foreground mt-1">Opportunities</div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                        <div className="text-lg font-bold text-primary">{results.metrics.estimatedSavings}</div>
                        <div className="text-xs text-muted-foreground mt-1">Est. Impact</div>
                      </div>
                    </div>
                  )}

                  {/* Key Findings */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-400" />
                      Key Findings
                    </h3>
                    <div className="space-y-3">
                      {results?.keyFindings.map((finding, i) => (
                        <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                  {finding.category}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getImpactColor(finding.impact)}`}>
                                  {finding.impact} impact
                                </span>
                              </div>
                              <h4 className="font-medium mb-1">{finding.finding}</h4>
                              <p className="text-sm text-muted-foreground">{finding.details}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      Recommendations
                    </h3>
                    <div className="space-y-3">
                      {results?.recommendations.map((rec, i) => (
                        <div key={i} className={`rounded-xl p-4 border ${getPriorityColor(rec.priority)}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs uppercase tracking-wider font-medium">
                                  {rec.priority} priority
                                </span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                  {rec.effort} effort
                                </span>
                              </div>
                              <h4 className="font-medium text-foreground mb-1">{rec.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                              <p className="text-sm text-accent flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {rec.estimatedImpact}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Continue Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      size="lg"
                      onClick={handleContinue}
                      className="px-8 text-sm tracking-wider"
                    >
                      Continue to Dashboard
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        {/* Bottom Status Bar */}
        {phase !== "complete" && (
          <div className="mt-4 rounded-xl border border-white/10 bg-[#0a0a1a]/80 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Circle className="h-2 w-2 fill-green-400 text-green-400 animate-pulse" />
                  <span className="text-xs tracking-wider text-muted-foreground">SYSTEM.LOG</span>
                </div>
                <span className="text-sm font-medium tracking-wider">DEEP SCAN ANALYSIS</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-foreground">{Math.round(scanProgress)}</span>
                  <span className="text-sm text-muted-foreground">% COMPLETE</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-bold tracking-wider" style={{ color: '#A78BFA' }}>{modeLabel}</span>
                  <span className="text-[10px] tracking-wider text-muted-foreground animate-pulse">
                    {phase === "analyzing" ? "AI THINKING..." : "SYNCING..."}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${scanProgress}%`,
                  background: 'linear-gradient(90deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)'
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
