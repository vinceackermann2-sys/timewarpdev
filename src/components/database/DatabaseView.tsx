import { useState } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  ShieldAlert, 
  Target, 
  UserCheck,
  Sparkles,
  ArrowUp,
  MoreVertical
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Database modules based on Google Workspace business research
const databaseModules = [
  {
    id: "fin",
    code: "FIN-X1",
    title: "FINANCIAL CORE",
    icon: DollarSign,
    gradient: "from-blue-500 to-blue-600",
    questions: [
      "Predict Q4 burn rate?",
      "Identify expense leaks?",
      "Summarize capital reserves"
    ]
  },
  {
    id: "mkt",
    code: "MKT-Z2",
    title: "MARKET INTEL",
    icon: TrendingUp,
    gradient: "from-purple-500 to-purple-600",
    questions: [
      "Analyze competitor mentions?",
      "Track market sentiment?",
      "Identify trending topics?"
    ]
  },
  {
    id: "cus",
    code: "CUS-X1",
    title: "CUSTOMER FLOW",
    icon: Users,
    gradient: "from-emerald-500 to-emerald-600",
    questions: [
      "Map customer journey?",
      "Identify churn signals?",
      "Track satisfaction trends?"
    ]
  },
  {
    id: "rsk",
    code: "RSK-M0",
    title: "RISK MATRIX",
    icon: ShieldAlert,
    gradient: "from-teal-400 to-orange-500",
    questions: [
      "Detect compliance gaps?",
      "Assess vendor risks?",
      "Flag security concerns?"
    ]
  },
  {
    id: "str",
    code: "STR-P8",
    title: "STRATEGIC PIVOTS",
    icon: Target,
    gradient: "from-orange-400 to-pink-500",
    questions: [
      "Identify pivot opportunities?",
      "Analyze strategic alignment?",
      "Track OKR progress?"
    ]
  },
  {
    id: "tlt",
    code: "TLT-H7",
    title: "TALENT REGISTRY",
    icon: UserCheck,
    gradient: "from-pink-400 to-purple-500",
    questions: [
      "Map skill gaps?",
      "Track team sentiment?",
      "Identify top performers?"
    ]
  }
];

type ViewState = "storage" | "chat";

