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
    <div className="px-3 pb-3 space-y-1.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Next steps</span>
      <div className="flex flex-col gap-1">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            className={cn(
              "flex items-center gap-1.5 text-left text-xs px-2 py-1.5 rounded-md",
              "bg-muted/40 hover:bg-primary/10 border border-transparent hover:border-primary/30",
              "transition-all duration-200 cursor-pointer",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquareText className="h-3 w-3 flex-shrink-0 text-primary/60" />
            <span className="line-clamp-1">{suggestion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
