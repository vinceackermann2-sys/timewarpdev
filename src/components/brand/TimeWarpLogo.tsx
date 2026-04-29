import { Link } from "react-router-dom";
import timewarpLogo from "@/assets/timewarp-logo-swirl.png";
import { cn } from "@/lib/utils";

interface TimeWarpLogoProps {
  /** Render only the icon (no wordmark) */
  iconOnly?: boolean;
  /** Wrap in a Link to "/" */
  asLink?: boolean;
  /** Logo size in px (height of swirl) */
  size?: number;
  /** Wordmark text size class (e.g. "text-xl") */
  wordmarkClassName?: string;
  className?: string;
}

/**
 * Unified TimeWarp brand mark — swirl logo + wordmark.
 * Use this everywhere the TimeWarp brand appears (header, footer, auth, etc).
 */
export function TimeWarpLogo({
  iconOnly = false,
  asLink = false,
  size = 32,
  wordmarkClassName = "text-xl",
  className,
}: TimeWarpLogoProps) {
  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={timewarpLogo}
        alt="TimeWarp"
        style={{ height: size, width: size }}
        className="object-contain"
      />
      {!iconOnly && (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            wordmarkClassName
          )}
        >
          TimeWarp
        </span>
      )}
    </span>
  );

  if (asLink) {
    return (
      <Link to="/" className="inline-flex items-center">
        {content}
      </Link>
    );
  }
  return content;
}
