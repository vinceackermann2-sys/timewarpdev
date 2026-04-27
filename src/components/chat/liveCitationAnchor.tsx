import { ExternalLink } from "lucide-react";
import type { Components } from "react-markdown";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { formatLiveProviderLabel, type LiveSourceRegistry } from "@/lib/liveSourceRegistry";
import { SOURCE_META } from "@/components/database/dashboardTypes";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { cn } from "@/lib/utils";

const TWCITE_PREFIX = "twcite:";

/** Map a live-source provider key (e.g. `google_gmail`) to its SOURCE_META logo. */
function providerSourceMeta(provider: string) {
  if (SOURCE_META[provider]) return SOURCE_META[provider];
  // Common aliases
  const aliases: Record<string, string> = {
    gmail: "google_gmail",
    drive: "google_drive",
    calendar: "google_calendar",
    microsoft_outlook: "outlook",
    microsoft_onedrive: "onedrive",
    microsoft_onenote: "onenote",
  };
  const aliased = aliases[provider];
  return (aliased && SOURCE_META[aliased]) || SOURCE_META.general;
}

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

  const sourceMeta = providerSourceMeta(ref.provider);
  const providerLabel = formatLiveProviderLabel(ref.provider);
  const hasLogo = !!sourceMeta?.icon;

  return (
    <HoverCard openDelay={180} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button type="button" className="inline p-0 m-0 border-0 bg-transparent align-baseline text-inherit">
          {trigger}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" className="w-80 p-0 overflow-hidden">
        {/* Source card — shows the original integration source with its real logo */}
        <div className="rounded-t-xl border-b border-border/60 bg-muted/40 px-3 py-2.5 flex items-center gap-2.5">
          {hasLogo ? (
            <img
              src={sourceMeta.icon}
              alt={sourceMeta.label}
              className="h-6 w-6 object-contain shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <BusinessBrainOrb size={20} />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
              {providerLabel}
            </div>
            <div className="text-[10.5px] text-muted-foreground/80 mt-0.5 capitalize">{ref.kind}</div>
          </div>
        </div>

        {/* Body */}
        <div className="px-3 py-3 space-y-2 text-left">
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
              Open in {providerLabel}
            </a>
          ) : (
            <p className="text-xs text-muted-foreground">No external link for this item — snippet above is from your connected search.</p>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/** React-markdown `a` override: `twcite:twsrc_N` opens hover preview from registry. */
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
