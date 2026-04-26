import { useState } from "react";
import {
  X, Pencil, ArrowUp,
  Megaphone, DollarSign, Users, Calendar, Target, ShoppingCart, Mail,
  TrendingUp, Clock, Zap, Building2, Rocket, Heart, Sparkles, BarChart3,
  Globe, MessageSquare, Search, Lightbulb, Award, Briefcase, CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssistantSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  /** Card variant: floating overlay covering the chat input. */
  variant?: "inline" | "overlay";
  /** Personal title (typically supplied by the AI). */
  title?: string;
  /** Called when the user dismisses the card. */
  onDismiss?: () => void;
  /** Called when the user submits a custom "Something else" answer. */
  onCustom?: (value: string) => void;
}

// Match a single leading emoji (or short emoji cluster) followed by a space.
const LEADING_EMOJI_REGEX =
  /^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u;

function stripLeadingEmoji(raw: string): string {
  return raw.replace(LEADING_EMOJI_REGEX, "").trim();
}

// Keyword → lucide icon mapping. Order matters — earlier matches win.
const ICON_RULES: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /\b(reach|awareness|seen|visib|brand|impressions?)\b/i, icon: Megaphone },
  { test: /\b(sales?|revenue|customers?|buyers?|purchase|conversion)\b/i, icon: DollarSign },
  { test: /\b(leads?|signups?|emails?|contacts?|prospects?)\b/i, icon: Users },
  { test: /\b(week|month|quarter|year|today|tomorrow|date|when|deadline|schedule)\b/i, icon: Calendar },
  { test: /\b(goal|target|objective|focus|priority)\b/i, icon: Target },
  { test: /\b(shop|store|ecom|ecommerce|product|cart|checkout)\b/i, icon: ShoppingCart },
  { test: /\b(email|newsletter|inbox|outreach)\b/i, icon: Mail },
  { test: /\b(growth|grow|scale|increase|expand)\b/i, icon: TrendingUp },
  { test: /\b(now|urgent|asap|immediate|fast|quick)\b/i, icon: Zap },
  { test: /\b(later|wait|soon|hour|minute)\b/i, icon: Clock },
  { test: /\b(enterprise|b2b|company|companies|business|corporate)\b/i, icon: Building2 },
  { test: /\b(launch|start|begin|kick.?off|new)\b/i, icon: Rocket },
  { test: /\b(retention|loyalty|love|nurture|engagement)\b/i, icon: Heart },
  { test: /\b(creative|design|content|idea|inspire)\b/i, icon: Sparkles },
  { test: /\b(report|analytics|metrics|data|kpi|dashboard|stats)\b/i, icon: BarChart3 },
  { test: /\b(website|web|online|internet|global|international)\b/i, icon: Globe },
  { test: /\b(chat|message|conversation|reply|respond|comment)\b/i, icon: MessageSquare },
  { test: /\b(research|search|find|explore|discover|investigate)\b/i, icon: Search },
  { test: /\b(strategy|plan|approach|recommend|suggest|tip)\b/i, icon: Lightbulb },
  { test: /\b(award|win|best|premium|top|elite)\b/i, icon: Award },
  { test: /\b(work|job|career|hire|team|employee|founder|developer)\b/i, icon: Briefcase },
  { test: /\b(yes|done|complete|confirm|ok|okay|approve)\b/i, icon: CheckCircle2 },
];

function pickIcon(label: string, idx: number): LucideIcon {
  for (const rule of ICON_RULES) {
    if (rule.test.test(label)) return rule.icon;
  }
  // Neutral fallback cycle so each row still gets a distinct icon.
  const fallbacks = [Sparkles, Target, Lightbulb, Zap];
  return fallbacks[idx % fallbacks.length];
}

export function AssistantSuggestions({
  suggestions,
  onSelect,
  isLoading,
  variant = "overlay",
  title,
  onDismiss,
  onCustom,
}: AssistantSuggestionsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [customValue, setCustomValue] = useState("");
  // Show 2–4 options.
  const visibleSuggestions = suggestions.slice(0, 4);

  if (visibleSuggestions.length < 1 || isLoading || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const submitCustom = () => {
    const value = customValue.trim();
    if (!value) return;
    setDismissed(true);
    onCustom?.(value);
    setCustomValue("");
  };

  const headerTitle = title?.trim() || "A quick question";

  return (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden",
        variant === "overlay" ? "w-full" : "max-w-md",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 gap-3">
        <p className="text-sm font-medium text-foreground truncate">{headerTitle}</p>
        <button
          onClick={handleDismiss}
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground shrink-0"
          aria-label="Dismiss suggestions"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Suggestion rows (supports 2–4 options) */}
      <div className="flex flex-col">
        {visibleSuggestions.map((suggestion, idx) => {
          const label = stripLeadingEmoji(suggestion);
          const IconComp = pickIcon(label, idx);
          return (
            <button
              key={idx}
              onClick={() => onSelect(label)}
              className={cn(
                "group flex items-center gap-3 text-left px-4 py-3 transition-colors border-b border-border/40",
                "hover:bg-[#F3F0FF]",
                idx === 0 && "bg-[#F3F0FF]/60",
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
                <IconComp className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm text-foreground/90 leading-relaxed flex-1">
                {label}
              </span>
            </button>
          );
        })}

        {/* "Something else" — inline input row */}
        <div className="group flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitCustom();
              }
            }}
            placeholder="Something else…"
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {customValue.trim() && (
            <button
              onClick={submitCustom}
              className="p-1.5 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors"
              aria-label="Send custom answer"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
