import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * Shared markdown component map for chat surfaces (task reports, static previews).
 * For the main transcript, use `buildChatMarkdownComponents` in AgentChatMessageList
 * so live citations and inline graphics stay wired.
 */
export function getSharedChatMarkdownComponents(): Partial<Components> {
  return {
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
    th: ({ children }) => (
      <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px] shadow-none">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80 bg-white">{children}</td>
    ),
    a: ({ children, href }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
        {children}
      </a>
    ),
  };
}
