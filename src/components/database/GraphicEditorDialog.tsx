import { ReactNode, useEffect, useState, useRef } from "react";
import { Maximize2, Loader2, ArrowUp, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
  const [isRefining, setIsRefining] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setDraftValue(value);
      setChatHistory([]);
    }
  }, [open, value]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // AI refinement
  const handleAiRefine = async () => {
    const userMsg = chatInputRef.current?.innerText?.trim() || "";
    if (!userMsg || isRefining) return;
    if (chatInputRef.current) chatInputRef.current.innerHTML = "";
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
              content: `You are a graphic editor assistant. The user has a graphic defined as JSON. When they ask for changes, return ONLY the updated JSON — no explanation, no markdown fences, just valid JSON.\n\nCurrent JSON:\n${draftValue}`
            },
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: userMsg }
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.content || data.choices?.[0]?.message?.content || "";
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            JSON.parse(jsonMatch[0]);
            setDraftValue(jsonMatch[0]);
            setChatHistory(prev => [...prev, { role: "assistant", content: "✅ Done — preview updated." }]);
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
        <DialogContent
          className="max-w-6xl w-[95vw] border border-border bg-background p-0 sm:rounded-2xl shadow-2xl overflow-hidden [&>button.absolute]:hidden"
        >
          <div className="flex h-[88vh] flex-col">
            {/* Header */}
            <DialogHeader className="flex-row items-center justify-between border-b border-border bg-card px-5 py-3 space-y-0">
              <DialogTitle className="text-sm font-semibold text-foreground tracking-tight">
                {title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleApply}
                  className="h-8 px-4 text-xs rounded-lg"
                >
                  Apply changes
                </Button>
              </div>
            </DialogHeader>

            <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
              {/* Left: AI Chat */}
              <div className="flex flex-col border-b border-border bg-card lg:border-b-0 lg:border-r overflow-hidden">
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#fcfcfd]">
                  {chatHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center mb-3 bg-[#dae0e7]/0">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <p className="text-[13px] font-medium text-foreground">Refine with AI</p>
                      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        Or click any text in the preview to edit directly.
                      </p>
                      <div className="mt-4 w-full space-y-1.5">
                        {[
                          "Make the title shorter",
                          "Add a bullet point",
                          "Make it more concise",
                        ].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              if (chatInputRef.current) {
                                chatInputRef.current.innerText = s;
                                handleAiRefine();
                              }
                            }}
                            className="w-full text-left text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/60 border border-border transition-colors"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-[13px] px-3.5 py-2.5 rounded-2xl max-w-[92%] leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      )}
                    >
                      {msg.content}
                    </div>
                  ))}
                  {isRefining && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Updating preview…
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat input bar */}
                <div className="p-3 border-t border-border bg-[#fcfcfd]">
                  <div className="flex items-end border border-border rounded-2xl p-1.5 focus-within:border-primary/40 transition-colors bg-white">
                    <div
                      ref={chatInputRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="flex-1 bg-transparent border-none outline-none text-foreground text-sm px-3 py-2 min-w-[80px] max-h-[120px] overflow-y-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/70 cursor-text"
                      data-placeholder="Ask AI to refine…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAiRefine();
                        }
                      }}
                    />
                    <button
                      onClick={handleAiRefine}
                      disabled={isRefining}
                      className="h-8 w-8 rounded-xl bg-primary text-primary-foreground transition-all active:scale-95 flex items-center justify-center hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {isRefining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Live editable preview */}
              <div className="min-h-0 overflow-auto bg-muted/30 p-8">
                <div className="mx-auto max-w-3xl">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                    Live preview · click any text to edit
                  </p>
                  <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
                    <EditablePreview value={draftValue} onChange={setDraftValue} renderPreview={renderPreview} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ── Editable preview wrapper ── */
