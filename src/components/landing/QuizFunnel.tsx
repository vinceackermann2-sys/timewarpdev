import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  ShoppingBag,
  FileSpreadsheet,
  MessageSquare,
  Mail
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type Mode = "research" | "generation";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const integrations: Integration[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "E-commerce store data and management",
    icon: <ShoppingBag className="h-6 w-6" />,
  },
  {
    id: "google",
    name: "Google Workspace",
    description: "Docs, Sheets, Drive, and Gmail",
    icon: <FileSpreadsheet className="h-6 w-6" />,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team communication and channels",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    id: "microsoft",
    name: "Microsoft 365",
    description: "Office, Teams, and OneDrive",
    icon: <Mail className="h-6 w-6" />,
  },
];

const modeContent = {
  research: {
    title: "Research Mode",
    subtitle: "AI CEO analyzes your connected data to provide insights",
    description: "Connect your tools and let AI CEO dive deep into your business data. Get reports, find patterns, and discover opportunities.",
    examples: [
      "Analyze sales trends from Shopify",
      "Summarize team discussions from Slack",
      "Extract insights from Google Sheets",
      "Review email patterns and priorities"
    ]
  },
  generation: {
    title: "Generation Mode", 
    subtitle: "AI CEO creates and builds on your behalf",
    description: "Tell AI CEO what you need, and it will create it for you. Build websites, generate reports, create documents.",
    examples: [
      "Build a new Shopify store",
      "Create a spreadsheet with company data",
      "Generate a presentation from data",
      "Draft email campaigns"
    ]
  }
};

export function QuizFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [selectedIntegrations, setSelectedIntegrations] = useState<string[]>([]);
  const [taskDescription, setTaskDescription] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;

  const handleModeSelect = (mode: Mode) => {
    setSelectedMode(mode);
  };

  const handleIntegrationToggle = (integrationId: string) => {
    setSelectedIntegrations(prev => 
      prev.includes(integrationId)
        ? prev.filter(id => id !== integrationId)
        : [...prev, integrationId]
    );
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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    navigate("/dashboard", { 
      state: { 
        mode: selectedMode,
        integrations: selectedIntegrations,
        task: taskDescription,
        email 
      } 
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedMode !== null;
      case 2:
        return selectedIntegrations.length > 0;
      case 3:
        return taskDescription.trim().length > 0;
      case 4:
        return email.trim().length > 0 && email.includes("@");
      default:
        return false;
    }
  };

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
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16 flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl">
          {/* Step 1: Choose mode */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  What should your AI CEO do?
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose how you want your AI assistant to work. Research data from your tools, 
                  or generate new content and assets.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {/* Research Card */}
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
                  <p className="text-muted-foreground mb-4">
                    Analyze and extract insights from your connected business data
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {modeContent.research.examples.map((example, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {example}
                      </li>
                    ))}
                  </ul>
                  {selectedMode === "research" && (
                    <div className="mt-6 flex items-center gap-2 text-primary font-medium">
                      <Check className="h-5 w-5" />
                      Selected
                    </div>
                  )}
                </Card>

                {/* Generation Card */}
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
                  <p className="text-muted-foreground mb-4">
                    Create new websites, documents, and assets automatically
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {modeContent.generation.examples.map((example, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        {example}
                      </li>
                    ))}
                  </ul>
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

          {/* Step 2: Choose integrations */}
          {step === 2 && selectedMode && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Connect your tools
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {selectedMode === "research" 
                    ? "Select which platforms AI CEO should analyze data from."
                    : "Select where AI CEO should create and build for you."
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {integrations.map((integration) => (
                  <Card
                    key={integration.id}
                    onClick={() => handleIntegrationToggle(integration.id)}
                    className={`p-6 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
                      selectedIntegrations.includes(integration.id)
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        selectedIntegrations.includes(integration.id) 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {integration.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                      {selectedIntegrations.includes(integration.id) && (
                        <Check className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Select one or more integrations to continue
              </p>
            </div>
          )}

          {/* Step 3: Describe task */}
          {step === 3 && selectedMode && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  {selectedMode === "research" 
                    ? "What do you want to discover?"
                    : "What should AI CEO create?"
                  }
                </h1>
                <p className="text-lg text-muted-foreground">
                  {selectedMode === "research"
                    ? "Describe the insights, reports, or analysis you need."
                    : "Describe what you want to build or generate."
                  }
                </p>
              </div>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6 p-4 bg-secondary/50 rounded-lg">
                  <div className="text-primary">
                    {selectedMode === "research" ? <Search className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                  </div>
                  <div>
                    <p className="font-medium">{modeContent[selectedMode].title}</p>
                    <p className="text-sm text-muted-foreground">
                      Connected: {selectedIntegrations.map(id => 
                        integrations.find(i => i.id === id)?.name
                      ).join(", ")}
                    </p>
                  </div>
                </div>

                <Textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder={selectedMode === "research" 
                    ? "e.g., Analyze my Shopify sales data from the last quarter and identify top-performing products..."
                    : "e.g., Build a new landing page for my Shopify store featuring our summer collection..."
                  }
                  className="min-h-[200px] resize-none"
                />
                
                <p className="text-sm text-muted-foreground mt-3">
                  Tip: Be specific about your goals, timeframes, and any preferences.
                </p>
              </Card>
            </div>
          )}

          {/* Step 4: Email capture */}
          {step === 4 && (
            <div className="animate-fade-in max-w-lg mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Almost there!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Enter your email to start your AI CEO session.
                </p>
              </div>

              <Card className="p-6">
                <div className="space-y-6">
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {selectedMode === "research" ? "Research Mode" : "Generation Mode"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>
                        {selectedIntegrations.map(id => 
                          integrations.find(i => i.id === id)?.name
                        ).join(", ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{taskDescription}</p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="text-lg"
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Your AI CEO will start working immediately. Watch progress in real-time 
                      and provide feedback as it works.
                    </p>
                  </div>
                </div>
              </Card>
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

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  Start AI CEO
                  <Sparkles className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
