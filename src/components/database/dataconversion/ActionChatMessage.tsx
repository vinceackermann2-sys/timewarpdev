import { useState } from "react";
import { ExternalLink, FileText, Mail, Calendar, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight, Table2, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { Brain } from "lucide-react";

export interface ActionStep {
  icon: string;
  label: string;
  status: "pending" | "running" | "complete" | "error";
}

export interface DocumentLink {
  type: "doc" | "email" | "calendar" | "sheet";
  title: string;
  url: string;
  previewText?: string;
}

export interface ActionChatMessageProps {
  role: "user" | "assistant";
  content: string;
  steps?: ActionStep[];
  documentLinks?: DocumentLink[];
  isStreaming?: boolean;
}

export function ActionChatMessage({ role, content, steps, documentLinks, isStreaming }: ActionChatMessageProps) {
  const [copied, setCopied] = useState(false);

  if (role === "user") {
    return (
      <div className="bg-muted text-foreground ml-8 w-fit max-w-[75%] rounded-xl px-4 py-2.5 text-sm shadow-sm">
        {content}
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // formatContent no longer needed — using ReactMarkdown

  const getDocIcon = (type: DocumentLink["type"]) => {
    switch (type) {
      case "doc": return <FileText className="h-4 w-4 text-foreground" />;
      case "email": return <Mail className="h-4 w-4 text-foreground" />;
      case "calendar": return <Calendar className="h-4 w-4 text-foreground" />;
      case "sheet": return <Table2 className="h-4 w-4 text-foreground" />;
    }
  };

  const getDocLabel = (type: DocumentLink["type"]) => {
    switch (type) {
      case "doc": return "Docs";
      case "email": return "Gmail";
      case "calendar": return "Calendar";
      case "sheet": return "Sheets";
    }
  };

  const getStepIcon = (step: ActionStep) => {
    if (step.status === "running") {
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-foreground" />;
    }
    if (step.status === "complete") {
      return <CheckCircle2 className="h-3.5 w-3.5 text-foreground" />;
    }
    if (step.status === "error") {
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    }
    return <span className="text-sm">{step.icon}</span>;
  };

  return (
    <div className="mr-4 rounded-xl overflow-hidden text-sm group/msg relative">
      {/* Name label with icon */}
      <div className="px-2 pt-2 pb-0.5 flex items-center gap-2">
        <div className="h-8 w-8 flex-shrink-0 flex items-center justify-center">
          <Brain className={cn("h-5 w-5 text-foreground", isStreaming && "animate-pulse")} />
        </div>
        <span className={cn(
          "text-[10px] font-semibold text-primary/60 uppercase tracking-widest",
          isStreaming && !content && "shimmer-text"
        )}>TimeWarp AI</span>
      </div>
      {/* Copy button */}
      {content && !isStreaming && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground z-10"
          title="Copy response"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
      {/* Progress Steps */}
      {steps && steps.length > 0 && (
        <div className="px-4 py-3 border-b border-border/50 bg-card/50 space-y-2">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-center gap-2.5 text-xs transition-opacity",
                step.status === "pending" && "opacity-40"
              )}
            >
              <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center flex-shrink-0 shadow-sm">
                {getStepIcon(step)}
              </div>
              <span className={cn(
                "font-medium",
                step.status === "complete" && "text-primary",
                step.status === "running" && "text-foreground",
                step.status === "error" && "text-destructive",
                step.status === "pending" && "text-muted-foreground"
              )}>
                {step.label}
              </span>
              {step.status === "running" && (
                <span className="text-muted-foreground animate-pulse">...</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Content with Markdown */}
      {content && (
        <div className="px-2 py-3 leading-[1.8]">
          <div className="prose prose-sm prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-extrabold prose-headings:tracking-tight
            prose-p:text-foreground/80 prose-p:my-2.5 prose-p:text-[13.5px]
            prose-strong:text-foreground prose-strong:font-bold
            prose-ul:my-2 prose-ul:pl-0 prose-ul:list-none
            prose-li:text-foreground/80 prose-li:my-1.5 prose-li:text-[13.5px]
            [&_ul_li]:flex [&_ul_li]:items-start
          ">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-[15px] font-extrabold text-foreground mt-5 mb-2 pb-1.5 border-b border-primary/30 uppercase tracking-wide">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-[14px] font-extrabold text-foreground mt-4 mb-2 underline decoration-primary/40 decoration-2 underline-offset-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-[13px] font-bold text-foreground flex items-center gap-2 mt-3 mb-1.5">
                    <Sparkles className="h-3 w-3 text-primary flex-shrink-0" />
                    <span className="underline decoration-primary/30 decoration-1 underline-offset-3">{children}</span>
                  </h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-extrabold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="not-italic font-semibold text-primary underline decoration-primary/30 decoration-1 underline-offset-2">{children}</em>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2 text-foreground/80 my-1.5">
                    <span className="text-primary text-[10px] mt-[7px] flex-shrink-0">●</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                ul: ({ children }) => (
                  <ul className="my-2 space-y-0.5 list-none pl-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 space-y-0.5 list-decimal pl-5 marker:text-primary marker:font-extrabold">{children}</ol>
                ),
                p: ({ children }) => (
                  <p className="text-foreground/80 my-2.5 text-[13.5px]">{children}</p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-primary pl-4 my-3 py-1 text-foreground/70 italic text-[13px]">
                    {children}
                  </blockquote>
                ),
                hr: () => (
                  <hr className="my-4 border-border/40" />
                ),
                table: ({ children }) => (
                  <div className="my-3 w-full overflow-x-auto rounded-lg border border-border/50">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-primary/8">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border-b border-border/50 px-3 py-2 text-left font-extrabold text-foreground text-[11px] uppercase tracking-wider">{children}</th>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-border/20 last:border-0">{children}</tr>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2 text-foreground/70 text-xs">{children}</td>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <pre className="my-3 p-3 rounded-lg bg-muted/50 border border-border/30 overflow-x-auto">
                        <code className="text-xs text-foreground/90">{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono font-bold">{children}</code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />}
        </div>
      )}

      {/* Document Preview Links */}
      {documentLinks && documentLinks.length > 0 && (
        <div className="px-4 pb-4 pt-1 space-y-2">
          {documentLinks.map((doc, idx) => (
            <a
              key={idx}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent/10 hover:border-accent/50 transition-all group shadow-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                {getDocIcon(doc.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground truncate">{doc.title}</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                </div>
                {doc.previewText && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {doc.previewText}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1.5 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Open in Google {getDocLabel(doc.type)}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Loading state */}
      {!content && !steps?.length && isStreaming && (
        <div className="px-4 py-4 flex items-center gap-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-muted-foreground text-sm">Processing...</span>
        </div>
      )}
    </div>
  );
}
