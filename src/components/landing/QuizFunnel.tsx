import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  FileSpreadsheet,
  TrendingUp,
  Users,
  Mail,
  BarChart3,
  Globe,
  FileText,
  ShoppingCart,
  Calendar,
  Megaphone
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Mode = "research" | "generation";

interface TaskOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface GoalOption {
  id: string;
  title: string;
  description: string;
}

const researchTasks: TaskOption[] = [
  { id: "sales", title: "Sales Analysis", description: "Analyze revenue, orders, and product performance", icon: <TrendingUp className="h-6 w-6" /> },
  { id: "customers", title: "Customer Insights", description: "Understand customer behavior and segments", icon: <Users className="h-6 w-6" /> },
  { id: "email", title: "Email Analytics", description: "Summarize and prioritize inbox", icon: <Mail className="h-6 w-6" /> },
  { id: "documents", title: "Document Summary", description: "Extract insights from Docs and Sheets", icon: <FileText className="h-6 w-6" /> },
  { id: "marketing", title: "Marketing Performance", description: "Track campaign results and ROI", icon: <BarChart3 className="h-6 w-6" /> },
  { id: "calendar", title: "Schedule Analysis", description: "Optimize meetings and time usage", icon: <Calendar className="h-6 w-6" /> },
];

const generationTasks: TaskOption[] = [
  { id: "website", title: "Build Website", description: "Create a new landing page or store", icon: <Globe className="h-6 w-6" /> },
  { id: "spreadsheet", title: "Create Spreadsheet", description: "Generate reports with company data", icon: <FileSpreadsheet className="h-6 w-6" /> },
  { id: "document", title: "Write Document", description: "Draft proposals, reports, or plans", icon: <FileText className="h-6 w-6" /> },
  { id: "campaign", title: "Email Campaign", description: "Create email sequences and newsletters", icon: <Mail className="h-6 w-6" /> },
  { id: "ads", title: "Ad Creative", description: "Generate ad copy and campaign ideas", icon: <Megaphone className="h-6 w-6" /> },
  { id: "store", title: "Product Listings", description: "Create and optimize product pages", icon: <ShoppingCart className="h-6 w-6" /> },
];

const researchGoals: Record<string, GoalOption[]> = {
  sales: [
    { id: "trends", title: "Identify Trends", description: "Find patterns in sales data over time" },
    { id: "top-products", title: "Top Products", description: "Discover best-selling items" },
    { id: "forecasting", title: "Sales Forecast", description: "Predict future revenue" },
    { id: "comparison", title: "Period Comparison", description: "Compare this month vs last" },
  ],
  customers: [
    { id: "segments", title: "Customer Segments", description: "Group customers by behavior" },
    { id: "lifetime", title: "Lifetime Value", description: "Calculate customer worth" },
    { id: "churn", title: "Churn Risk", description: "Identify at-risk customers" },
    { id: "acquisition", title: "Acquisition Channels", description: "Best sources for new customers" },
  ],
  email: [
    { id: "priority", title: "Priority Inbox", description: "Sort by importance" },
    { id: "unanswered", title: "Need Response", description: "Find emails awaiting reply" },
    { id: "summary", title: "Daily Summary", description: "Get a digest of today's emails" },
    { id: "follow-ups", title: "Follow-ups", description: "Track pending conversations" },
  ],
  documents: [
    { id: "key-points", title: "Key Points", description: "Extract main takeaways" },
    { id: "action-items", title: "Action Items", description: "Find tasks and deadlines" },
    { id: "data-extract", title: "Data Extraction", description: "Pull numbers and metrics" },
    { id: "comparison", title: "Document Compare", description: "Compare multiple files" },
  ],
  marketing: [
    { id: "roi", title: "Campaign ROI", description: "Measure return on spend" },
    { id: "channels", title: "Channel Performance", description: "Compare marketing channels" },
    { id: "audience", title: "Audience Insights", description: "Understand who engages" },
    { id: "optimization", title: "Optimization Tips", description: "Get improvement suggestions" },
  ],
  calendar: [
    { id: "time-audit", title: "Time Audit", description: "See where time goes" },
    { id: "meeting-load", title: "Meeting Load", description: "Analyze meeting frequency" },
    { id: "free-time", title: "Find Free Time", description: "Identify available slots" },
    { id: "optimize", title: "Schedule Tips", description: "Suggestions for better scheduling" },
  ],
};

