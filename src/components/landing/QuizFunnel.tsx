import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Globe, 
  Megaphone, 
  FileText, 
  Mail, 
  BarChart3, 
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TaskOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const taskOptions: TaskOption[] = [
  {
    id: "website",
    title: "Skapa webbplats",
    description: "Bygg en professionell hemsida för ditt företag",
    icon: <Globe className="h-8 w-8" />,
  },
  {
    id: "ads",
    title: "Göra reklam",
    description: "Skapa och hantera annonser på sociala medier",
    icon: <Megaphone className="h-8 w-8" />,
  },
  {
    id: "content",
    title: "Skapa innehåll",
    description: "Blogginlägg, sociala inlägg och copywriting",
    icon: <FileText className="h-8 w-8" />,
  },
  {
    id: "email",
    title: "E-postmarknadsföring",
    description: "Nyhetsbrev och automatiserade e-postflöden",
    icon: <Mail className="h-8 w-8" />,
  },
  {
    id: "analytics",
    title: "Analysera data",
    description: "Rapporter och insikter från din affärsdata",
    icon: <BarChart3 className="h-8 w-8" />,
  },
  {
    id: "other",
    title: "Annat",
    description: "Beskriv vad du behöver hjälp med",
    icon: <Sparkles className="h-8 w-8" />,
  },
];

export function QuizFunnel() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [taskDetails, setTaskDetails] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 3;

  const handleTaskSelect = (taskId: string) => {
    setSelectedTask(taskId);
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
    // Simulate submission - in production this would save to database
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    navigate("/dashboard", { 
      state: { 
        task: selectedTask, 
        details: taskDetails,
        email 
      } 
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return selectedTask !== null;
      case 2:
        return taskDetails.trim().length > 0;
      case 3:
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
            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">AI CEO</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Steg {step} av {totalSteps}</span>
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
          {/* Step 1: Choose task */}
          {step === 1 && (
            <div className="animate-fade-in">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Vad ska din AI CEO göra?
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Välj en uppgift så tar din AI-assistent hand om resten. 
                  Den arbetar direkt i webbläsaren precis som en riktig VD.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {taskOptions.map((task) => (
                  <Card
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={`p-6 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg ${
                      selectedTask === task.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                    }`}
                  >
                    <div className={`mb-4 ${selectedTask === task.id ? "text-primary" : "text-muted-foreground"}`}>
                      {task.icon}
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
                    <p className="text-sm text-muted-foreground">{task.description}</p>
                    {selectedTask === task.id && (
                      <div className="mt-4 flex items-center gap-2 text-primary text-sm font-medium">
                        <Check className="h-4 w-4" />
                        Vald
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Describe task */}
          {step === 2 && (
            <div className="animate-fade-in max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Beskriv din uppgift
                </h1>
                <p className="text-lg text-muted-foreground">
                  Ju mer detaljer du ger, desto bättre resultat levererar din AI CEO.
                </p>
              </div>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6 p-4 bg-secondary/50 rounded-lg">
                  <div className="text-primary">
                    {taskOptions.find(t => t.id === selectedTask)?.icon}
                  </div>
                  <div>
                    <p className="font-medium">{taskOptions.find(t => t.id === selectedTask)?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {taskOptions.find(t => t.id === selectedTask)?.description}
                    </p>
                  </div>
                </div>

                <Textarea
                  value={taskDetails}
                  onChange={(e) => setTaskDetails(e.target.value)}
                  placeholder="Beskriv vad du vill att AI CEO ska göra. T.ex. 'Skapa en modern webbplats för mitt kafé som visar menyn, öppettider och kontaktinfo...'"
                  className="min-h-[200px] resize-none"
                />
                
                <p className="text-sm text-muted-foreground mt-3">
                  Tips: Inkludera mål, målgrupp och eventuella önskemål om stil eller ton.
                </p>
              </Card>
            </div>
          )}

          {/* Step 3: Email capture */}
          {step === 3 && (
            <div className="animate-fade-in max-w-lg mx-auto">
              <div className="text-center mb-10">
                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                  Nästan klar!
                </h1>
                <p className="text-lg text-muted-foreground">
                  Ange din e-post så startar din AI CEO arbetet direkt.
                </p>
              </div>

              <Card className="p-6">
                <div className="space-y-6">
                  <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span className="font-medium">{taskOptions.find(t => t.id === selectedTask)?.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{taskDetails}</p>
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2">
                      E-postadress
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="din@email.se"
                      className="text-lg"
                    />
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Din AI CEO börjar arbeta direkt. Du kan se progress i realtid 
                      och ge feedback under arbetets gång.
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
            Tillbaka
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="gap-2"
            >
              Fortsätt
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
                  Startar...
                </>
              ) : (
                <>
                  Starta AI CEO
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
