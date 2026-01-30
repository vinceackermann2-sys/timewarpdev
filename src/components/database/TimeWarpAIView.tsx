import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Bot, Rocket, Clock, User, Sparkles } from "lucide-react";
import { LiveBrowserView } from "./LiveBrowserView";

type Role = "ceo" | "cmo" | "cfo";
type TimeEstimate = "5min" | "15min" | "30min" | "1hour";

interface TaskConfig {
  role: Role;
  task: string;
  timeEstimate: TimeEstimate;
}

const roleConfig = {
  ceo: {
    label: "CEO",
    icon: "👑",
    description: "Strategic business decisions and operations",
    color: "from-amber-500/20 to-amber-600/10"
  },
  cmo: {
    label: "CMO", 
    icon: "📣",
    description: "Marketing, branding, and customer outreach",
    color: "from-pink-500/20 to-pink-600/10"
  },
  cfo: {
    label: "CFO",
    icon: "💵", 
    description: "Financial planning and resource management",
    color: "from-emerald-500/20 to-emerald-600/10"
  }
};

const timeOptions = [
  { value: "5min", label: "~5 minutes", description: "Quick task" },
  { value: "15min", label: "~15 minutes", description: "Standard task" },
  { value: "30min", label: "~30 minutes", description: "Complex task" },
  { value: "1hour", label: "~1 hour", description: "In-depth work" }
];

export function TimeWarpAIView() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate>("15min");
  const [isRunning, setIsRunning] = useState(false);
  const [taskConfig, setTaskConfig] = useState<TaskConfig | null>(null);

  const handleStartTask = () => {
    if (!selectedRole || !taskDescription.trim()) return;
    
    setTaskConfig({
      role: selectedRole,
      task: taskDescription,
      timeEstimate
    });
    setIsRunning(true);
  };

  const handleComplete = () => {
    setIsRunning(false);
    setTaskConfig(null);
    setSelectedRole(null);
    setTaskDescription("");
    setTimeEstimate("15min");
  };

  const handleTakeControl = () => {
    setIsRunning(false);
  };

  // Show live browser view when running
  if (isRunning && taskConfig) {
    return (
      <LiveBrowserView
        role={taskConfig.role}
        task={taskConfig.task}
        timeEstimate={taskConfig.timeEstimate}
        onComplete={handleComplete}
        onTakeControl={handleTakeControl}
      />
    );
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-auto">
      <div className="max-w-4xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/favicon.png" 
              alt="TimeWarp" 
              className="h-12 w-12 rounded-xl object-cover shadow-glow"
            />
            <h1 className="text-3xl font-bold">TimeWarp AI</h1>
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-muted-foreground max-w-md mx-auto">
            Put your AI employee to work. It will browse the web, sign up to services, and complete tasks on your behalf.
          </p>
        </div>

        {/* Step 1: Choose Role */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Step 1: Choose Your AI Executive
            </CardTitle>
            <CardDescription>
              Select the role that best fits your task
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.entries(roleConfig) as [Role, typeof roleConfig.ceo][]).map(([role, config]) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`relative p-6 rounded-xl border-2 transition-all duration-300 text-left
                    ${selectedRole === role 
                      ? 'border-primary bg-primary/10 shadow-glow' 
                      : 'border-border/50 hover:border-primary/50 hover:bg-card/50'
                    }`}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${config.color} opacity-50`} />
                  <div className="relative">
                    <span className="text-4xl mb-3 block">{config.icon}</span>
                    <h3 className="font-bold text-lg">{config.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                  </div>
                  {selectedRole === role && (
                    <div className="absolute top-3 right-3 h-3 w-3 rounded-full bg-primary animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Describe Task */}
        <Card className={`border-border/50 transition-opacity duration-300 ${selectedRole ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Step 2: Describe Your Task
            </CardTitle>
            <CardDescription>
              Be specific about what you want the AI to accomplish
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task">Task Description</Label>
              <Textarea
                id="task"
                placeholder="Example: Create a new CRM system in HubSpot. Set up pipelines for sales, onboarding, and support. Add custom fields for company size and industry..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="min-h-[120px] resize-none"
              />
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <h4 className="font-medium text-sm mb-2">💡 Task Ideas</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• "Sign up for Notion and create a project management workspace"</li>
                <li>• "Create a Trello board for Q1 marketing campaigns"</li>
                <li>• "Set up a Mailchimp account and create an email template"</li>
                <li>• "Build a simple landing page on Carrd"</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Time Estimate */}
        <Card className={`border-border/50 transition-opacity duration-300 ${taskDescription.trim() ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-primary" />
              Step 3: Estimated Time
            </CardTitle>
            <CardDescription>
              How long should the AI spend on this task?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={timeEstimate} onValueChange={(v) => setTimeEstimate(v as TimeEstimate)}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-muted-foreground ml-2">— {option.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Launch Button */}
        <div className="flex justify-center pt-4">
          <Button
            size="lg"
            onClick={handleStartTask}
            disabled={!selectedRole || !taskDescription.trim()}
            className="portal-button px-8 py-6 text-lg gap-3 disabled:opacity-50"
          >
            <Rocket className="h-5 w-5" />
            Launch AI Agent
          </Button>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground max-w-md mx-auto">
          The AI will use your connected Google account credentials where applicable. 
          You can take control at any time during execution.
        </p>
      </div>
    </div>
  );
}
