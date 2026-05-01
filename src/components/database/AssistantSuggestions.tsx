import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuggestionGroup } from "@/lib/parseSuggestions";

interface AssistantSuggestionsProps {
  /**
   * Multi-question form: pass each [SUGGEST:...] block as its own group so
   * the assistant can ask multiple questions in a single reply (one card
   * per question).  When omitted, falls back to the legacy single-group
   * rendering driven by `suggestions` + `title`.
   */
  questions?: SuggestionGroup[];
  /** Legacy: flat list of options for a single card. */
  suggestions?: string[];
  /** Legacy: title for the single card (when `questions` is omitted). */
  title?: string;
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  /** Card variant: floating overlay covering the chat input. */
  variant?: "inline" | "overlay";
  /** Called when the user dismisses the cards. */
  onDismiss?: () => void;
}

// Match a single leading emoji (or short emoji cluster) followed by a space.
const LEADING_EMOJI_REGEX =
  /^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u;

function splitEmoji(raw: string): { emoji: string | null; label: string } {
  const m = raw.match(LEADING_EMOJI_REGEX);
  if (m) {
    return { emoji: m[1], label: raw.slice(m[0].length).trim() };
  }
  return { emoji: null, label: raw };
}

/**
 * AssistantSuggestions — renders one or more clarifying-question cards
 * floating above the main chat write bar.
 *
 * For "type your own answer" the user uses the main chat input below this
 * card.  No inline write bar here (would be a duplicate).
 */
export function AssistantSuggestions({
  questions,
  suggestions,
  title,
  onSelect,
  isLoading,
  variant = "overlay",
  onDismiss,
}: AssistantSuggestionsProps) {
  const [dismissed, setDismissed] = useState(false);

  // Normalize legacy single-group call into a `groups` array.
  const groups: SuggestionGroup[] = questions && questions.length > 0
    ? questions
    : (suggestions && suggestions.length > 0
        ? [{ title, suggestions }]
        : []);

  if (groups.length === 0 || isLoading || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        variant === "overlay" ? "w-full" : "max-w-md",
      )}
    >
      {groups.map((group, gIdx) => (
        <SuggestionCard
          key={gIdx}
          group={group}
          // Only the first card shows the dismiss button (it dismisses ALL
          // cards together — they belong to the same assistant turn).
          onDismiss={gIdx === 0 ? handleDismiss : undefined}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function SuggestionCard({
  group,
  onSelect,
  onDismiss,
}: {
  group: SuggestionGroup;
  onSelect: (suggestion: string) => void;
  onDismiss?: () => void;
}) {
  const visibleSuggestions = group.suggestions.slice(0, 4);
  const headerTitle = group.title?.trim();

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
      {/* Header — only render when the AI provided a real title */}
      {headerTitle ? (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 gap-3">
          <p className="text-sm font-medium text-foreground truncate">{headerTitle}</p>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground shrink-0"
              aria-label="Dismiss suggestions"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        onDismiss && (
          <div className="flex justify-end px-2 pt-2">
            <button
              onClick={onDismiss}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground"
              aria-label="Dismiss suggestions"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      )}

      {/* Suggestion rows (2–4 options).  No inline "Something else" input —
          the user types custom answers in the main chat write bar below. */}
      <div className="flex flex-col">
        {visibleSuggestions.map((suggestion, idx) => {
          const { emoji, label } = splitEmoji(suggestion);
          return (
            <button
              key={idx}
              onClick={() => onSelect(label)}
              className={cn(
                "group flex items-center gap-3 text-left px-4 py-3 transition-colors",
                idx < visibleSuggestions.length - 1 && "border-b border-border/40",
                "hover:bg-accent",
                idx === 0 && "bg-accent/60",
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-xs font-medium text-muted-foreground">
                {idx + 1}
              </div>
              {emoji && <span className="text-base shrink-0">{emoji}</span>}
              <span className="text-sm text-foreground/90 leading-relaxed flex-1">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
