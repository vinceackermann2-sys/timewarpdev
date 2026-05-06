import { useEffect, useRef, useState } from "react";
import { X, ArrowRight, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuggestionGroup } from "@/lib/parseSuggestions";

interface AssistantSuggestionsProps {
  questions?: SuggestionGroup[];
  suggestions?: string[];
  title?: string;
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  variant?: "inline" | "overlay";
  onDismiss?: () => void;
}

const LEADING_EMOJI_REGEX =
  /^(\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic})*\uFE0F?)\s+/u;

function splitEmoji(raw: string): { emoji: string | null; label: string } {
  const m = raw.match(LEADING_EMOJI_REGEX);
  if (m) return { emoji: m[1], label: raw.slice(m[0].length).trim() };
  return { emoji: null, label: raw };
}

/**
 * AssistantSuggestions — renders clarifying-question cards with:
 *  - Always an inline "Something else" custom-answer option
 *  - When multiple questions exist, a Next button to step through them,
 *    collecting an answer per question and submitting them combined.
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
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Array<{ q?: string; a: string }>>([]);

  const groups: SuggestionGroup[] = questions && questions.length > 0
    ? questions
    : (suggestions && suggestions.length > 0 ? [{ title, suggestions }] : []);

  // Reset step state when the underlying questions change.
  const groupsKey = groups.map((g) => `${g.title || ""}|${g.suggestions.join(",")}`).join("||");
  useEffect(() => {
    setStepIdx(0);
    setAnswers([]);
    setDismissed(false);
  }, [groupsKey]);

  if (groups.length === 0 || isLoading || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const totalSteps = groups.length;
  const isLastStep = stepIdx >= totalSteps - 1;
  const currentGroup = groups[stepIdx];

  const submitAll = (finalAnswers: Array<{ q?: string; a: string }>) => {
    const combined = totalSteps === 1
      ? finalAnswers[0].a
      : finalAnswers
          .map((x, i) => (x.q ? `Q${i + 1} (${x.q}): ${x.a}` : `Q${i + 1}: ${x.a}`))
          .join("\n");
    onSelect(combined);
  };

  const handleAnswer = (answer: string) => {
    const next = [...answers, { q: currentGroup.title, a: answer }];
    if (isLastStep) {
      submitAll(next);
      return;
    }
    setAnswers(next);
    setStepIdx(stepIdx + 1);
  };

  return (
    <div className={cn("flex flex-col gap-2", variant === "overlay" ? "w-full" : "max-w-md")}>
      <div className="flex items-baseline gap-2 px-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
          {totalSteps > 1 ? `Question ${stepIdx + 1} of ${totalSteps}` : "Question"}
        </p>
        {currentGroup.title && (
          <p className="text-[11px] text-muted-foreground/80 truncate">— {currentGroup.title}</p>
        )}
      </div>
      <SuggestionCard
        group={currentGroup}
        onDismiss={handleDismiss}
        onAnswer={handleAnswer}
        isLast={isLastStep}
        totalSteps={totalSteps}
      />
    </div>
  );
}

function SuggestionCard({
  group,
  onAnswer,
  onDismiss,
  isLast,
  totalSteps,
}: {
  group: SuggestionGroup;
  onAnswer: (answer: string) => void;
  onDismiss?: () => void;
  isLast: boolean;
  totalSteps: number;
}) {
  const CUSTOM_LIKE_REGEX = /\b(custom|something\s+else|other|else\b|own\s+(?:answer|workflow|idea)|write\s+my\s+own|type\s+(?:my|your)\s+own)\b/i;
  const filteredSuggestions = group.suggestions.filter((s) => {
    const { label } = splitEmoji(s);
    return !CUSTOM_LIKE_REGEX.test(label.trim());
  });
  const visibleSuggestions = filteredSuggestions.slice(0, 4);
  const headerTitle = group.title?.trim();
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCustomMode(false);
    setCustomText("");
  }, [headerTitle, group.suggestions.join(",")]);

  useEffect(() => {
    if (customMode) inputRef.current?.focus();
  }, [customMode]);

  const submitCustom = () => {
    const v = customText.trim();
    if (!v) return;
    onAnswer(v);
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] overflow-hidden">
      {headerTitle ? (
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 gap-3">
          <p className="text-sm font-medium text-foreground truncate">{headerTitle}</p>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-0.5 rounded hover:bg-muted transition-colors text-muted-foreground shrink-0"
              aria-label="Dismiss questions"
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
              aria-label="Dismiss questions"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      )}

      <div className="flex flex-col">
        {visibleSuggestions.map((suggestion, idx) => {
          const { emoji, label } = splitEmoji(suggestion);
          return (
            <button
              key={idx}
              onClick={() => onAnswer(label)}
              className={cn(
                "group flex items-center gap-3 text-left px-4 py-3 transition-colors border-b border-border/40",
                "hover:bg-accent",
                idx === 0 && "bg-accent/60",
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-xs font-medium text-muted-foreground">
                {idx + 1}
              </div>
              {emoji && <span className="text-base shrink-0">{emoji}</span>}
              <span className="text-sm text-foreground/90 leading-relaxed flex-1">{label}</span>
              {!isLast && (
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          );
        })}

        {/* Always-present "Something else" option with inline input */}
        {!customMode ? (
          <button
            onClick={() => setCustomMode(true)}
            className="group flex items-center gap-3 text-left px-4 py-3 transition-colors hover:bg-accent"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/70 text-muted-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm text-foreground/90 leading-relaxed flex-1">
              Something else — type your answer
            </span>
          </button>
        ) : (
          <div className="flex flex-col gap-2 px-4 py-3 bg-muted/30">
            <textarea
              ref={inputRef}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitCustom();
                }
              }}
              placeholder="Type your answer…"
              rows={2}
              className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setCustomMode(false);
                  setCustomText("");
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={submitCustom}
                disabled={!customText.trim()}
                className="inline-flex items-center gap-1.5 rounded-md bg-foreground text-background text-xs font-medium px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
              >
                {isLast || totalSteps === 1 ? "Send" : "Next"}
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