const generationGoals: Record<string, GoalOption[]> = {
  website: [
    { id: "landing", title: "Landing Page", description: "Single-page marketing site" },
    { id: "portfolio", title: "Portfolio", description: "Showcase your work" },
    { id: "store", title: "E-commerce Store", description: "Full online shop" },
    { id: "blog", title: "Blog Site", description: "Content and articles" },
  ],
  spreadsheet: [
    { id: "financial", title: "Financial Report", description: "P&L, balance sheet, cash flow" },
    { id: "inventory", title: "Inventory Tracker", description: "Stock levels and orders" },
    { id: "dashboard", title: "KPI Dashboard", description: "Key metrics overview" },
    { id: "budget", title: "Budget Planner", description: "Track expenses and budgets" },
  ],
  document: [
    { id: "proposal", title: "Business Proposal", description: "Client or investor pitch" },
    { id: "report", title: "Status Report", description: "Progress and updates" },
    { id: "plan", title: "Business Plan", description: "Strategy and roadmap" },
    { id: "sop", title: "Standard Procedures", description: "Process documentation" },
  ],
  campaign: [
    { id: "welcome", title: "Welcome Sequence", description: "Onboard new subscribers" },
    { id: "promo", title: "Promotional", description: "Sale or product launch" },
    { id: "newsletter", title: "Newsletter", description: "Regular updates" },
    { id: "win-back", title: "Win-back", description: "Re-engage inactive customers" },
  ],
  ads: [
    { id: "social", title: "Social Ads", description: "Facebook, Instagram, TikTok" },
    { id: "search", title: "Search Ads", description: "Google Ads copy" },
    { id: "display", title: "Display Ads", description: "Banner ad creative" },
    { id: "video", title: "Video Scripts", description: "Short video ad scripts" },
  ],
  store: [
    { id: "descriptions", title: "Product Descriptions", description: "Compelling product copy" },
    { id: "seo", title: "SEO Optimization", description: "Improve search rankings" },
    { id: "collections", title: "Collections", description: "Organize products" },
    { id: "upsells", title: "Upsell Setup", description: "Cross-sell recommendations" },
  ],
};

const timeframes = [
  { id: "today", title: "Today", description: "Just today's data" },
  { id: "week", title: "This Week", description: "Last 7 days" },
  { id: "month", title: "This Month", description: "Last 30 days" },
  { id: "quarter", title: "This Quarter", description: "Last 90 days" },
  { id: "year", title: "This Year", description: "Year to date" },
  { id: "all", title: "All Time", description: "Complete history" },
];

