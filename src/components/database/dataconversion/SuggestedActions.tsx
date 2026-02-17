import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedActionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
}

export function SuggestedActions({ suggestions, onSelect, isLoading }: SuggestedActionsProps) {
  if (!suggestions.length || isLoading) return null;

  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <MessageSquareText className="h-3 w-3" />
        <span>Recommended next steps</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            className={cn(
              "text-left text-xs px-3 py-2 rounded-lg",
              "bg-muted/50 hover:bg-primary/10 border border-transparent hover:border-primary/30",
              "transition-all duration-200 cursor-pointer",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
