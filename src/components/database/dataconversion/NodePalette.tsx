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
  Target
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

interface NodeCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NodeItem[];
}

const quickAccessNodes: NodeItem[] = [
  { id: "business-db", label: "Business Database", icon: Database, description: "Connect to your synced business data" },
  { id: "text", label: "Text", icon: Type, description: "Add text input or content" },
  { id: "document", label: "Document", icon: FileText, description: "Upload or reference documents" },
  { id: "image", label: "Image", icon: FileImage, description: "Add images or visual assets" },
  { id: "website", label: "Website", icon: Globe, description: "Fetch data from websites" },
];

const researchNodes: NodeItem[] = [
  { 
    id: "email-research", 
    label: "Email Analysis", 
    icon: Mail, 
    description: "Analyze email patterns and communications",
    templates: ["Summarize unread emails", "Find action items in threads", "Identify key contacts"]
  },
  { 
    id: "calendar-research", 
    label: "Calendar Insights", 
    icon: Calendar, 
    description: "Research scheduling and meeting patterns",
    templates: ["Meeting time analysis", "Find scheduling conflicts", "Optimize calendar"]
  },
  { 
    id: "market-research", 
    label: "Market Research", 
    icon: TrendingUp, 
    description: "Analyze market trends and data",
    templates: ["Competitor analysis", "Industry trends", "Market opportunities"]
  },
  { 
    id: "contact-research", 
    label: "Contact Analysis", 
    icon: Users, 
    description: "Research contacts and relationships",
    templates: ["Network mapping", "Relationship strength", "Follow-up priorities"]
  },
  { 
    id: "data-research", 
    label: "Data Analysis", 
    icon: FileSpreadsheet, 
    description: "Analyze spreadsheets and data files",
    templates: ["Data summarization", "Trend identification", "Anomaly detection"]
  },
  { 
    id: "custom-research", 
    label: "Custom Research", 
    icon: Plus, 
    description: "Create a custom research node",
    templates: []
  },
];

const actionNodes: NodeItem[] = [
  { 
    id: "ai-agent", 
    label: "AI Agent", 
    icon: Bot, 
    description: "Execute autonomous browser tasks",
    templates: ["Fill out forms", "Schedule meetings", "Send follow-ups"]
  },
  { 
    id: "send-email", 
    label: "Send Email", 
    icon: Send, 
    description: "Compose and send emails",
    templates: ["Reply to thread", "Send newsletter", "Cold outreach"]
  },
  { 
    id: "create-doc", 
    label: "Create Document", 
    icon: Edit, 
    description: "Generate documents and reports",
    templates: ["Meeting notes", "Project proposal", "Status report"]
  },
  { 
    id: "generate-report", 
    label: "Generate Report", 
    icon: BarChart3, 
    description: "Create visual reports and charts",
    templates: ["Weekly summary", "KPI dashboard", "Performance review"]
  },
  { 
    id: "set-goal", 
    label: "Set Goal", 
    icon: Target, 
    description: "Define and track objectives",
    templates: ["OKR creation", "Milestone tracking", "Progress update"]
  },
  { 
    id: "custom-action", 
    label: "Custom Action", 
    icon: Plus, 
    description: "Create a custom action node",
    templates: []
  },
];

interface NodeItemCardProps {
  item: NodeItem;
  onDragStart?: (item: NodeItem) => void;
}

function NodeItemCard({ item, onDragStart }: NodeItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;
  const hasTemplates = item.templates && item.templates.length > 0;

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        draggable
        onDragStart={() => onDragStart?.(item)}
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg cursor-grab active:cursor-grabbing",
          "bg-card/50 border border-border/50 hover:border-primary/50 hover:bg-card",
          "transition-all duration-200"
        )}
      >
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-xs text-muted-foreground truncate">{item.description}</p>
        </div>
      </div>

      {/* Template suggestions on hover */}
      {hasTemplates && isHovered && (
        <div className="absolute left-full top-0 ml-2 z-50 w-48 animate-fade-in">
          <div className="bg-popover border border-border rounded-lg shadow-lg p-2">
            <p className="text-xs font-medium text-muted-foreground px-2 py-1">Templates</p>
            {item.templates?.map((template, idx) => (
              <button
                key={idx}
                className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Sparkles className="h-3 w-3 text-primary" />
                {template}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface NodeSectionProps {
  title: string;
  icon: React.ElementType;
  items: NodeItem[];
  defaultOpen?: boolean;
  onNodeDragStart?: (item: NodeItem) => void;
}

function NodeSection({ title, icon: SectionIcon, items, defaultOpen = true, onNodeDragStart }: NodeSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 hover:bg-accent/50 transition-colors"
      >
        <SectionIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        <span className={cn(
          "text-xs text-muted-foreground transition-transform",
          isOpen ? "rotate-0" : "-rotate-90"
        )}>▼</span>
      </button>
      
      {isOpen && (
        <div className="px-3 pb-3 space-y-2 animate-fade-in">
          {items.map((item) => (
            <NodeItemCard 
              key={item.id} 
              item={item} 
              onDragStart={onNodeDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface NodePaletteProps {
  onNodeDragStart?: (item: NodeItem) => void;
}

export function NodePalette({ onNodeDragStart }: NodePaletteProps) {
  return (
    <div className="w-72 border-r border-border bg-card/30 flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm">Node Library</h2>
        <p className="text-xs text-muted-foreground mt-1">Drag nodes onto the canvas</p>
      </div>
      
      <ScrollArea className="flex-1">
        <NodeSection 
          title="Quick Access" 
          icon={Zap} 
          items={quickAccessNodes}
          onNodeDragStart={onNodeDragStart}
        />
        <NodeSection 
          title="Research Nodes" 
          icon={Search} 
          items={researchNodes}
          onNodeDragStart={onNodeDragStart}
        />
        <NodeSection 
          title="Action Nodes" 
          icon={Bot} 
          items={actionNodes}
          onNodeDragStart={onNodeDragStart}
        />
      </ScrollArea>
    </div>
  );
}

export type { NodeItem };
