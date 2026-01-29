import { Database, Search, Sparkles, Mail, Calendar, FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FloatingChat } from "./FloatingChat";

// Template questions based on common business insights from Google Workspace
const templateQuestions = [
  {
    id: 1,
    icon: Mail,
    category: "Email Analytics",
    question: "What are the most common topics in my recent emails?",
    description: "Analyze email patterns and key discussion themes"
  },
  {
    id: 2,
    icon: Calendar,
    category: "Calendar Insights",
    question: "How is my time distributed across meetings?",
    description: "Break down meeting types and time allocation"
  },
  {
    id: 3,
    icon: TrendingUp,
    category: "Business Trends",
    question: "What trends are emerging in my business communications?",
    description: "Identify patterns in client and team interactions"
  },
  {
    id: 4,
    icon: Users,
    category: "Team Activity",
    question: "Who are my most active collaborators?",
    description: "See collaboration frequency with team members"
  },
  {
    id: 5,
    icon: DollarSign,
    category: "Financial Mentions",
    question: "What financial topics are being discussed?",
    description: "Track mentions of budgets, revenue, and expenses"
  },
  {
    id: 6,
    icon: FileText,
    category: "Document Activity",
    question: "What documents have been most active recently?",
    description: "Track document edits and collaboration"
  }
];

// Simulated business data storage entries
const businessDataEntries = [
  {
    id: 1,
    type: "Email Summary",
    title: "Q4 Client Communications",
    lastUpdated: "2 hours ago",
    status: "synced"
  },
  {
    id: 2,
    type: "Calendar Analysis",
    title: "Weekly Meeting Patterns",
    lastUpdated: "1 day ago",
    status: "synced"
  },
  {
    id: 3,
    type: "Document Insights",
    title: "Project Proposals Overview",
    lastUpdated: "3 days ago",
    status: "synced"
  }
];

export function DatabaseView() {
  const handleQuestionClick = (question: string) => {
    // This will be used to send the question to the chat
    console.log("Question clicked:", question);
  };

  return (
    <div className="h-full flex flex-col p-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Business Database
          </h1>
          <p className="text-muted-foreground mt-1">
            Your business insights from Google Workspace
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Search your business data..." 
          className="pl-10 bg-card border-border"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 pb-20">
          {/* Business Data Storage Section */}
          <div>
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              Stored Business Data
            </h2>
            <div className="grid gap-3">
              {businessDataEntries.map((entry) => (
                <Card key={entry.id} className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{entry.title}</p>
                        <p className="text-sm text-muted-foreground">{entry.type}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs text-primary">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {entry.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.lastUpdated}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Template Questions Section */}
          <div>
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Suggested Questions
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {templateQuestions.map((item) => (
                <Card 
                  key={item.id} 
                  className="hover:bg-muted/50 transition-colors cursor-pointer group"
                  onClick={() => handleQuestionClick(item.question)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground">{item.category}</span>
                        <p className="font-medium text-sm mt-0.5 leading-snug">{item.question}</p>
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
}
