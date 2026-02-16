import { 
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Lightbulb, BarChart3, Users, Mail, Calendar, FileText, Loader2,
  ArrowRight, Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export interface InsightCard {
  icon: string;
  title: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface ResearchChatMessageProps {
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
  "ℹ️": <Info className="h-4 w-4" />,
};

export function ResearchChatMessage({ role, content, insightCards, isStreaming }: ResearchChatMessageProps) {
  if (role === "user") {
    return (
      <div className="bg-primary text-primary-foreground ml-8 rounded-lg px-3 py-2 text-sm">
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
    <div className="bg-muted mr-4 rounded-xl overflow-hidden text-sm shadow-sm border border-border/30">
      {/* Insight Cards Grid */}
      {insightCards && insightCards.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="grid grid-cols-2 gap-2">
            {insightCards.map((card, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground mb-1.5">
                  <span className="text-primary">
                    {iconMap[card.icon] || <Sparkles className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold truncate">
                    {card.title}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground">{card.value}</span>
                  {card.trend && card.trendValue && (
                    <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", getTrendColor(card.trend))}>
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
        <div className="px-5 py-4 leading-[1.75] prose prose-sm prose-invert max-w-none
          prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
          prose-h1:text-base prose-h1:mt-5 prose-h1:mb-3
          prose-h2:text-[15px] prose-h2:mt-4 prose-h2:mb-2
          prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5
          prose-p:text-muted-foreground prose-p:my-2 prose-p:text-[13px]
          prose-strong:text-foreground prose-strong:font-bold
          prose-ul:my-2 prose-ul:pl-0 prose-ul:list-none
          prose-li:text-muted-foreground prose-li:my-1 prose-li:pl-0 prose-li:text-[13px]
          [&_ul_li]:flex [&_ul_li]:items-start [&_ul_li]:gap-0
        ">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-base font-bold text-foreground mt-5 mb-3 pb-2 border-b-2 border-primary/40">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-[15px] font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
                  <span className="inline-block w-1 h-4 rounded-full bg-primary" />
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-3 mb-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  {children}
                </h3>
              ),
              strong: ({ children }) => (
                <strong className="font-bold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-primary/80 not-italic font-medium">{children}</em>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2.5 text-muted-foreground my-1">
                  <span className="text-primary text-xs mt-1.5 flex-shrink-0">✦</span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              ul: ({ children }) => (
                <ul className="my-2 space-y-1 list-none pl-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2 space-y-1 list-decimal pl-5 marker:text-primary marker:font-bold">{children}</ol>
              ),
              p: ({ children }) => (
                <p className="text-muted-foreground my-2 text-[13px]">{children}</p>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-3 border-primary/50 pl-4 my-3 py-2 bg-primary/5 rounded-r-lg text-muted-foreground italic text-[13px]">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="my-4 border-border/50" />
              ),
              table: ({ children }) => (
                <div className="my-3 w-full overflow-x-auto rounded-xl border border-border shadow-sm">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-primary/10">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border-b border-border px-3 py-2.5 text-left font-bold text-foreground text-xs uppercase tracking-wider">{children}</th>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">{children}</tr>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2.5 text-muted-foreground text-xs">{children}</td>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="my-3 p-3 rounded-lg bg-background/80 border border-border/50 overflow-x-auto">
                      <code className="text-xs text-foreground">{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">{children}</code>
                );
              },
            }}
          >
            {content}
          </ReactMarkdown>
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />}
        </div>
      )}

      {/* Loading state */}
      {!content && !insightCards?.length && isStreaming && (
        <div className="px-4 py-4 flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Analyzing your data...</span>
        </div>
      )}
    </div>
  );
}
