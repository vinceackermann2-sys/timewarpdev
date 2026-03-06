import { 
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Lightbulb, BarChart3, Users, Mail, Calendar, FileText, Loader2,
  DollarSign, Clock, Target, Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { extractSuggestions } from "@/lib/parseSuggestions";
import adEvoIcon from "@/assets/ad-evo-icon.svg";

export interface InsightCard {
  icon: string;
  title: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface DatabaseChatMessageProps {
  role: "user" | "assistant";
  content: string;
  insightCards?: InsightCard[];
  isStreaming?: boolean;
}

// Parse insight cards from response: [INSIGHT:icon|title|value|trend|trendValue]
export function parseInsightCards(text: string): { content: string; insights: InsightCard[] } {
  const insights: InsightCard[] = [];
  let content = text;
  
  const insightRegex = /\[INSIGHT:([^|]+)\|([^|]+)\|([^|]+)(?:\|([^|]+))?(?:\|([^\]]+))?\]/g;
  let match;
  while ((match = insightRegex.exec(text)) !== null) {
    insights.push({
      icon: match[1],
      title: match[2],
      value: match[3],
      trend: (match[4] as InsightCard["trend"]) || undefined,
      trendValue: match[5] || undefined,
    });
  }
  content = content.replace(insightRegex, "");
  
  return { content: content.trim(), insights };
}

// Parse suggestions using shared robust parser
export function parseSuggestions(text: string): { content: string; suggestions: string[] } {
  return extractSuggestions(text);
}

const iconMap: Record<string, React.ReactNode> = {
  "📊": <BarChart3 className="h-4 w-4" />,
  "📈": <TrendingUp className="h-4 w-4" />,
  "📉": <TrendingDown className="h-4 w-4" />,
  "👥": <Users className="h-4 w-4" />,
  "📧": <Mail className="h-4 w-4" />,
  "📅": <Calendar className="h-4 w-4" />,
  "📄": <FileText className="h-4 w-4" />,
  "💡": <Lightbulb className="h-4 w-4" />,
  "⚠️": <AlertTriangle className="h-4 w-4" />,
  "✅": <CheckCircle2 className="h-4 w-4" />,
  "✨": <Sparkles className="h-4 w-4" />,
  "💰": <DollarSign className="h-4 w-4" />,
  "⏰": <Clock className="h-4 w-4" />,
  "🎯": <Target className="h-4 w-4" />,
  "⚡": <Zap className="h-4 w-4" />,
};

export function DatabaseChatMessage({ role, content, insightCards, isStreaming }: DatabaseChatMessageProps) {
  if (role === "user") {
    return (
      <div className="bg-primary text-primary-foreground ml-auto max-w-[60%] rounded-full px-3 py-1 text-[11px]">
        {content}
      </div>
    );
  }

  const getTrendIcon = (trend?: InsightCard["trend"]) => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-primary" />;
    if (trend === "down") return <TrendingDown className="h-3 w-3 text-destructive" />;
    return null;
  };

  const getTrendColor = (trend?: InsightCard["trend"]) => {
    if (trend === "up") return "text-primary";
    if (trend === "down") return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div className="bg-card/80 backdrop-blur border border-border/50 max-w-[80%] rounded-2xl rounded-bl-md overflow-hidden text-sm">
      {/* Name label with icon */}
      <div className="px-4 pt-3 pb-0.5 flex items-center gap-2">
        <img 
          src={adEvoIcon} 
          alt="" 
          className={cn(
            "h-8 w-8 transition-all",
            isStreaming && !content ? "icon-thinking" : "",
            isStreaming && content ? "icon-streaming" : "",
            !isStreaming && content ? "icon-done" : ""
          )} 
        />
        <span className="text-[10px] font-semibold text-primary/60 uppercase tracking-widest">TimeWarp AI</span>
      </div>
      {/* Insight Cards Grid */}
      {insightCards && insightCards.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {insightCards.map((card, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-muted/50 border border-border/30 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
                  <span className="text-primary">
                    {iconMap[card.icon] || <Sparkles className="h-4 w-4" />}
                  </span>
                  <span className="text-xs uppercase tracking-wide font-medium truncate">
                    {card.title}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-foreground">{card.value}</span>
                  {card.trend && card.trendValue && (
                    <span className={cn("flex items-center gap-0.5 text-xs font-medium", getTrendColor(card.trend))}>
                      {getTrendIcon(card.trend)}
                      {card.trendValue}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content with Markdown */}
      {content && (
        <div className={cn(
          "px-4 py-3 leading-relaxed prose prose-sm prose-invert max-w-none",
          "prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-2",
          "prose-h3:text-sm prose-h3:flex prose-h3:items-center prose-h3:gap-2",
          "prose-p:text-foreground/90 prose-p:my-2",
          "prose-strong:text-primary prose-strong:font-semibold",
          "prose-ul:my-2 prose-ul:pl-0 prose-ul:list-none",
          "prose-li:text-foreground/90 prose-li:my-1 prose-li:pl-0",
          isStreaming && "streaming-text"
        )}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-lg font-bold text-foreground mt-4 mb-2 border-b border-primary/30 pb-1">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-semibold text-foreground mt-3 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-4 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {children}
                </h3>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-primary">{children}</strong>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-foreground/90 my-1">
                  <span className="text-primary text-sm mt-0.5">✦</span>
                  <span>{children}</span>
                </li>
              ),
              ul: ({ children }) => (
                <ul className="my-2 space-y-1 list-none pl-0">{children}</ul>
              ),
              p: ({ children }) => (
                <p className="text-foreground/90 my-2 leading-relaxed">{children}</p>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-foreground/80 italic">{children}</blockquote>
              ),
              table: ({ children }) => (
                <div className="my-3 w-full overflow-x-auto rounded-lg border border-border">
                  <table className="w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border-b border-border px-4 py-2 text-left font-semibold text-foreground text-xs">{children}</th>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-border/50 last:border-0">{children}</tr>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 text-foreground/90 text-sm">{children}</td>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />}
        </div>
      )}

      {/* Loading state */}
      {!content && !insightCards?.length && isStreaming && (
        <div className="px-4 py-4 flex items-center gap-2">
          <img src={adEvoIcon} alt="" className="h-7 w-7 icon-thinking" />
          <span className="text-muted-foreground">Analyzing your data...</span>
        </div>
      )}
    </div>
  );
}
