import { useState } from "react";
import { Database, Sparkles, Mail, Calendar, FileText, TrendingUp, Users, DollarSign, X, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FloatingChat } from "./FloatingChat";
import { cn } from "@/lib/utils";

// Template questions based on common business insights from Google Workspace
const templateQuestions = [
  {
    id: 1,
    icon: Mail,
    category: "Email Analytics",
    question: "What are the most common topics in my recent emails?",
    description: "Analyze email patterns and key discussion themes",
    details: "This analysis scans your Gmail inbox to identify recurring topics, key stakeholders, and communication patterns. Get insights into response times, thread lengths, and priority conversations.",
    sampleData: ["47 emails about Q4 planning", "23 vendor negotiations", "15 team updates"]
  },
  {
    id: 2,
    icon: Calendar,
    category: "Calendar Insights",
    question: "How is my time distributed across meetings?",
    description: "Break down meeting types and time allocation",
    details: "Visualize your calendar data to understand how time is spent across different meeting types, attendees, and projects. Identify opportunities to optimize your schedule.",
    sampleData: ["35% internal meetings", "28% client calls", "22% focus time"]
  },
  {
    id: 3,
    icon: TrendingUp,
    category: "Business Trends",
    question: "What trends are emerging in my business communications?",
    description: "Identify patterns in client and team interactions",
    details: "Track emerging topics and shifts in communication focus over time. Spot opportunities and potential issues before they become critical.",
    sampleData: ["↑ 40% AI discussions", "↑ 25% budget reviews", "↓ 15% travel requests"]
  },
  {
    id: 4,
    icon: Users,
    category: "Team Activity",
    question: "Who are my most active collaborators?",
    description: "See collaboration frequency with team members",
    details: "Map your collaboration network to understand key relationships, communication frequency, and team dynamics across your organization.",
    sampleData: ["Sarah Chen: 156 interactions", "Mike Ross: 98 interactions", "Team avg: 45 interactions"]
  },
  {
    id: 5,
    icon: DollarSign,
    category: "Financial Mentions",
    question: "What financial topics are being discussed?",
    description: "Track mentions of budgets, revenue, and expenses",
    details: "Extract financial references from your communications to stay on top of budget discussions, revenue mentions, and expense tracking across all channels.",
    sampleData: ["$2.4M budget discussed", "12 invoice mentions", "Q4 forecast updates"]
  },
  {
    id: 6,
    icon: FileText,
    category: "Document Activity",
    question: "What documents have been most active recently?",
    description: "Track document edits and collaboration",
    details: "Monitor activity across your Google Drive to see which documents are getting the most attention, who's editing them, and recent changes.",
    sampleData: ["Strategy Doc: 24 edits", "Budget Sheet: 18 views", "Proposal: 12 comments"]
  }
];

interface ExpandedCardProps {
  item: typeof templateQuestions[0];
  onClose: () => void;
  onAsk: (question: string) => void;
}

function ExpandedCard({ item, onClose, onAsk }: ExpandedCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-2xl bg-card border-primary/20 shadow-2xl shadow-primary/10">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-border">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <span className="text-xs text-primary font-medium uppercase tracking-wider">{item.category}</span>
                <h3 className="text-xl font-semibold mt-1">{item.question}</h3>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <p className="text-muted-foreground leading-relaxed">{item.details}</p>
            
            {/* Sample Data Preview */}
            <div className="bg-muted/50 rounded-xl p-4 border border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Sample Insights
              </h4>
              <ul className="space-y-2">
                {item.sampleData.map((data, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {data}
                  </li>
                ))}
              </ul>
            </div>

            {/* Action Button */}
            <button
              onClick={() => onAsk(item.question)}
              className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Ask TimeWarp AI
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DatabaseView() {
  const [expandedCard, setExpandedCard] = useState<typeof templateQuestions[0] | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const handleAskQuestion = (question: string) => {
    console.log("Asking AI:", question);
    setExpandedCard(null);
    // TODO: Send to floating chat
  };

  return (
    <div className="h-full flex flex-col relative">
      <ScrollArea className="flex-1">
        <div className="min-h-full flex flex-col items-center justify-center p-8">
          {/* Header */}
          <div className="text-center mb-12 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Business Intelligence Hub</span>
            </div>
            <h1 className="text-3xl font-bold mb-4">
              Your Business Data at a Glance
            </h1>
            <p className="text-muted-foreground text-lg">
              Hover over a card to explore insights from your connected Google Workspace
            </p>
          </div>

          {/* Cards Grid - Centered */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 max-w-5xl w-full">
            {templateQuestions.map((item) => (
              <Card 
                key={item.id}
                className={cn(
                  "relative overflow-hidden cursor-pointer transition-all duration-300 border-border",
                  "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
                  "group"
                )}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => setExpandedCard(item)}
              >
                {/* Glow effect on hover */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity duration-300",
                  hoveredCard === item.id && "opacity-100"
                )} />
                
                <CardContent className="p-5 relative">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300",
                      "bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110"
                    )}>
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs text-primary/80 font-medium uppercase tracking-wide">{item.category}</span>
                      <p className="font-medium text-sm mt-1 leading-snug line-clamp-2">{item.question}</p>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{item.description}</p>
                    </div>
                  </div>

                  {/* Expand hint on hover */}
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 transform scale-x-0 transition-transform duration-300 origin-left",
                    hoveredCard === item.id && "scale-x-100"
                  )} />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom Stats */}
          <div className="mt-12 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Live sync active</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>6 data categories</span>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Expanded Card Modal */}
      {expandedCard && (
        <ExpandedCard 
          item={expandedCard} 
          onClose={() => setExpandedCard(null)}
          onAsk={handleAskQuestion}
        />
      )}

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
}
