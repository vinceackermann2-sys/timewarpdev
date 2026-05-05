import type { Components } from "react-markdown";
import { cn } from "@/lib/utils";
import type { LiveSourceRegistry } from "@/lib/liveSourceRegistry";
import type { ChatMessage } from "@/lib/agentChat/types";
import { buildLiveCitationAnchor } from "@/components/chat/liveCitationAnchor";
import { InlineChatAnalytics } from "@/components/database/InlineChatAnalytics";
import { InlineDocument, InlineSpreadsheet, InlineSlide } from "@/components/database/InlineChatGraphics";

/** Markdown `components` map for assistant bubbles (live citations + inline graphics). */
export function buildChatMarkdownComponents(msg: ChatMessage): Partial<Components> {
  const inferGraphicKindFromJson = (
    text: string,
  ): "chart" | "analytics" | "document" | "spreadsheet" | "slide" | null => {
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
      ) return "slide";
      return null;
    } catch {
      return null;
    }
  };

  return {
    h1: ({ children }) => <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-[15px] font-semibold text-foreground mt-5 mb-2 first:mt-0">{children}</h3>,
    p: ({ children }) => <p className="mb-4 last:mb-0 leading-[1.8] text-foreground/90">{children}</p>,
    ul: ({ children }) => <ul className="my-4 pl-6 space-y-2 list-disc marker:text-foreground/40">{children}</ul>,
    ol: ({ children }) => <ol className="my-4 pl-6 space-y-2 list-decimal marker:text-foreground/40">{children}</ol>,
    li: ({ children }) => <li className="leading-[1.7] text-foreground/90 pl-1">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
    blockquote: ({ children }) => (
      <blockquote className="my-4 pl-4 border-l-2 border-primary/30 text-foreground/70 italic">{children}</blockquote>
    ),
    hr: () => <hr className="my-6 border-border/50" />,
    code: ({ children, className }) => {
      const text = String(children).replace(/\n$/, "");
      const inferredJsonKind = className?.includes("language-json") ? inferGraphicKindFromJson(text) : null;
      if (className?.includes("language-chart") || className?.includes("language-graph")) {
        return <InlineChatAnalytics jsonString={text} />;
      }
      if (className?.includes("language-document")) {
        return <InlineDocument jsonString={text} />;
      }
      if (className?.includes("language-analytics")) {
        return <InlineChatAnalytics jsonString={text} />;
      }
      if (className?.includes("language-spreadsheet")) {
        return <InlineSpreadsheet jsonString={text} />;
      }
      if (className?.includes("language-slide")) {
        return <InlineSlide jsonString={text} />;
      }
      if (inferredJsonKind === "chart" || inferredJsonKind === "analytics") {
        return <InlineChatAnalytics jsonString={text} />;
      }
      if (inferredJsonKind === "document") {
        return <InlineDocument jsonString={text} />;
      }
      if (inferredJsonKind === "spreadsheet") {
        return <InlineSpreadsheet jsonString={text} />;
      }
      if (inferredJsonKind === "slide") {
        return <InlineSlide jsonString={text} />;
      }
      if (className?.includes("language-assistant_sources")) {
        return null;
      }
      const isBlock = className?.includes("language-");
      return isBlock ? (
        <code className={cn("block", className)}>{children}</code>
      ) : (
        <code className="rounded bg-muted px-1.5 py-0.5 text-[13px] font-mono text-foreground/80">{children}</code>
      );
    },
    pre: ({ children }) => {
      const child = children as { props?: { className?: string } };
      const cls = child?.props?.className || "";
      if (
        cls.includes("language-chart") ||
        cls.includes("language-graph") ||
        cls.includes("language-document") ||
        cls.includes("language-analytics") ||
        cls.includes("language-spreadsheet") ||
        cls.includes("language-slide")
      ) {
        return <>{children}</>;
      }
      if (cls.includes("language-assistant_sources")) {
        return null;
      }
      const innerText = (() => {
        try {
          const c = children as any;
          const raw = c?.props?.children;
          return typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? raw.join("").trim() : "";
        } catch {
          return "";
        }
      })();
      if (!innerText) return null;
      return <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-[13px]">{children}</pre>;
    },
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border/50">
        <table className="w-full text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-muted/50 border-b border-border/50">{children}</thead>,
    th: ({ children }) => <th className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px] shadow-none">{children}</th>,
    td: ({ children }) => <td className="px-4 py-2.5 border-t border-border/30 text-foreground/80 bg-white">{children}</td>,
    a: buildLiveCitationAnchor(msg.liveSourceRegistry as LiveSourceRegistry | undefined),
  };
}
