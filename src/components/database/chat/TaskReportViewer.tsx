import { useEffect, useRef, useState } from "react";
import { ChevronRight, Download, FileText, Loader2, X, Check } from "lucide-react";
import { marked } from "marked";
import TurndownService from "turndown";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/** Pull a sensible default title from the markdown body (first heading or first sentence). */
function deriveTitleFromContent(md: string): string {
  if (!md) return "";
  const headingMatch = md.match(/^\s*#{1,3}\s+(.+?)\s*$/m);
  if (headingMatch) return headingMatch[1].replace(/[*_`]/g, "").slice(0, 80).trim();
  const firstLine = md.split(/\n+/).find((l) => l.trim().length > 0) || "";
  return firstLine.replace(/[#*_`>]+/g, "").slice(0, 80).trim();
}

const turndown = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});

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
  const [docName, setDocName] = useState(deriveTitleFromContent(content) || dialogTitle || "Untitled document");
  const [editingName, setEditingName] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const currentMdRef = useRef<string>(content);

  // Lock background scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Initialize the editor's HTML once when opened (don't re-render via React on every keystroke)
  useEffect(() => {
    if (!open || !editorRef.current) return;
    const html = marked.parse(content || "", { async: false }) as string;
    editorRef.current.innerHTML = html;
    currentMdRef.current = content;
  }, [open, content]);

  const syncFromEditor = (): string => {
    if (!editorRef.current) return currentMdRef.current;
    const html = editorRef.current.innerHTML;
    const md = turndown.turndown(html);
    currentMdRef.current = md;
    return md;
  };

  const handleDownload = () => {
    const md = syncFromEditor();
    const blob = new Blob([md], { type: "text/markdown" });
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
      const latest = syncFromEditor();
      await onSaveToDb(latest);
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
        {saved && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 p-4"
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
              {saved && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>}
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
              <div className="px-10 py-8 max-w-3xl mx-auto">
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => syncFromEditor()}
                  className={cn(
                    "doc-editor outline-none text-foreground text-[15px] leading-[1.8] min-h-[50vh]",
                    "[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-6 [&_h1]:mb-3",
                    "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2.5",
                    "[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2",
                    "[&_p]:my-2 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-1",
                    "[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
                    "[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground",
                    "[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-[13px]",
                    "[&_a]:text-primary [&_a]:underline",
                    "[&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:bg-muted/40 [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
