import { ExternalLink, FileText, Mail, Calendar, CheckCircle2, AlertCircle, Loader2, Sparkles, ArrowRight, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <div className="bg-accent text-accent-foreground ml-8 rounded-lg px-3 py-2 text-sm">
        {content}
      </div>
    );
  }

  // Parse content for bold text and formatting
  const formatContent = (text: string) => {
    if (!text) return null;
    
    // Split by **bold** markers
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

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
    <div className="bg-muted mr-4 rounded-lg overflow-hidden text-sm">
      {/* Progress Steps */}
      {steps && steps.length > 0 && (
        <div className="px-3 py-2 border-b border-border/50 bg-card/50 space-y-1.5">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className={cn(
                "flex items-center gap-2 text-xs transition-opacity",
                step.status === "pending" && "opacity-50"
              )}
            >
              <div className="w-5 h-5 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                {getStepIcon(step)}
              </div>
              <span className={cn(
                step.status === "complete" && "text-primary font-medium",
                step.status === "running" && "text-foreground font-medium",
                step.status === "error" && "text-destructive"
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

      {/* Main Content */}
      {content && (
        <div className="px-3 py-2 leading-relaxed">
          {formatContent(content)}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-foreground/50 animate-pulse ml-0.5" />}
        </div>
      )}

      {/* Document Preview Links */}
      {documentLinks && documentLinks.length > 0 && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {documentLinks.map((doc, idx) => (
            <a
              key={idx}
              href={doc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/10 hover:border-accent/50 transition-all group"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                {getDocIcon(doc.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">{doc.title}</span>
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

      {/* Loading state when no content yet */}
      {!content && !steps?.length && isStreaming && (
        <div className="px-3 py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Processing...</span>
        </div>
      )}
    </div>
  );
}
