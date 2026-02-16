import { ExternalLink, FileText, Mail, Calendar, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
  if (role === "user") {
    return (
      <div className="bg-accent text-accent-foreground ml-8 rounded-xl px-4 py-2.5 text-sm shadow-sm">
        {content}
      </div>
    );
  }

  // formatContent no longer needed — using ReactMarkdown

  const getDocIcon = (type: DocumentLink["type"]) => {
    switch (type) {
      case "doc": return <FileText className="h-4 w-4 text-primary" />;
      case "email": return <Mail className="h-4 w-4 text-primary" />;
      case "calendar": return <Calendar className="h-4 w-4 text-primary" />;
      case "sheet": return <Table2 className="h-4 w-4 text-primary" />;
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
      return <CheckCircle2 className="h-3.5 w-3.5 text-primary" />;
    }
    if (step.status === "error") {
      return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
    }
    return <span className="text-sm">{step.icon}</span>;
  };

  return (
    <div className="bg-muted mr-4 rounded-xl overflow-hidden text-sm shadow-sm border border-border/30">
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
        <div className="px-5 py-4 leading-[1.75]">
          <div className="prose prose-sm prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-base prose-h1:mt-5 prose-h1:mb-3
            prose-h2:text-[15px] prose-h2:mt-4 prose-h2:mb-2
            prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1.5
            prose-p:text-muted-foreground prose-p:my-2 prose-p:text-[13px]
            prose-strong:text-foreground prose-strong:font-bold
            prose-ul:my-2 prose-ul:pl-0 prose-ul:list-none
            prose-li:text-muted-foreground prose-li:my-1 prose-li:text-[13px]
            [&_ul_li]:flex [&_ul_li]:items-start
          ">
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-base font-bold text-foreground mt-5 mb-3 pb-2 border-b-2 border-accent/40">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-[15px] font-bold text-foreground mt-4 mb-2 flex items-center gap-2">
                    <span className="inline-block w-1 h-4 rounded-full bg-accent" />
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mt-3 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-accent-foreground flex-shrink-0" />
                    {children}
                  </h3>
                ),
                strong: ({ children }) => (
                  <strong className="font-bold text-foreground">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="text-primary/80 not-italic font-medium">{children}</em>
                ),
                li: ({ children }) => (
                  <li className="flex items-start gap-2.5 text-muted-foreground my-1">
                    <span className="text-primary text-xs mt-1.5 flex-shrink-0">✦</span>
                    <span className="flex-1">{children}</span>
                  </li>
                ),
                ul: ({ children }) => (
                  <ul className="my-2 space-y-1 list-none pl-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 space-y-1 list-decimal pl-5 marker:text-primary marker:font-bold">{children}</ol>
                ),
                p: ({ children }) => (
                  <p className="text-muted-foreground my-2 text-[13px]">{children}</p>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-3 border-primary/50 pl-4 my-3 py-2 bg-primary/5 rounded-r-lg text-muted-foreground italic text-[13px]">
                    {children}
                  </blockquote>
                ),
                hr: () => (
                  <hr className="my-4 border-border/50" />
                ),
                table: ({ children }) => (
                  <div className="my-3 w-full overflow-x-auto rounded-xl border border-border shadow-sm">
                    <table className="w-full border-collapse text-xs">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-primary/10">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="border-b border-border px-3 py-2.5 text-left font-bold text-foreground text-xs uppercase tracking-wider">{children}</th>
                ),
                tr: ({ children }) => (
                  <tr className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">{children}</tr>
                ),
                td: ({ children }) => (
                  <td className="px-3 py-2.5 text-muted-foreground text-xs">{children}</td>
                ),
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return (
                      <pre className="my-3 p-3 rounded-lg bg-background/80 border border-border/50 overflow-x-auto">
                        <code className="text-xs text-foreground">{children}</code>
                      </pre>
                    );
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono">{children}</code>
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
