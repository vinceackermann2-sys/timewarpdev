import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Crown, Circle, ArrowRight } from "lucide-react";

interface ScanPhase {
  id: string;
  label: string;
  progress: number;
}

interface DiscoveredItem {
  id: string;
  type: "email" | "document" | "spreadsheet" | "calendar";
  title: string;
  insight?: string;
}

interface AIResearchViewProps {
  role: string;
  mode: string;
  onComplete: () => void;
  onTakeControl: () => void;
}

export function AIResearchView({ role, mode, onComplete, onTakeControl }: AIResearchViewProps) {
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [status, setStatus] = useState("INITIALIZING NEURAL BRIDGE...");
  const [isManualControl, setIsManualControl] = useState(false);
  const [discoveredItems, setDiscoveredItems] = useState<DiscoveredItem[]>([]);
  const [streamId] = useState(() => Math.floor(10000 + Math.random() * 90000).toString());
  
  const phases: ScanPhase[] = [
    { id: "neural", label: "NEURAL BRIDGE", progress: 0 },
    { id: "stream", label: "STREAM PARSING", progress: 0 },
    { id: "api", label: "API SYNTHESIS", progress: 0 },
  ];

  const [phaseProgress, setPhaseProgress] = useState(phases);

  // Simulated scanning items
  const mockItems: DiscoveredItem[] = [
    { id: "1", type: "email", title: "Q4 Revenue Report Discussion" },
    { id: "2", type: "document", title: "Marketing Strategy 2026" },
    { id: "3", type: "spreadsheet", title: "Budget Allocation Sheet" },
    { id: "4", type: "email", title: "Partnership Proposal - TechCorp" },
    { id: "5", type: "calendar", title: "Board Meeting - Next Week" },
    { id: "6", type: "document", title: "Product Roadmap Draft" },
    { id: "7", type: "email", title: "Customer Feedback Summary" },
    { id: "8", type: "spreadsheet", title: "Sales Pipeline Q1" },
  ];

  useEffect(() => {
    if (isManualControl) return;

    const interval = setInterval(() => {
      setOverallProgress(prev => {
        const next = prev + 0.5;
        
        // Update status messages based on progress
        if (next < 15) {
          setStatus("INITIALIZING NEURAL BRIDGE...");
          setCurrentPhase(0);
        } else if (next < 40) {
          setStatus("SCANNING EMAIL STREAMS...");
          setCurrentPhase(1);
        } else if (next < 65) {
          setStatus("PARSING DOCUMENT STRUCTURES...");
          setCurrentPhase(1);
        } else if (next < 85) {
          setStatus("SYNTHESIZING API CONNECTIONS...");
          setCurrentPhase(2);
        } else {
          setStatus("COMPILING INSIGHTS...");
          setCurrentPhase(2);
        }

        // Update phase progress
        setPhaseProgress(prev => prev.map((phase, idx) => {
          if (idx === 0) {
            return { ...phase, progress: Math.min(100, next * 3) };
          } else if (idx === 1) {
            return { ...phase, progress: Math.min(100, Math.max(0, (next - 20) * 2)) };
          } else {
            return { ...phase, progress: Math.min(100, Math.max(0, (next - 60) * 2.5)) };
          }
        }));

        // Discover items progressively
        const itemsToShow = Math.floor(next / 12);
        if (itemsToShow > discoveredItems.length && itemsToShow <= mockItems.length) {
          setDiscoveredItems(mockItems.slice(0, itemsToShow));
        }

        if (next >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 1500);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isManualControl, onComplete, discoveredItems.length]);

  const handleTakeControl = () => {
    setIsManualControl(true);
    onTakeControl();
  };

  const roleLabel = role?.toUpperCase() || "CEO";
  const modeLabel = mode?.toUpperCase() || "RESEARCH";

  return (
    <div className="min-h-screen portal-bg flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
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
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-nebula"
          style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.25) 0%, transparent 70%)', animationDelay: '-7s' }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl mb-6">
        <div className="text-center mb-4">
          <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Your Own AI C-Suite</span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-border/30 rounded-full overflow-hidden max-w-md mx-auto">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </header>

      {/* Browser Window */}
      <div className="relative z-10 w-full max-w-5xl">
        <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a1a]/90 backdrop-blur-xl shadow-2xl">
          {/* Browser Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a2e]/80 border-b border-white/10">
            {/* Traffic lights */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
              <div className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            
            {/* URL bar */}
            <div className="flex-1 flex justify-center">
              <div className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs tracking-wider text-muted-foreground">
                <span className="text-green-400">●</span>
                {" "}PORTAL+ MODE &gt; {roleLabel} &gt; {modeLabel} &gt; STREAM_{streamId}
              </div>
            </div>
          </div>

          {/* Browser Content */}
          <div className="relative min-h-[500px] p-8">
            <div className="flex gap-6">
              {/* Left sidebar - Discovered items */}
              <div className="w-48 space-y-2">
                {[...Array(8)].map((_, i) => (
                  <div 
                    key={i}
                    className={`h-8 rounded-lg transition-all duration-500 ${
                      i < discoveredItems.length 
                        ? 'bg-white/10 border border-white/20' 
                        : 'bg-white/5'
                    }`}
                    style={{
                      opacity: i < discoveredItems.length ? 1 : 0.3,
                      animationDelay: `${i * 0.1}s`
                    }}
                  >
                    {discoveredItems[i] && (
                      <div className="px-3 py-1.5 text-xs text-muted-foreground truncate">
                        {discoveredItems[i].title.slice(0, 20)}...
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                {/* Central icon */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle, rgba(167, 139, 250, 0.4) 0%, transparent 70%)' }} />
                  <div className="relative h-28 w-28 rounded-full border-2 border-accent/30 flex items-center justify-center bg-gradient-to-b from-white/5 to-transparent">
                    <Crown className="h-14 w-14 text-amber-400" strokeWidth={1.5} />
                  </div>
                  {/* Orbiting dots */}
                  <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-2 h-2 rounded-full bg-blue-400" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 w-2 h-2 rounded-full bg-red-400" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 rounded-full bg-green-400" />
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl md:text-3xl font-bold tracking-wider text-foreground mb-3">
                  {roleLabel} INTELLIGENCE CORE
                </h2>
                
                {/* Status */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
                  <Circle className="h-2 w-2 fill-amber-400 text-amber-400 animate-pulse" />
                  <span className="tracking-[0.15em]">STATUS: {status}</span>
                </div>

                {/* Mini progress indicator */}
                <div className="w-48 space-y-1">
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-300"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white/30 transition-all duration-300"
                      style={{ width: `${phaseProgress[currentPhase]?.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right side - Take control button */}
              <div className="w-48 flex flex-col justify-end">
                <Button
                  variant="outline"
                  onClick={handleTakeControl}
                  disabled={isManualControl}
                  className="border-white/20 bg-white/5 hover:bg-white/10 text-xs tracking-wider"
                >
                  <Circle className={`h-2 w-2 mr-2 ${isManualControl ? 'fill-green-400 text-green-400' : 'fill-red-400 text-red-400'}`} />
                  <div className="text-left">
                    <div className="text-[10px] text-muted-foreground">
                      {isManualControl ? 'MANUAL MODE' : 'SAFETY PROTOCOL OFF'}
                    </div>
                    <div className="font-medium">
                      {isManualControl ? 'CONTROL ACTIVE' : 'MANUALLY TAKE CONTROL'}
                    </div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0a0a1a]/80 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Circle className="h-2 w-2 fill-green-400 text-green-400 animate-pulse" />
                <span className="text-xs tracking-wider text-muted-foreground">SYSTEM.LOG</span>
              </div>
              
              {/* Phase progress */}
              <div className="flex items-center gap-6">
                <span className="text-sm font-medium tracking-wider">DEEP SCAN ANALYSIS</span>
                <div className="flex items-center gap-4">
                  {phaseProgress.map((phase, idx) => (
                    <div key={phase.id} className="flex items-center gap-2">
                      <span className={`text-[10px] tracking-wider ${idx <= currentPhase ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {phase.label}
                      </span>
                      {idx < phaseProgress.length - 1 && (
                        <div className="w-8 h-0.5 bg-white/20 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent transition-all duration-300"
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              {/* Percentage complete */}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-foreground">{Math.round(overallProgress)}</span>
                <span className="text-sm text-muted-foreground">% COMPLETE</span>
              </div>

              {/* Mode indicator */}
              <div className="flex flex-col items-end">
                <span className="text-lg font-bold tracking-wider" style={{ color: '#A78BFA' }}>{modeLabel}</span>
                <span className="text-[10px] tracking-wider text-muted-foreground animate-pulse">SYNCING...</span>
              </div>
            </div>
          </div>

          {/* Full progress bar */}
          <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-300"
              style={{ 
                width: `${overallProgress}%`,
                background: 'linear-gradient(90deg, #A78BFA 0%, #8B5CF6 50%, #7C3AED 100%)'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
