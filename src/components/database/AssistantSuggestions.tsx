import { useState } from "react";
import { X, Pencil, ArrowUp } from "lucide-react";
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
// Falls back to a neutral dot if the AI didn't supply one.
const LEADING_EMOJI_REGEX =
  /^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u;

function splitEmoji(raw: string): { emoji: string | null; label: string } {
  const m = raw.match(LEADING_EMOJI_REGEX);
  if (m) {
    return { emoji: m[1], label: raw.slice(m[0].length).trim() };
  }
  return { emoji: null, label: raw };
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
          const { emoji, label } = splitEmoji(suggestion);
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
