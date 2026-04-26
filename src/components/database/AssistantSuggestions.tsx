import { useState } from "react";
import { X, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssistantSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  /** Card variant: floating overlay covering the chat input. */
  variant?: "inline" | "overlay";
  /** Optional title shown in card header. Defaults to a friendly prompt. */
  title?: string;
  /** Called when the user dismisses the card. */
  onDismiss?: () => void;
  /** Called when the user picks "Something else" — typically focuses the input. */
  onCustom?: () => void;
}

// Light pastel emojis to add warmth to each row, cycled by index.
const ROW_EMOJIS = ["📣", "💰", "👥", "✨", "🎯", "🚀"];

export function AssistantSuggestions({
  suggestions,
  onSelect,
  isLoading,
  variant = "overlay",
  title = "Pick a quick follow-up",
  onDismiss,
  onCustom,
}: AssistantSuggestionsProps) {
  const [dismissed, setDismissed] = useState(false);
  if (!suggestions.length || isLoading || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const card = (
    <div
      className={cn(
        "bg-card border border-border/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden",
        variant === "overlay" ? "w-full" : "max-w-md",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>1 of 1</span>
          <button
            onClick={handleDismiss}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            aria-label="Dismiss suggestions"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Suggestion rows */}
      <div className="flex flex-col">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            className={cn(
              "group flex items-center gap-3 text-left px-4 py-3 transition-colors",
              "hover:bg-[#F3F0FF]",
              idx !== suggestions.length - 1 && "border-b border-border/40",
              idx === 0 && "bg-[#F3F0FF]/60",
            )}
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-xs font-medium text-muted-foreground">
              {idx + 1}
            </div>
            <span className="text-base shrink-0">{ROW_EMOJIS[idx % ROW_EMOJIS.length]}</span>
            <span className="text-sm text-foreground/90 leading-relaxed flex-1">
              {suggestion}
            </span>
          </button>
        ))}

        {/* "Something else" custom option */}
        <button
          onClick={() => {
            handleDismiss();
            onCustom?.();
          }}
          className="group flex items-center gap-3 text-left px-4 py-3 border-t border-border/40 hover:bg-muted/40 transition-colors"
        >
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm text-muted-foreground flex-1">Something else</span>
        </button>
      </div>
    </div>
  );

  return card;
}