export function QuizFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const totalSteps = 4;

  const handleModeSelect = (mode: Mode) => {
    setSelectedMode(mode);
    setSelectedTask(null);
    setSelectedGoal(null);
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTask(taskId);
    setSelectedGoal(null);
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    // Navigate to auth page which will handle Google OAuth
    navigate("/auth", { 
      state: { 
        returnTo: "/dashboard",
        quizData: {
          mode: selectedMode,
          task: selectedTask,
          goal: selectedGoal,
          timeframe: selectedTimeframe
        }
      } 
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedMode !== null;
      case 2:
        return selectedTask !== null;
      case 3:
        return selectedGoal !== null;
      case 4:
        return selectedTimeframe !== null;
      default:
        return false;
    }
  };

  const currentTasks = selectedMode === "research" ? researchTasks : generationTasks;
  const currentGoals = selectedMode && selectedTask 
    ? (selectedMode === "research" ? researchGoals : generationGoals)[selectedTask] || []
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AI CEO</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Step {step} of {totalSteps}</span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-secondary">
        <div 
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Step 1: Choose mode */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  What should your AI CEO do?
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose a mode to get started
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                <Card
                  onClick={() => handleModeSelect("research")}
                  className={`p-8 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
                    selectedMode === "research"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className={`mb-4 ${selectedMode === "research" ? "text-primary" : "text-muted-foreground"}`}>
                    <Search className="h-12 w-12" />
                  </div>
                  <h3 className="font-bold text-2xl mb-2">Research</h3>
                  <p className="text-muted-foreground">
                    Analyze data, find insights, and get reports from your connected tools
                  </p>
                  {selectedMode === "research" && (
                    <div className="mt-6 flex items-center gap-2 text-primary font-medium">
                      <Check className="h-5 w-5" />
                      Selected
                    </div>
                  )}
                </Card>

                <Card
                  onClick={() => handleModeSelect("generation")}
                  className={`p-8 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
                    selectedMode === "generation"
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border"
                  }`}
                >
                  <div className={`mb-4 ${selectedMode === "generation" ? "text-primary" : "text-muted-foreground"}`}>
                    <Sparkles className="h-12 w-12" />
                  </div>
                  <h3 className="font-bold text-2xl mb-2">Generation</h3>
                  <p className="text-muted-foreground">
                    Create websites, documents, spreadsheets, and campaigns automatically
                  </p>
                  {selectedMode === "generation" && (
                    <div className="mt-6 flex items-center gap-2 text-primary font-medium">
                      <Check className="h-5 w-5" />
                      Selected
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* Step 2: Choose task */}
          {step === 2 && selectedMode && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {selectedMode === "research" ? "What do you want to analyze?" : "What do you want to create?"}
                </h1>
                <p className="text-lg text-muted-foreground">
                  Select the type of {selectedMode === "research" ? "analysis" : "content"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentTasks.map((task) => (
                  <Card
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={`p-5 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
                      selectedTask === task.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        selectedTask === task.id 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {task.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-sm text-muted-foreground">{task.description}</p>
                      </div>
                      {selectedTask === task.id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Choose goal */}
          {step === 3 && selectedTask && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  What's your specific goal?
                </h1>
                <p className="text-lg text-muted-foreground">
                  Select what you want to achieve
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {currentGoals.map((goal) => (
                  <Card
                    key={goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    className={`p-5 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
                      selectedGoal === goal.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{goal.title}</h3>
                        <p className="text-sm text-muted-foreground">{goal.description}</p>
                      </div>
                      {selectedGoal === goal.id && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Choose timeframe and connect */}
          {step === 4 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {selectedMode === "research" ? "What time period?" : "Ready to start?"}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {selectedMode === "research" 
                    ? "Select the timeframe for your analysis" 
                    : "Select urgency and connect your Google account"
                  }
                </p>
              </div>

              <div className="max-w-2xl mx-auto space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {timeframes.map((tf) => (
                    <Card
                      key={tf.id}
                      onClick={() => setSelectedTimeframe(tf.id)}
                      className={`p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 ${
                        selectedTimeframe === tf.id
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium">{tf.title}</h3>
                          <p className="text-xs text-muted-foreground">{tf.description}</p>
                        </div>
                        {selectedTimeframe === tf.id && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                      </div>
                    </Card>
                  ))}
                </div>

                {selectedTimeframe && (
                  <Card className="p-6 border-primary/20 bg-primary/5">
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-3">
                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                        <h3 className="text-xl font-bold">Connect Google Workspace</h3>
                      </div>
                      <p className="text-muted-foreground">
                        Sign in with Google to give AI CEO access to your Docs, Sheets, Drive, and Gmail
                      </p>
                      <Button 
                        size="lg" 
                        onClick={handleConnectGoogle}
                        disabled={isConnecting}
                        className="gap-2"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Sign in with Google
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="border-t border-border/50 bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step < totalSteps && (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
