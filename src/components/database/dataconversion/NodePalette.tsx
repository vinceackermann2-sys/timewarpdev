import { useState } from "react";
import { 
  Database, 
  FileText, 
  FileImage, 
  Globe, 
  Type,
  Search,
  Zap,
  Plus,
  Sparkles,
  Mail,
  Calendar,
  TrendingUp,
  Users,
  FileSpreadsheet,
  Bot,
  Send,
  Edit,
  BarChart3,
  Target,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NodeItem {
  id: string;
  label: string;
  icon: React.ElementType;
  description: string;
  templates?: string[];
}

const quickAccessNodes: NodeItem[] = [
  { id: "business-db", label: "Business Database", icon: Database, description: "Synced business data" },
  { id: "text", label: "Text", icon: Type, description: "Text input" },
  { id: "document", label: "Document", icon: FileText, description: "Documents" },
  { id: "image", label: "Image", icon: FileImage, description: "Visual assets" },
  { id: "website", label: "Website", icon: Globe, description: "Web data" },
];

// Research nodes with templates relevant to business DATA
const researchNodes: NodeItem[] = [
  { 
    id: "email-research", 
    label: "Email Analysis", 
    icon: Mail, 
    description: "Analyze emails",
    templates: [
      "Find unanswered client emails",
      "Extract action items from inbox",
      "Identify high-priority messages",
      "Summarize email threads by topic"
    ]
  },
  { 
    id: "calendar-research", 
    label: "Calendar Insights", 
    icon: Calendar, 
    description: "Scheduling patterns",
    templates: [
      "Find meeting conflicts",
      "Analyze time allocation",
      "Identify scheduling gaps",
      "Track meeting frequency by contact"
    ]
  },
  { 
    id: "market-research", 
    label: "Market Research", 
    icon: TrendingUp, 
    description: "Market trends",
    templates: [
      "Analyze competitor mentions",
      "Track industry keywords",
      "Monitor market sentiment",
      "Identify emerging trends"
    ]
  },
  { 
    id: "contact-research", 
    label: "Contact Analysis", 
    icon: Users, 
    description: "Relationships",
    templates: [
      "Map relationship strength",
      "Find dormant contacts",
      "Identify key stakeholders",
      "Analyze communication patterns"
    ]
  },
  { 
    id: "data-research", 
    label: "Data Analysis", 
    icon: FileSpreadsheet, 
    description: "Spreadsheets",
    templates: [
      "Detect data anomalies",
      "Generate trend reports",
      "Cross-reference datasets",
      "Calculate KPI summaries"
    ]
  },
  { 
    id: "custom-research", 
    label: "Custom Research", 
    icon: Plus, 
    description: "Custom node",
    templates: []
  },
];

// Action nodes with templates relevant to business RESEARCH insights
const actionNodes: NodeItem[] = [
  { 
    id: "ai-agent", 
    label: "AI Agent", 
    icon: Bot, 
    description: "Browser tasks",
    templates: [
      "Execute research follow-ups",
      "Automate data entry from findings",
      "Schedule meetings based on analysis",
      "Update CRM with insights"
    ]
  },
  { 
    id: "send-email", 
    label: "Send Email", 
    icon: Send, 
    description: "Compose emails",
    templates: [
      "Send research summary to team",
      "Follow up on identified priorities",
      "Share analysis with stakeholders",
      "Notify contacts from research"
    ]
  },
  { 
    id: "create-doc", 
    label: "Create Document", 
    icon: Edit, 
    description: "Generate docs",
    templates: [
      "Document research findings",
      "Create analysis report",
      "Generate meeting brief from data",
      "Build proposal from insights"
    ]
  },
  { 
    id: "generate-report", 
    label: "Generate Report", 
    icon: BarChart3, 
    description: "Visual reports",
    templates: [
      "Visualize research trends",
      "Create KPI dashboard from data",
      "Build performance report",
      "Generate executive summary"
    ]
  },
  { 
    id: "set-goal", 
    label: "Set Goal", 
    icon: Target, 
    description: "Track objectives",
    templates: [
      "Set goals from research insights",
      "Create OKRs based on analysis",
      "Track milestones from findings",
      "Define targets from data trends"
    ]
  },
  { 
    id: "custom-action", 
    label: "Custom Action", 
    icon: Plus, 
    description: "Custom node",
    templates: []
  },
];

interface NodeItemCardProps {
  item: NodeItem;
  onDragStart?: (item: NodeItem) => void;
  compact?: boolean;
}

function NodeItemCard({ item, onDragStart, compact }: NodeItemCardProps) {
  const Icon = item.icon;

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(item)}
      className={cn(
        "flex flex-col items-center gap-1.5 p-3 rounded-lg cursor-grab active:cursor-grabbing",
        "bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card",
        "transition-all duration-200",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className={cn(
        "rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0",
        compact ? "h-8 w-8" : "h-10 w-10"
      )}>
        <Icon className={cn("text-primary", compact ? "h-4 w-4" : "h-5 w-5")} />
      </div>
      <p className={cn("font-medium text-center leading-tight", compact ? "text-xs" : "text-sm")}>{item.label}</p>
    </div>
  );
}

interface ResearchActionSectionProps {
  onNodeDragStart?: (item: NodeItem) => void;
}

function ResearchActionSection({ onNodeDragStart }: ResearchActionSectionProps) {
  const [hoveredSection, setHoveredSection] = useState<"research" | "action" | null>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Research Column */}
        <div 
          className="flex-1 flex flex-col min-h-0 relative"
          onMouseEnter={() => setHoveredSection("research")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/50">
            <Search className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium">Research</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 grid grid-cols-2 gap-2">
              {researchNodes.map((item) => (
                <NodeItemCard 
                  key={item.id} 
                  item={item} 
                  onDragStart={onNodeDragStart}
                  compact
                />
              ))}
            </div>
          </ScrollArea>

          {/* Research Templates Dropdown */}
          {hoveredSection === "research" && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 animate-fade-in">
              <div className="bg-popover border border-border rounded-lg shadow-xl p-3 mx-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Business Data Templates
                </p>
                <div className="space-y-1">
                  {["Analyze email patterns", "Map contact relationships", "Extract meeting insights", "Identify data trends"].map((template, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px bg-border/50" />

        {/* Action Column */}
        <div 
          className="flex-1 flex flex-col min-h-0 relative"
          onMouseEnter={() => setHoveredSection("action")}
          onMouseLeave={() => setHoveredSection(null)}
        >
          <div className="flex items-center gap-1.5 px-2 py-2 border-b border-border/50">
            <Zap className="h-3.5 w-3.5 text-accent-foreground" />
            <span className="text-xs font-medium">Action</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 grid grid-cols-2 gap-2">
              {actionNodes.map((item) => (
                <NodeItemCard 
                  key={item.id} 
                  item={item} 
                  onDragStart={onNodeDragStart}
                  compact
                />
              ))}
            </div>
          </ScrollArea>

          {/* Action Templates Dropdown */}
          {hoveredSection === "action" && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 animate-fade-in">
              <div className="bg-popover border border-border rounded-lg shadow-xl p-3 mx-2">
                <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-accent-foreground" />
                  Research-Based Actions
                </p>
                <div className="space-y-1">
                  {["Execute follow-ups from analysis", "Generate report from findings", "Send summary to stakeholders", "Create goals from insights"].map((template, idx) => (
                    <button
                      key={idx}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors"
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface NodePaletteProps {
  onNodeDragStart?: (item: NodeItem) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  const [quickAccessOpen, setQuickAccessOpen] = useState(true);

  return (
    <div className="w-80 border-r border-border bg-card/30 flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h2 className="font-semibold text-sm">Node Library</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Drag nodes onto the canvas</p>
      </div>
      
      {/* Quick Access Section */}
      <div className="border-b border-border/50">
        <button
          onClick={() => setQuickAccessOpen(!quickAccessOpen)}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors"
        >
          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium flex-1 text-left">Quick Access</span>
          <ChevronDown className={cn(
            "h-3 w-3 text-muted-foreground transition-transform",
            !quickAccessOpen && "-rotate-90"
          )} />
        </button>
        
        {quickAccessOpen && (
          <div className="px-3 pb-3 grid grid-cols-2 gap-2 animate-fade-in">
            {quickAccessNodes.map((item) => (
              <NodeItemCard 
                key={item.id} 
                item={item} 
                onDragStart={onNodeDragStart}
                compact
              />
            ))}
          </div>
        )}
      </div>

      {/* Research & Action Side by Side */}
      <ResearchActionSection onNodeDragStart={onNodeDragStart} />
    </div>
  );
}

export type { NodeItem };