export function DatabaseView() {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>("storage");
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const handleModuleClick = (moduleId: string) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
    }
  };

  const handleQuestionClick = (question: string) => {
    setSelectedQuestion(question);
    setViewState("chat");
    setExpandedModule(null);
  };

  const handleBackToStorage = () => {
    setViewState("storage");
    setSelectedQuestion(null);
  };

  const handleSendMessage = () => {
    if (inputValue.trim() || selectedQuestion) {
      console.log("Sending:", inputValue || selectedQuestion);
      // TODO: Connect to AI chat
      setInputValue("");
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Stardust background texture */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'url(/stardust.png)',
          backgroundSize: 'cover'
        }}
      />

      {/* Main content area */}
      <div className="flex-1 flex items-center justify-center relative z-10">
        {viewState === "storage" ? (
          /* Storage View - File Tabs */
          <div className="flex items-center justify-center gap-2 p-8">
            {/* Container with subtle border */}
            <div className="flex items-stretch gap-1 p-4 rounded-2xl bg-card/30 backdrop-blur-sm border border-border/50">
              {databaseModules.map((module) => {
                const isExpanded = expandedModule === module.id;
                const Icon = module.icon;

                return (
                  <div
                    key={module.id}
                    className={cn(
                      "relative flex transition-all duration-500 ease-out cursor-pointer",
                      isExpanded ? "w-80" : "w-20"
                    )}
                    onClick={() => !isExpanded && handleModuleClick(module.id)}
                  >
                    {/* Expanded content */}
                    {isExpanded && (
                      <div 
                        className="absolute inset-0 rounded-2xl overflow-hidden animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Gradient background */}
                        <div className={cn(
                          "absolute inset-0 bg-gradient-to-b opacity-90",
                          module.gradient
                        )} />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />

                        {/* Content */}
                        <div className="relative h-full p-6 flex flex-col">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-8">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-white/10 backdrop-blur">
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <h3 className="font-bold text-white text-lg">{module.title}</h3>
                                <p className="text-white/60 text-xs">ACCESSING MODULE {module.code}</p>
                              </div>
                            </div>
                            <span className="text-[10px] text-white/40 bg-white/10 px-2 py-1 rounded">
                              SYNCED
                            </span>
                          </div>

                          {/* Questions */}
                          <div className="flex-1">
                            <p className="text-white/50 text-xs font-medium tracking-wider mb-4">
                              PREDICTIVE INQUIRIES:
                            </p>
                            <div className="space-y-2">
                              {module.questions.map((question, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleQuestionClick(question)}
                                  className="w-full text-left px-4 py-3 rounded-lg bg-background/80 hover:bg-background text-sm text-foreground transition-colors"
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Close hint */}
                          <button 
                            onClick={() => setExpandedModule(null)}
                            className="mt-4 text-white/40 text-xs hover:text-white/60 transition-colors"
                          >
                            Click outside to close
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Collapsed tab */}
                    <div
                      className={cn(
                        "w-20 h-96 rounded-2xl overflow-hidden transition-opacity duration-300 flex-shrink-0",
                        isExpanded ? "opacity-0 pointer-events-none" : "opacity-100"
                      )}
                    >
                      {/* Gradient top */}
                      <div className={cn(
                        "h-24 bg-gradient-to-b",
                        module.gradient
                      )}>
                        <div className="p-3 text-center">
                          <span className="text-[10px] text-white/80 font-mono">{module.code}</span>
                          <div className="mt-2 flex justify-center">
                            <Icon className="h-5 w-5 text-white/90" />
                          </div>
                        </div>
                      </div>

                      {/* Dark body with vertical text */}
                      <div className="flex-1 bg-gradient-to-b from-card to-background h-72 flex flex-col items-center justify-between py-4">
                        {/* Vertical text */}
                        <div 
                          className="flex-1 flex items-center justify-center"
                          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                        >
                          <span className="text-xs font-medium tracking-[0.3em] text-muted-foreground rotate-180">
                            {module.title}
                          </span>
                        </div>

                        {/* Dots */}
                        <div className="flex flex-col gap-1">
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chat View - Question Selected */
          <div className="flex flex-col items-center justify-center h-full w-full p-8">
            {/* Selected question bubble */}
            {selectedQuestion && (
              <div className="absolute top-8 right-8 animate-fade-in">
                <div className="px-6 py-4 rounded-2xl bg-primary/20 border border-primary/30 text-foreground">
                  {selectedQuestion}
                </div>
              </div>
            )}

            {/* AI Response area - placeholder */}
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Sparkles className="h-8 w-8 mx-auto mb-4 text-primary animate-pulse" />
                <p className="text-sm">TimeWarp AI is analyzing your business data...</p>
              </div>
            </div>

            {/* Back to storage link */}
            <button
              onClick={handleBackToStorage}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
            >
              <ArrowUp className="h-4 w-4" />
              <span className="text-xs tracking-[0.2em] uppercase">Back to Storage</span>
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom chat input - always visible */}
      <div className="relative z-10 p-6 flex justify-center">
        <div className="w-full max-w-xl">
          <div className="relative flex items-center">
            <Sparkles className="absolute left-4 h-5 w-5 text-primary" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question..."
              className="w-full pl-12 pr-14 py-6 rounded-full bg-card/80 backdrop-blur border-border/50 text-foreground placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSendMessage}
              className="absolute right-2 h-10 w-10 rounded-full bg-foreground flex items-center justify-center hover:bg-foreground/90 transition-colors"
            >
              <ArrowUp className="h-5 w-5 text-background" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
