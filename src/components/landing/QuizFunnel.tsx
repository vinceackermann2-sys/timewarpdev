import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Telescope, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import cosmic backgrounds
import cosmicBg1 from "@/assets/cosmic-bg-1.jpg";
import cosmicBg2 from "@/assets/cosmic-bg-2.jpg";
import cosmicBg3 from "@/assets/cosmic-bg-3.jpg";
import cosmicCardBg from "@/assets/cosmic-card-bg.jpg";

type Role = "ceo" | "cmo" | "cfo";
type Mode = "research" | "action";

interface RoleOption {
  id: Role;
  title: string;
  emoji: string;
  background: string;
}

interface ModeOption {
  id: Mode;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const roles: RoleOption[] = [
  { id: "ceo", title: "CEO", emoji: "👑", background: cosmicBg1 },
  { id: "cmo", title: "CMO", emoji: "📣", background: cosmicBg2 },
  { id: "cfo", title: "CFO", emoji: "💵", background: cosmicBg3 },
];

const modes: ModeOption[] = [
  { 
    id: "research", 
    title: "RESEARCH", 
    description: "Find leaks in the company",
    icon: <Telescope className="h-16 w-16" strokeWidth={1} />
  },
  { 
    id: "action", 
    title: "ACTION", 
    description: "Cover your leaks",
    icon: <Bot className="h-16 w-16" strokeWidth={1} />
  },
];

export function QuizFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const totalSteps = 3;

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setTimeout(() => setStep(2), 300);
  };

  const handleModeSelect = (mode: Mode) => {
    setSelectedMode(mode);
    setTimeout(() => setStep(3), 300);
  };

  const handleReset = () => {
    setStep(1);
    setSelectedRole(null);
    setSelectedMode(null);
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    navigate("/auth", { 
      state: { 
        returnTo: "/dashboard",
        quizData: {
          role: selectedRole,
          mode: selectedMode
        }
      } 
    });
  };

  const getRoleLabel = () => {
    const role = roles.find(r => r.id === selectedRole);
    return role ? role.title : "";
  };

  return (
    <div className="min-h-screen portal-bg flex flex-col relative overflow-hidden">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-1 h-1 bg-foreground rounded-full opacity-60 animate-pulse" />
        <div className="absolute top-40 right-40 w-1.5 h-1.5 bg-foreground rounded-full opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }} />
        <div className="absolute top-60 left-1/3 w-1 h-1 bg-foreground rounded-full opacity-50 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-40 right-1/4 w-1 h-1 bg-foreground rounded-full opacity-60 animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-60 left-1/4 w-1.5 h-1.5 bg-foreground rounded-full opacity-40 animate-pulse" style={{ animationDelay: '2s' }} />
        {/* Purple glow orbs */}
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4 flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shadow-glow">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-primary-foreground" fill="currentColor">
                <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34c-.37-.39-1.02-.39-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z"/>
              </svg>
            </div>
            <span className="text-3xl font-bold text-foreground tracking-tight">Portals</span>
          </div>
          <span className="text-xs tracking-[0.3em] text-muted-foreground uppercase">Your Own AI C-Suite</span>
          
          {/* Progress bar */}
          <div className="w-full max-w-md mt-8">
            <div className="h-0.5 bg-border/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
        {/* Step 1: Choose Role */}
        {step === 1 && (
          <div className="animate-fade-in text-center">
            <h1 className="text-2xl md:text-3xl font-medium mb-12">
              Put your <span className="text-primary italic underline underline-offset-4 decoration-primary/50">Chief to work</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="group relative h-[400px] md:h-[450px] rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {/* Background image */}
                  <img 
                    src={role.background} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-center px-6">
                    <span className="text-6xl mb-4 animate-float">{role.emoji}</span>
                    <h3 className="text-3xl font-bold text-foreground tracking-wider">{role.title}</h3>
                    <div className="mt-4 w-12 h-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Mode (Research/Action) */}
        {step === 2 && selectedRole && (
          <div className="animate-fade-in text-center">
            {/* Protocol badge */}
            <div className="inline-block px-6 py-2 rounded-full border border-border/50 bg-card/30 backdrop-blur-sm mb-8">
              <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {getRoleLabel()} Protocol Activated
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-medium mb-12">
              Choose your <span className="text-primary font-semibold">Timewarp</span>
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className="group relative h-[280px] rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-primary portal-card"
                >
                  {/* Background image */}
                  <img 
                    src={cosmicCardBg} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                  
                  {/* Content */}
                  <div className="relative h-full flex flex-col items-center justify-center px-6">
                    <div className="text-white/80 mb-4">
                      {mode.icon}
                    </div>
                    <h3 className="text-2xl font-bold text-foreground tracking-wider mb-2">{mode.title}</h3>
                    <p className="text-sm text-muted-foreground italic">{mode.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Reset button */}
            <button
              onClick={handleReset}
              className="mt-12 text-xs tracking-[0.2em] text-muted-foreground uppercase hover:text-foreground transition-colors"
            >
              Reset Credentials
            </button>
          </div>
        )}

        {/* Step 3: Connect Google */}
        {step === 3 && selectedMode && (
          <div className="animate-fade-in text-center">
            <div className="max-w-lg mx-auto">
              {/* Card */}
              <div className="portal-card rounded-3xl p-12 backdrop-blur-xl">
                {/* Google icon */}
                <div className="flex justify-center mb-8">
                  <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
                    <svg className="h-10 w-10" viewBox="0 0 24 24">
                      <path 
                        fill="#9ca3af" 
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path 
                        fill="#9ca3af" 
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path 
                        fill="#9ca3af" 
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path 
                        fill="#9ca3af" 
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold italic text-foreground mb-4">ACTIVATE CORE</h2>
                
                {/* Description */}
                <p className="text-muted-foreground mb-10">
                  Authorize high-performance cloud processing for deep-stream analytics.
                </p>

                {/* Connect button */}
                <Button 
                  size="lg"
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  className="w-full py-6 text-sm tracking-[0.2em] uppercase font-medium portal-button border-0"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Connecting...
                    </>
                  ) : (
                    "Activate Node"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
