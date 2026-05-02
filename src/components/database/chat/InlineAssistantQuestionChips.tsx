import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/agentChat/types";
import type { SuggestionGroup } from "@/lib/parseSuggestions";

const EMOJI_PREFIX = /^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u;

function resolveChipPayload(message: ChatMessage, chipLabel: string): string {
  const map = message.planActionPayloads;
  if (!map) return chipLabel;
  if (map[chipLabel]) return map[chipLabel];
  const stripped = chipLabel.replace(EMOJI_PREFIX, "").trim();
  if (map[stripped]) return map[stripped];
  return chipLabel;
}

/**
 * Renders [SUGGEST:…] options inline on the assistant bubble (not above the composer).
 */
export function InlineAssistantQuestionChips({
  message,
  onChipSelect,
  onDismiss,
}: {
  message: ChatMessage;
  onChipSelect: (text: string) => void;
  onDismiss: () => void;
}) {
  const groups: SuggestionGroup[] =
    message.suggestionQuestions && message.suggestionQuestions.length > 0
      ? message.suggestionQuestions
      : message.suggestions && message.suggestions.length > 0
        ? [{ title: message.suggestionTitle, suggestions: message.suggestions }]
        : [];

  if (groups.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border/50 bg-muted/25 px-3 py-2.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Quick replies</p>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground shrink-0"
          aria-label="Dismiss quick replies"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {groups.map((group, gIdx) => {
        const chips = group.suggestions.slice(0, 4);
        if (chips.length === 0) return null;
        const title = group.title?.trim();
        return (
          <div key={gIdx} className="space-y-2">
            {title ? <p className="text-xs font-medium text-foreground/90">{title}</p> : null}
            <div className="flex flex-wrap gap-2">
              {chips.map((raw, i) => {
                const payload = resolveChipPayload(message, raw);
                const emojiMatch = raw.match(EMOJI_PREFIX);
                const display = emojiMatch ? raw.slice(emojiMatch[0].length).trim() : raw;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChipSelect(payload)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-left text-xs font-medium text-foreground/90",
                      "hover:bg-accent hover:border-border transition-colors max-w-full",
                    )}
                  >
                    {emojiMatch ? <span className="shrink-0 text-sm">{emojiMatch[1]}</span> : null}
                    <span className="break-words">{display || raw}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
