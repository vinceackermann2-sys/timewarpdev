import { useState } from "react";
import { ChevronRight, Download, FileText, Loader2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  const [editContent, setEditContent] = useState(content);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!savedToDb);

  const handleDownload = () => {
    const blob = new Blob([editContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task-results.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (!onSaveToDb) return;
    setSaving(true);
    try {
      await onSaveToDb(editContent);
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
        className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all text-sm font-medium text-foreground group"
      >
        <FileText className="w-4 h-4 text-primary" />
        {triggerLabel || "View Task Results"}
        {saved && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>}
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto group-hover:translate-x-0.5 transition-transform" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground flex-1">{dialogTitle || "Task Results"}</span>
              {saved && <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">Saved</span>}
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-lg transition-colors",
                  isEditing ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
                )}
              >
                {isEditing ? "Preview" : "Edit"}
              </button>
              {onSaveToDb && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                  Save
                </button>
              )}
              <button
                onClick={handleDownload}
                className="text-xs px-2.5 py-1 rounded-lg hover:bg-muted text-muted-foreground flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[400px] p-5 bg-transparent text-sm text-foreground font-mono resize-none focus:outline-none border-none"
                  spellCheck={false}
                />
              ) : (
                <div className="p-6 max-w-none text-foreground text-[14.5px] leading-[1.75]">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-xl font-bold text-foreground mt-6 mb-3 pb-2 border-b border-border/40">{children}</h1>
                      ),
                      h2: ({ children }) => <h2 className="text-lg font-semibold text-foreground mt-6 mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-5 mb-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>,
                      ul: ({ children }) => <ul className="my-4 pl-6 space-y-2 list-disc marker:text-foreground/40">{children}</ul>,
                      ol: ({ children }) => <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-foreground/40">{children}</ol>,
                      li: ({ children }) => <li className="leading-[1.7] text-foreground/90 pl-1">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                      blockquote: ({ children }) => (
                        <blockquote className="my-4 pl-4 border-l-2 border-primary/30 text-foreground/70 italic">{children}</blockquote>
                      ),
                      hr: () => <hr className="my-6 border-border/50" />,
                      code: ({ children, className: cName }) => {
                        const isBlock = cName?.includes("language-");
                        return isBlock ? (
                          <code className={cn("block", cName)}>{children}</code>
                        ) : (
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground/80">{children}</code>
                        );
                      },
                      pre: ({ children }) => <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-[13px]">{children}</pre>,
                      table: ({ children }) => (
                        <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
                          <table className="w-full text-sm">{children}</table>
                        </div>
                      ),
                      thead: ({ children }) => <thead className="bg-muted/50 border-b border-border/50">{children}</thead>,
                      th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px]">{children}</th>,
                      td: ({ children }) => <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80">{children}</td>,
                      a: ({ children, href }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
                          {children}
                        </a>
                      ),
                    }}
                  >
                    {editContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
