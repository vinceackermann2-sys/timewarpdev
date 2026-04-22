import React, { useState } from "react";
import { ThumbsDown, ThumbsUp, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Sentiment = "helpful" | "not_helpful";

export function AssistantInsightFeedback(props: {
  businessId: string;
  workspaceId?: string | null;
  assistantExcerpt: string;
  userContextSnippet?: string;
  recorded?: Sentiment;
  onRecorded: (sentiment: Sentiment) => void;
}) {
  const { businessId, workspaceId, assistantExcerpt, userContextSnippet, recorded, onRecorded } = props;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<Sentiment | null>(null);

  if (recorded) {
    return (
      <p className="mt-3 text-[11px] text-muted-foreground">
        You marked this reply as {recorded === "helpful" ? "helpful" : "not quite aligned"} — thanks, that improves future answers.
      </p>
    );
  }

  const submit = async (sentiment: Sentiment) => {
    setBusy(sentiment);
    try {
      const { data, error } = await supabase.functions.invoke("assistant-insight-feedback", {
        body: {
          businessId,
          workspaceId: workspaceId ?? null,
          sentiment,
          note: note.trim() || null,
          assistantExcerpt: assistantExcerpt.slice(0, 1200),
          userContextSnippet: userContextSnippet?.slice(0, 500) ?? null,
        },
      });
      if (error) throw new Error(error.message);
      if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
        throw new Error((data as { error: string }).error);
      }
      onRecorded(sentiment);
      toast.success("Feedback saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save feedback");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-4 pt-3 border-t border-border/40">
      <p className="text-[11px] font-medium text-muted-foreground mb-2">Was this reply useful?</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void submit("helpful")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors",
            busy && "opacity-60 pointer-events-none",
          )}
        >
          {busy === "helpful" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
          Helpful
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void submit("not_helpful")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors",
            busy && "opacity-60 pointer-events-none",
          )}
        >
          {busy === "not_helpful" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
          Not quite
        </button>
      </div>
      <label className="mt-2 block">
        <span className="sr-only">Optional note</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Optional note (sent with your next rating)"
          className="mt-1 w-full resize-none rounded-lg border border-border/60 bg-background px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary/30"
        />
      </label>
    </div>
  );
}
