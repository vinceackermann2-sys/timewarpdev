import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Import cosmic backgrounds
import ceoBg from "@/assets/ceo-bg.png";
import cmoBg from "@/assets/cmo-bg.png";
import cfoBg from "@/assets/cfo-bg.png";
import researchBg from "@/assets/research-bg.png";
import actionBg from "@/assets/action-bg.png";

type Role = "ceo" | "cmo" | "cfo";
type Mode = "research" | "action";

interface RoleOption {
  id: Role;
  title: string;
  icon: string;
  background: string;
}

interface ModeOption {
  id: Mode;
  title: string;
  description: string;
  icon: React.ReactNode | null;
  background: string;
}

const roles: RoleOption[] = [
  { id: "ceo", title: "CEO", icon: "👑", background: ceoBg },
  { id: "cmo", title: "CMO", icon: "📣", background: cmoBg },
  { id: "cfo", title: "CFO", icon: "💵", background: cfoBg },
];

const modes: ModeOption[] = [
  { 
    id: "research", 
    title: "RESEARCH", 
    description: "Find leaks in the company",
    icon: null,
    background: researchBg
  },
  { 
    id: "action", 
    title: "ACTION", 
    description: "Cover your leaks",
    icon: null,
    background: actionBg
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
    if (!selectedRole || !selectedMode) return;

    setIsConnecting(true);

    // Store quiz data so Dashboard can pick it up after OAuth redirect
    const quizPayload = { role: selectedRole, mode: selectedMode };
    sessionStorage.setItem("quizData", JSON.stringify(quizPayload));

    // Route through /auth so we can request the required Google Workspace scopes.
    // (The auth page will start the Google OAuth flow.)
    navigate("/auth", { state: { quizData: quizPayload } });
  };

  const getRoleLabel = () => {
    const role = roles.find(r => r.id === selectedRole);
    return role ? role.title : "";
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Aurora cosmic gradient background - matching reference exactly */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 50% 25% at 50% 100%, 
              rgba(255, 150, 120, 0.7) 0%, 
              rgba(220, 120, 150, 0.5) 40%,
              transparent 70%
            ),
            radial-gradient(ellipse 70% 40% at 30% 95%, 
              rgba(200, 100, 180, 0.6) 0%, 
              rgba(160, 80, 200, 0.4) 40%,
              transparent 70%
            ),
            radial-gradient(ellipse 70% 40% at 70% 95%, 
              rgba(80, 140, 220, 0.5) 0%, 
              rgba(60, 120, 200, 0.3) 40%,
              transparent 70%
            ),
            radial-gradient(ellipse 100% 50% at 50% 85%, 
              rgba(100, 160, 255, 0.8) 0%, 
              rgba(80, 140, 240, 0.6) 30%,
              rgba(60, 100, 200, 0.3) 60%,
              transparent 80%
            ),
            radial-gradient(ellipse 120% 60% at 50% 70%, 
              rgba(60, 100, 200, 0.4) 0%, 
              rgba(40, 60, 140, 0.3) 50%,
              transparent 80%
            ),
            linear-gradient(to bottom, 
              hsl(230 30% 3%) 0%, 
              hsl(225 35% 6%) 20%,
              hsl(220 40% 12%) 40%,
              hsl(215 45% 22%) 60%,
              hsl(210 50% 32%) 80%,
              hsl(205 55% 42%) 100%
            )
          `
        }}
      />
      
      {/* Fine dust star particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(80)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 70}%`,
              width: `${0.5 + Math.random() * 1.5}px`,
              height: `${0.5 + Math.random() * 1.5}px`,
              opacity: 0.15 + Math.random() * 0.35,
              animation: `pulse ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4">
        <div className="container mx-auto px-4 flex flex-col items-center">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-2">
            <img 
              src="/favicon.png" 
              alt="TimeWarp" 
              className="h-12 w-12 rounded-xl object-cover shadow-glow"
            />
            <span className="text-3xl font-bold text-foreground tracking-tight">TimeWarp</span>
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
      <main className="flex-1 relative z-10 container mx-auto px-4 flex flex-col items-center justify-center -mt-16">
        {/* Step 1: Choose Role */}
        {step === 1 && (
          <div className="animate-fade-in text-center w-full -mt-8">
          <h1 className="text-3xl md:text-5xl font-normal mb-10 md:mb-14">
              Put your <span className="italic underline underline-offset-8 text-primary" style={{ textDecorationColor: 'hsl(210 100% 55% / 0.6)' }}>Chief to work</span>
            </h1>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-10">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="group relative w-[280px] h-[480px] md:w-[320px] md:h-[540px] rounded-[20px] overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-primary border-2 border-border hover:border-primary/40 bg-transparent"
                >
                  {/* Background image */}
                  <img 
                    src={role.background} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Bottom content area */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 flex flex-col items-center justify-end pb-14">
                    {/* Floating icon */}
                    <span className="text-6xl md:text-7xl mb-6 animate-float drop-shadow-lg">{role.icon}</span>
                    
                    {/* Title */}
                    <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-[0.25em]">{role.title}</h3>
                    
                    {/* Underline */}
                    <div className="mt-4 w-16 h-0.5 rounded-full bg-primary" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Choose Mode (Research/Action) */}
        {step === 2 && selectedRole && (
          <div className="animate-fade-in text-center w-full -mt-8">
            {/* Protocol badge */}
            <div className="inline-block px-6 py-2 rounded-full border border-white/20 bg-card/30 backdrop-blur-sm mb-6">
              <span className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
                {getRoleLabel()} Protocol Activated
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-normal mb-10 md:mb-14">
              Choose your <span className="italic underline underline-offset-8 text-primary" style={{ textDecorationColor: 'hsl(210 100% 55% / 0.6)' }}>Timewarp</span>
            </h1>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-10">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className="group relative w-[280px] h-[420px] md:w-[380px] md:h-[480px] rounded-[20px] overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-primary border-2 border-white/20 hover:border-white/40"
                >
                  {/* Background image */}
                  <img 
                    src={mode.background} 
                    alt="" 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Content */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 flex flex-col items-center justify-end pb-14 px-6">
                    <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-[0.25em] mb-3">{mode.title}</h3>
                    <p className="text-base text-muted-foreground italic">{mode.description}</p>
                    
                    {/* Underline */}
                    <div className="mt-4 w-16 h-0.5 rounded-full bg-primary" />
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
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
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
