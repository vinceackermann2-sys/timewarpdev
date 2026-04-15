import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssistantSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
}

export function AssistantSuggestions({ suggestions, onSelect, isLoading }: AssistantSuggestionsProps) {
  if (!suggestions.length || isLoading) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(suggestion)}
          className={cn(
            "group flex items-start gap-2.5 text-left px-4 py-3 rounded-xl",
            "bg-card/60 hover:bg-card border border-border/50 hover:border-primary/30",
            "transition-all duration-200 cursor-pointer",
            "shadow-sm hover:shadow-md",
            "max-w-md"
          )}
        >
          <MessageSquare className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary/60 group-hover:text-primary transition-colors" />
          <span className="text-sm text-foreground/80 group-hover:text-foreground leading-relaxed transition-colors">
            {suggestion}
          </span>
        </button>
      ))}
    </div>
  );
}
