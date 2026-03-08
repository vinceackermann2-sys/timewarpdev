import { useState } from "react";
import { 
  Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, 
  Lightbulb, BarChart3, Users, Mail, Calendar, FileText, Loader2,
  ArrowRight, Info, Copy, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Brain } from "lucide-react";

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
  const [copied, setCopied] = useState(false);

  if (role === "user") {
    return (
      <div className="bg-muted textmax-w-[75%] w-fit rounded-lg px-3 py-1.5 text-[12px] font-medium">
        {content}
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrendIcon = (trend?: InsightCard["trend"]) => {
    if (trend === "up") return <TrendingUp className="h-3 w-3 text-primary" /foregroundforegroundnd === "down") return <TrendingDown className="h-3 w-3 text-destructive" />;
    return null;
  };

  const getTrendColor = (trend?: InsightCard["trend"]) => {
    if (trend === "up") return "text-primaryforegroundif (trend === "down") return "text-destructive";
    return "text-muted-foreground";
  };

  return (
    <div className="mr-4 rounded-xl overflow-hidden text-sm group/msg relative">
      {/* Name label with icon */}
      <div className="px-2 pt-2 pb-0.5 flex items-center gap-2">
        <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center">
          <Brain className={cn("h-5 w-5 text-foreground", isStreaming && "animate-pulse")} />
        </div>
        <span className={cn(
          "text-[10px] font-semibold text-primary/60 uppercase tracking-widest",
          isStreaming && !content && "shimmer-text"
        )}>TimeWarp AI</span>
      </div>
      {/* Copy button */}
      {content && !isStreaming && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Copy response"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}

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
        <div className={cn(
          "px-2 py-3 leading-[1.8] prose prose-sm prose-invert max-w-none",
          "prose-headings:text-foreground prose-headings:font-extrabold prose-headings:tracking-tight",
          "prose-p:text-foreground/80 prose-p:my-2.5 prose-p:text-[13.5px]",
          "prose-strong:text-foreground prose-strong:font-bold",
          "prose-ul:my-2 prose-ul:pl-0 prose-ul:list-none",
          "prose-li:text-foreground/80 prose-li:my-1.5 prose-li:text-[13.5px]",
          "[&_ul_li]:flex [&_ul_li]:items-start",
          isStreaming && "streaming-text"
        )}>
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-[15px] font-extrabold text-foreground mt-5 mb-2 pb-1.5 border-b border-primary/30 uppercase tracking-wide">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-[14px] font-extrabold text-foreground mt-4 mb-2 underline decoration-primary/40 decoration-2 underline-offset-4">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2 mt-3 mb-1.5">
                  <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                  <span className="underline decoration-primary/30 decoration-1 underline-offset-3">{children}</span>
                </h3>
              ),
              strong: ({ children }) => (
                <strong className="font-extrabold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="not-italic font-semibold text-primary underline decoration-primary/30 decoration-1 underline-offset-2">{children}</em>
              ),
              li: ({ children }) => (
                <li className="flex items-start gap-2 text-foreground/80 my-1.5">
                  <span className="text-primary text-[10px] mt-[7px] flex-shrink-0">●</span>
                  <span className="flex-1">{children}</span>
                </li>
              ),
              ul: ({ children }) => (
                <ul className="my-2 space-y-0.5 list-none pl-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="my-2 space-y-0.5 list-decimal pl-5 marker:text-primary marker:font-extrabold">{children}</ol>
              ),
              p: ({ children }) => (
                <p className="text-foreground/80 my-2.5 text-[13.5px]">{children}</p>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-primary pl-4 my-3 py-1 text-foreground/70 italic text-[13px]">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="my-4 border-border/40" />
              ),
              table: ({ children }) => (
                <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full border-collapse text-xs">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-primary/8">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="border-b border-border/50 px-3 py-2 text-left font-extrabold text-foreground text-[11px] uppercase tracking-wider">{children}</th>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-border/20 last:border-0">{children}</tr>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-foreground/70 text-xs">{children}</td>
              ),
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                if (isBlock) {
                  return (
                    <pre className="my-3 p-3 rounded-lg bg-muted/50 border border-border/30 overflow-x-auto">
                      <code className="text-xs text-foreground/90">{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-bold">{children}</code>
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
          <span className="text-muted-foreground text-sm">Analyzing your data...</span>
        </div>
      )}
    </div>
  );
}
