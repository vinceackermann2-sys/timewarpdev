import { ReactNode, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Maximize2, Send, Loader2, Pencil, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface GraphicEditorDialogProps {
  title: string;
  description?: string;
  value: string;
  onApply: (value: string) => void;
  renderPreview?: (value: string) => ReactNode;
}

export function GraphicEditorDialog({
  title,
  description,
  value,
  onApply,
  renderPreview,
}: GraphicEditorDialogProps) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [chatInput, setChatInput] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraftValue(value);
      setChatHistory([]);
    }
  }, [open, value]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const parsedConfig = useMemo(() => {
    try { return JSON.parse(draftValue); } catch { return null; }
  }, [draftValue]);

  // Direct text field editing
  const updateField = useCallback((path: string, newValue: string) => {
    try {
      const obj = JSON.parse(draftValue);
      const keys = path.split(".");
      let target = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        const idx = parseInt(key);
        target = isNaN(idx) ? target[key] : target[idx];
      }
      const lastKey = keys[keys.length - 1];
      const lastIdx = parseInt(lastKey);
      if (isNaN(lastIdx)) {
        target[lastKey] = newValue;
      } else {
        target[lastIdx] = newValue;
      }
      setDraftValue(JSON.stringify(obj, null, 2));
    } catch {}
  }, [draftValue]);

  // AI refinement via chat
  const handleAiRefine = async () => {
    if (!chatInput.trim() || isRefining) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatHistory(prev => [...prev, { role: "user", content: userMsg }]);
    setIsRefining(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/action-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session?.access_token ? { "Authorization": `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `You are a graphic editor assistant. The user has a graphic defined as JSON. When they ask for changes, return ONLY the updated JSON — no explanation, no markdown fences, just valid JSON. Here is the current JSON:\n\n${draftValue}`
            },
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg }
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.content || data.choices?.[0]?.message?.content || "";
        // Try to extract JSON from reply
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[0]);
            setDraftValue(jsonMatch[0]);
            setChatHistory(prev => [...prev, { role: "assistant", content: "✅ Updated the graphic with your changes." }]);
          } catch {
            setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
          }
        } else {
          setChatHistory(prev => [...prev, { role: "assistant", content: reply }]);
        }
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "Sorry, I couldn't process that request." }]);
      }
    } catch {
      setChatHistory(prev => [...prev, { role: "assistant", content: "Something went wrong. Please try again." }]);
    } finally {
      setIsRefining(false);
    }
  };

  const handleApply = () => {
    onApply(draftValue);
    setOpen(false);
  };

  // Build editable fields from parsed config
  const renderEditableFields = () => {
    if (!parsedConfig) return <p className="text-sm text-muted-foreground">Unable to parse graphic data.</p>;

    const fields: { label: string; path: string; value: string; multiline?: boolean }[] = [];

    // Title
    if (parsedConfig.title) fields.push({ label: "Title", path: "title", value: parsedConfig.title });
    if (parsedConfig.subtitle) fields.push({ label: "Subtitle", path: "subtitle", value: parsedConfig.subtitle });
    if (parsedConfig.author) fields.push({ label: "Author", path: "author", value: parsedConfig.author });
    if (parsedConfig.date) fields.push({ label: "Date", path: "date", value: parsedConfig.date });
    if (parsedConfig.takeaway) fields.push({ label: "Key Takeaway", path: "takeaway", value: parsedConfig.takeaway, multiline: true });

    // Sections (documents)
    if (Array.isArray(parsedConfig.sections)) {
      parsedConfig.sections.forEach((sec: any, i: number) => {
        if (sec.heading) fields.push({ label: `Section ${i + 1} Heading`, path: `sections.${i}.heading`, value: sec.heading });
        if (sec.content) fields.push({ label: `Section ${i + 1} Content`, path: `sections.${i}.content`, value: sec.content, multiline: true });
      });
    }

    // Bullets
    if (Array.isArray(parsedConfig.bullets)) {
      parsedConfig.bullets.forEach((b: string, i: number) => {
        fields.push({ label: `Bullet ${i + 1}`, path: `bullets.${i}`, value: b });
      });
    }

    // Stats
    if (Array.isArray(parsedConfig.stats)) {
      parsedConfig.stats.forEach((s: any, i: number) => {
        fields.push({ label: `Stat ${i + 1} Value`, path: `stats.${i}.value`, value: s.value });
        fields.push({ label: `Stat ${i + 1} Label`, path: `stats.${i}.label`, value: s.label });
      });
    }

    // Metrics (analytics)
    if (Array.isArray(parsedConfig.metrics)) {
      parsedConfig.metrics.forEach((m: any, i: number) => {
        fields.push({ label: `Metric ${i + 1} Label`, path: `metrics.${i}.label`, value: m.label });
        fields.push({ label: `Metric ${i + 1} Value`, path: `metrics.${i}.value`, value: m.value });
      });
    }

    // Insights
    if (Array.isArray(parsedConfig.insights)) {
      parsedConfig.insights.forEach((ins: string, i: number) => {
        fields.push({ label: `Insight ${i + 1}`, path: `insights.${i}`, value: ins, multiline: true });
      });
    }

    // Headers (spreadsheet)
    if (Array.isArray(parsedConfig.headers)) {
      parsedConfig.headers.forEach((h: string, i: number) => {
        fields.push({ label: `Header ${i + 1}`, path: `headers.${i}`, value: h });
      });
    }

    return (
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.path}>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={f.value}
                onChange={(e) => updateField(f.path, e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none focus:border-ring resize-none min-h-[60px]"
                rows={3}
              />
            ) : (
              <input
                type="text"
                value={f.value}
                onChange={(e) => updateField(f.path, e.target.value)}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-7 w-7 rounded-md text-primary hover:bg-primary/10 hover:text-primary"
        title="Open and edit"
        onClick={() => setOpen(true)}
      >
        <Maximize2 className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl border-border bg-background p-0 sm:rounded-2xl">
          <div className="flex max-h-[85vh] flex-col overflow-hidden">
            <DialogHeader className="border-b border-border px-6 py-4">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                {description || "Edit the graphic fields directly or use the AI chat to refine it."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
              {/* Left panel: Editable fields + AI chat */}
              <div className="flex flex-col border-b border-border lg:border-b-0 lg:border-r overflow-hidden">
                {/* Editable fields */}
                <div className="flex-1 overflow-y-auto p-4 min-h-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Pencil className="w-3.5 h-3.5 text-primary" />
                    <h4 className="text-sm font-medium text-foreground">Edit Fields</h4>
                  </div>
                  {renderEditableFields()}
                </div>

                {/* AI chat section */}
                <div className="border-t border-border bg-muted/20">
                  {chatHistory.length > 0 && (
                    <div className="max-h-[120px] overflow-y-auto px-4 py-2 space-y-2">
                      {chatHistory.map((msg, i) => (
                        <div key={i} className={cn("text-xs px-2.5 py-1.5 rounded-lg max-w-[90%]",
                          msg.role === "user"
                            ? "bg-primary/10 text-foreground ml-auto"
                            : "bg-muted text-foreground"
                        )}>
                          {msg.content}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                  <div className="p-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAiRefine()}
                      placeholder="Ask AI to refine this graphic…"
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                      disabled={isRefining}
                    />
                    <button
                      onClick={handleAiRefine}
                      disabled={isRefining || !chatInput.trim()}
                      className="p-1.5 rounded-lg hover:bg-primary/10 transition-colors disabled:opacity-40"
                    >
                      {isRefining ? <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" /> : <Send className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  </div>
                </div>

                {/* Apply button */}
                <div className="p-3 border-t border-border flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="button" size="sm" onClick={handleApply}>Apply changes</Button>
                </div>
              </div>

              {/* Right panel: Preview */}
              <div className="min-h-0 overflow-auto bg-muted/20 p-4">
                <div className="mb-3 text-sm font-medium text-foreground">Preview</div>
                {renderPreview ? renderPreview(draftValue) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