function EditablePreview({ value, onChange, renderPreview }: {
  value: string;
  onChange: (v: string) => void;
  renderPreview?: (v: string) => ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Make text elements editable on click, sync back to JSON on blur
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const makeEditable = (el: HTMLElement) => {
      // Skip buttons, icons, svgs
      if (el.closest("button") || el.closest("svg") || el.tagName === "BUTTON") return;
      
      const isTextEl = ["H1","H2","H3","H4","H5","H6","P","SPAN","LI","TD","TH"].includes(el.tagName);
      if (!isTextEl) return;
      if (el.children.length > 0 && el.querySelector("svg, button, img")) return;
      
      el.style.cursor = "text";
      el.setAttribute("contenteditable", "true");
      el.style.outline = "none";
      el.classList.add("hover:ring-1", "hover:ring-primary/30", "focus:ring-1", "focus:ring-primary/60", "focus:bg-primary/5", "rounded-md", "px-1", "-mx-1", "transition-all");
    };

    // Walk all text elements
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
    let node: Node | null = walker.currentNode;
    while (node) {
      if (node instanceof HTMLElement) makeEditable(node);
      node = walker.nextNode();
    }

    // On blur, reconstruct JSON from the DOM
    const handleBlur = () => {
      // Re-read all text from the preview and attempt to sync back to JSON
      try {
        const parsed = JSON.parse(value);
        syncDomToJson(container, parsed);
        onChange(JSON.stringify(parsed, null, 2));
      } catch {}
    };

    container.addEventListener("blur", handleBlur, true);
    return () => container.removeEventListener("blur", handleBlur, true);
  }, [value, onChange]);

  return (
    <div ref={containerRef}>
      {renderPreview ? renderPreview(value) : null}
    </div>
  );
}

/* Sync edited DOM text back into the JSON config */
function syncDomToJson(container: HTMLElement, config: any) {
  // Title
  const titleEl = container.querySelector("h3, h2, [class*='font-bold']:first-child");
  if (titleEl && titleEl.textContent && config.title !== undefined) {
    config.title = titleEl.textContent.trim();
  }

  // Subtitle
  if (config.subtitle !== undefined) {
    const subtitleEl = container.querySelector("[class*='text-white/60'], [class*='text-muted']");
    if (subtitleEl && subtitleEl.textContent) {
      config.subtitle = subtitleEl.textContent.trim();
    }
  }

  // Bullets
  if (Array.isArray(config.bullets)) {
    const listItems = container.querySelectorAll("li");
    listItems.forEach((li, i) => {
      if (i < config.bullets.length && li.textContent) {
        config.bullets[i] = li.textContent.trim();
      }
    });
  }

  // Sections (documents)
  if (Array.isArray(config.sections)) {
    const headings = container.querySelectorAll("h4");
    const paragraphs = container.querySelectorAll("p[class*='leading-relaxed'], p[class*='whitespace-pre']");
    headings.forEach((h, i) => {
      if (i < config.sections.length && h.textContent) {
        config.sections[i].heading = h.textContent.trim();
      }
    });
    paragraphs.forEach((p, i) => {
      if (i < config.sections.length && p.textContent) {
        config.sections[i].content = p.textContent.trim();
      }
    });
  }

  // Stats
  if (Array.isArray(config.stats)) {
    const statEls = container.querySelectorAll("[class*='text-2xl'], [class*='text-center'] p");
    let statIdx = 0;
    statEls.forEach((el) => {
      if (el.classList.contains("text-2xl") || (el as HTMLElement).style.color) {
        if (statIdx < config.stats.length && el.textContent) {
          config.stats[statIdx].value = el.textContent.trim();
        }
      } else if (el.classList.contains("text-xs")) {
        if (statIdx < config.stats.length && el.textContent) {
          config.stats[statIdx].label = el.textContent.trim();
          statIdx++;
        }
      }
    });
  }

  // Metrics (analytics)
  if (Array.isArray(config.metrics)) {
    const metricLabels = container.querySelectorAll("[class*='uppercase']");
    const metricValues = container.querySelectorAll("[class*='text-lg']");
    metricLabels.forEach((el, i) => {
      if (i < config.metrics.length && el.textContent) {
        config.metrics[i].label = el.textContent.trim();
      }
    });
    metricValues.forEach((el, i) => {
      if (i < config.metrics.length && el.textContent) {
        config.metrics[i].value = el.textContent.trim();
      }
    });
  }

  // Takeaway
  if (config.takeaway !== undefined) {
    const takeawayEl = container.querySelector("[class*='border-t'] p[class*='font-medium'], [class*='border-t'] p:last-child");
    if (takeawayEl && takeawayEl.textContent) {
      config.takeaway = takeawayEl.textContent.trim();
    }
  }
}
