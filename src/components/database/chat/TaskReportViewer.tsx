import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Download, FileText, Loader2, X, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  InlineDocument,
  InlineSpreadsheet,
  InlineSlide,
} from "@/components/database/InlineChatGraphics";
import { InlineChatAnalytics } from "@/components/database/InlineChatAnalytics";

/** Pull a sensible default title from the markdown body (first heading or first sentence). */
function deriveTitleFromContent(md: string): string {
  if (!md) return "";
  const headingMatch = md.match(/^\s*#{1,3}\s+(.+?)\s*$/m);
  if (headingMatch) return headingMatch[1].replace(/[*_`]/g, "").slice(0, 80).trim();
  const firstLine = md.split(/\n+/).find((l) => l.trim().length > 0) || "";
  return firstLine.replace(/[#*_`>]+/g, "").slice(0, 80).trim();
}

/** Render a Mermaid source string into an inline SVG. */
function MermaidBlock({ source }: { source: string }) {
  const [svg, setSvg] = useState<string>("");
  const [err, setErr] = useState<string>("");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
          fontFamily: "inherit",
        });
        const id = `tr-m${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, source.trim());
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Diagram error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source]);
  if (err) return <div className="text-xs text-muted-foreground italic">Diagram could not render.</div>;
  if (!svg) return <div className="text-xs text-muted-foreground">Rendering diagram…</div>;
  return (
    <div
      className="my-4 flex justify-center [&_svg]:max-w-full [&_svg]:h-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Detect what kind of inline graphic a JSON code block represents. */
function inferGraphicKindFromJson(
  text: string,
): "chart" | "analytics" | "document" | "spreadsheet" | "slide" | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (typeof rec.type === "string" && Array.isArray(rec.data)) return "chart";
    if (Array.isArray(rec.metrics) || Array.isArray(rec.insights)) return "analytics";
    if (Array.isArray(rec.sections)) return "document";
    if (Array.isArray(rec.headers) && Array.isArray(rec.rows)) return "spreadsheet";
    if (
      typeof rec.layout === "string" ||
      Array.isArray(rec.bullets) ||
      Array.isArray(rec.stats) ||
      Array.isArray(rec.left_column) ||
      Array.isArray(rec.right_column)
    )
      return "slide";
    return null;
  } catch {
    return null;
  }
}

/** Markdown components map for the report body — renders mermaid + inline graphics. */
function buildReportMarkdownComponents() {
  return {
    h1: ({ children }: any) => (
      <h1 className="text-2xl font-semibold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-xl font-semibold text-foreground mt-5 mb-2.5 first:mt-0">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h3>
    ),
    p: ({ children }: any) => <p className="my-3 leading-[1.8] text-foreground/90">{children}</p>,
    ul: ({ children }: any) => (
      <ul className="my-3 pl-6 space-y-1.5 list-disc marker:text-foreground/30">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="my-3 pl-6 space-y-1.5 list-decimal marker:text-foreground/30">{children}</ol>
    ),
    li: ({ children }: any) => <li className="leading-[1.8] text-foreground/90 pl-1">{children}</li>,
    strong: ({ children }: any) => <strong className="font-semibold text-foreground">{children}</strong>,
    blockquote: ({ children }: any) => (
      <blockquote className="my-4 pl-4 border-l-2 border-primary/40 text-foreground/70 italic">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="my-6 border-border/50" />,
    a: ({ children, href }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {children}
      </a>
    ),
    table: ({ children }: any) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-muted/50 border-b border-border/50">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px]">{children}</th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80">{children}</td>
    ),
    code: ({ children, className }: any) => {
      const text = String(children).replace(/\n$/, "");
      // Render mermaid diagrams
      if (className?.includes("language-mermaid")) {
        return <MermaidBlock source={text} />;
      }
      // Inline graphics (typed fences)
      if (className?.includes("language-chart") || className?.includes("language-graph")) {
        return <InlineChatAnalytics jsonString={text} />;
      }
      if (className?.includes("language-analytics")) {
        return <InlineChatAnalytics jsonString={text} />;
      }
      if (className?.includes("language-document")) {
        return <InlineDocument jsonString={text} editorEnabled={false} />;
      }
      if (className?.includes("language-spreadsheet")) {
        return <InlineSpreadsheet jsonString={text} editorEnabled={false} />;
      }
      if (className?.includes("language-slide")) {
        return <InlineSlide jsonString={text} editorEnabled={false} />;
      }
      // Inferred JSON graphics
      if (className?.includes("language-json")) {
        const kind = inferGraphicKindFromJson(text);
        if (kind === "chart" || kind === "analytics") return <InlineChatAnalytics jsonString={text} />;
        if (kind === "document") return <InlineDocument jsonString={text} editorEnabled={false} />;
        if (kind === "spreadsheet") return <InlineSpreadsheet jsonString={text} editorEnabled={false} />;
        if (kind === "slide") return <InlineSlide jsonString={text} editorEnabled={false} />;
      }
      const isBlock = className?.includes("language-");
      return isBlock ? (
        <code className={cn("block", className)}>{children}</code>
      ) : (
        <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground/80">
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => {
      const child = children as { props?: { className?: string } };
      const cls = child?.props?.className || "";
      // Strip the <pre> wrapper for any block we render as a custom component
      if (
        cls.includes("language-mermaid") ||
        cls.includes("language-chart") ||
        cls.includes("language-graph") ||
        cls.includes("language-analytics") ||
        cls.includes("language-document") ||
        cls.includes("language-spreadsheet") ||
        cls.includes("language-slide") ||
        cls.includes("language-json")
      ) {
        return <>{children}</>;
      }
      return (
        <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-[13px]">{children}</pre>
      );
    },
  };
}

export function TaskReportViewer({
  content,
  onSaveToDb,
  savedToDb,
  triggerLabel,
  dialogTitle,
  onOpened,
}: {
  content: string;
  onSaveToDb?: (updatedContent: string) => Promise<void>;
  savedToDb?: boolean;
  triggerLabel?: string;
  dialogTitle?: string;
  onOpened?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!savedToDb);
  const [docName, setDocName] = useState(
    deriveTitleFromContent(content) || dialogTitle || "Untitled document",
  );
  const [editingName, setEditingName] = useState(false);
  const components = useMemo(() => buildReportMarkdownComponents() as any, []);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (docName || "document").replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
    a.download = `${safeName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  };

  const handleSave = async () => {
    if (!onSaveToDb) return;
    setSaving(true);
    try {
      await onSaveToDb(content);
      setSaved(true);
      toast.success("Document saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          onOpened?.();
        }}
        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all text-sm font-medium text-foreground group"
      >
        <FileText className="w-4 h-4 text-primary" />
        <span className="truncate max-w-[260px]">{docName || triggerLabel || "Open document"}</span>
        {saved && (
          <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-4"
            onClick={() => setOpen(false)}
          >
            <div
              className="bg-card border border-border/60 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                {editingName ? (
                  <input
                    autoFocus
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        setEditingName(false);
                      }
                    }}
                    className="flex-1 text-sm font-semibold text-foreground bg-transparent border-b border-border focus:outline-none focus:border-primary"
                  />
                ) : (
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-sm font-semibold text-foreground flex-1 text-left truncate hover:text-primary transition-colors"
                    title="Click to rename"
                  >
                    {docName || "Untitled document"}
                  </button>
                )}
                {saved && (
                  <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                    Saved
                  </span>
                )}
                {onSaveToDb && (
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="text-xs px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5 transition-opacity disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="text-xs px-3 py-1.5 rounded-xl hover:bg-muted text-muted-foreground flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Download
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-background/40">
                <div className="px-10 py-8 max-w-3xl mx-auto text-foreground text-[15px] leading-[1.8]">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
                    {content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
