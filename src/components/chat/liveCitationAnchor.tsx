import { ExternalLink } from "lucide-react";
import type { Components } from "react-markdown";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatLiveProviderLabel, type LiveSourceRegistry } from "@/lib/liveSourceRegistry";
import { cn } from "@/lib/utils";

const TWCITE_PREFIX = "twcite:";

function LiveCitationTrigger({
  href,
  children,
  registry,
}: {
  href: string;
  children?: React.ReactNode;
  registry?: LiveSourceRegistry | null;
}) {
  const id = href.startsWith(TWCITE_PREFIX) ? href.slice(TWCITE_PREFIX.length) : href;
  const ref = registry?.[id];

  const trigger = (
    <span
      className={cn(
        "cursor-help border-b border-dotted border-primary/80 text-primary font-medium",
        "underline-offset-2 hover:border-primary",
      )}
    >
      {children}
    </span>
  );

  if (!ref) {
    return (
      <HoverCard openDelay={180} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button type="button" className="inline p-0 m-0 border-0 bg-transparent align-baseline text-inherit">
            {trigger}
          </button>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72 text-sm text-muted-foreground">
          Source preview is unavailable for this link (the citation id may be from an older message or the registry was not loaded).
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard openDelay={180} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button type="button" className="inline p-0 m-0 border-0 bg-transparent align-baseline text-inherit">
          {trigger}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 text-left space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {formatLiveProviderLabel(ref.provider)} · {ref.kind}
        </div>
        <div className="text-sm font-medium text-foreground leading-snug">{ref.title}</div>
        {ref.snippet ? (
          <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
            {ref.snippet}
          </p>
        ) : null}
        {ref.webUrl ? (
          <a
            href={ref.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in {formatLiveProviderLabel(ref.provider)}
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">No external link for this item — snippet above is from your connected search.</p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}

/** React-markdown \`a\` override: \`twcite:twsrc_N\` opens hover preview from registry. */
export function buildLiveCitationAnchor(
  registry: LiveSourceRegistry | undefined | null,
): NonNullable<Components["a"]> {
  return function CitationAnchor({ href, children }) {
    if (href?.startsWith(TWCITE_PREFIX)) {
      return <LiveCitationTrigger href={href} registry={registry}>{children}</LiveCitationTrigger>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80">
        {children}
      </a>
    );
  };
}
