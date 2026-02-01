import { useEffect, useState } from "react";
import { Bot, Rocket, Sparkles } from "lucide-react";

interface TransitionOverlayProps {
  isVisible: boolean;
  role: string;
  task: string;
  onComplete: () => void;
}

export function TransitionOverlay({ isVisible, role, task, onComplete }: TransitionOverlayProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");

  useEffect(() => {
    if (!isVisible) return;

    // Phase 1: Enter animation (500ms)
    setPhase("enter");
    
    const holdTimer = setTimeout(() => {
      setPhase("hold");
    }, 500);

    // Phase 2: Hold briefly (800ms)
    const exitTimer = setTimeout(() => {
      setPhase("exit");
    }, 1300);

    // Phase 3: Complete after exit animation (500ms)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  const roleLabel = role?.toUpperCase() || "CEO";

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500
        ${phase === "enter" ? "opacity-0 scale-95" : ""}
        ${phase === "hold" ? "opacity-100 scale-100" : ""}
        ${phase === "exit" ? "opacity-0 scale-105" : ""}
      `}
      style={{ 
        background: "linear-gradient(135deg, hsl(var(--background)) 0%, hsl(260 50% 5%) 100%)"
      }}
    >
      {/* Background effects */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{ backgroundImage: 'url(/stardust.png)', backgroundRepeat: 'repeat', opacity: 0.3 }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)' }}
        />
      </div>

      {/* Content */}
      <div className={`relative z-10 text-center space-y-6 max-w-lg mx-auto px-6 transition-all duration-700 delay-200
        ${phase === "enter" ? "opacity-0 translate-y-8" : "opacity-100 translate-y-0"}
      `}>
        {/* Animated Logo/Icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/30 to-purple-600/30 blur-xl animate-pulse" />
          <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center shadow-[0_0_60px_rgba(139,92,246,0.5)]">
            <Bot className="h-12 w-12 text-white" />
          </div>
          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-accent animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-purple-400 animate-pulse delay-150" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            Launching TimeWarp AI
          </h1>
          <p className="text-lg text-accent font-medium">
            {roleLabel} Mode Activated
          </p>
        </div>

        {/* Task Preview */}
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-left">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Task</p>
          <p className="text-sm text-foreground line-clamp-3">{task}</p>
        </div>

        {/* Loading Indicator */}
        <div className="flex items-center justify-center gap-3">
          <Rocket className="h-5 w-5 text-accent animate-bounce" />
          <span className="text-sm text-muted-foreground">Preparing workspace...</span>
        </div>
      </div>
    </div>
  );
}
