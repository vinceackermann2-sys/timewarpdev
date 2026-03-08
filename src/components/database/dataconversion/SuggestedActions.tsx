import { useState } from "react";
import { MessageSquareText, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SuggestedActionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  isLoading?: boolean;
  fullContent?: string;
}

export function SuggestedActions({ suggestions, onSelect, isLoading, fullContent }: SuggestedActionsProps) {
  const [copied, setCopied] = useState(false);

  if (!suggestions.length || isLoading) return null;

  const handleCopy = () => {
    if (!fullContent) return;
    navigator.clipboard.writeText(fullContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

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
              "bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
              "transition-all duration-200 cursor-pointer",
              "text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageSquareText className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
            <span className="line-clamp-1">{suggestion}</span>
          </button>
        ))}
      </div>
      {fullContent && (
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-md mt-1",
            "bg-muted/40 hover:bg-muted border border-transparent hover:border-border",
            "transition-all duration-200 cursor-pointer",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          {copied ? <Check className="h-3 w-3 flex-shrink-0" /> : <Copy className="h-3 w-3 flex-shrink-0" />}
          <span>{copied ? "Copied!" : "Copy response"}</span>
        </button>
      )}
    </div>
  );
}