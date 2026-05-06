import type { ReactNode } from "react";
import { ExternalLink, FileText, Monitor, Paperclip, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const EDGE_EXT_URL =
  "https://microsoftedge.microsoft.com/addons/detail/timewarp-%E2%80%93-ai-ceo/fajgkgjioehbiccafonfbdkjhoedceim";

type Props = {
  layout: "desktop" | "mobile";
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  extensionConnected: boolean;
  isActionMode: boolean;
  setIsActionMode: (v: boolean | ((p: boolean) => boolean)) => void;
  isPlanMode: boolean;
  setIsPlanMode: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsDropupOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  /** Mobile: show reference URL picker when user types @ */
  mentionActive?: boolean;
  referenceSubContent?: ReactNode;
};

export function AgentChatPlusMenu({
  layout,
  fileInputRef,
  extensionConnected,
  isActionMode,
  setIsActionMode,
  isPlanMode,
  setIsPlanMode,
  setIsDropupOpen,
  mentionActive,
  referenceSubContent,
}: Props) {
  const isMobile = layout === "mobile";
  const row = (extra?: string) =>
    cn(
      "w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 text-sm font-medium text-foreground transition-colors",
      !isMobile && "rounded-lg",
      extra,
    );

  if (isMobile) {
    return (
      <>
        {mentionActive && referenceSubContent ? <div className="px-1 pb-3 border-b border-border mb-1">{referenceSubContent}</div> : null}

        <button
          type="button"
          onClick={() => {
            fileInputRef.current?.click();
            setIsDropupOpen(false);
          }}
          className={row()}
        >
          <FileUp className="w-4 h-4 text-muted-foreground" />
          Upload Files
        </button>

        {!extensionConnected ? (
          <a
            href={EDGE_EXT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsDropupOpen(false)}
            className={row("justify-between")}
          >
            <div className="flex items-center gap-3">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              Computer
            </div>
            <span className="text-xs font-semibold text-primary flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              Get Extension
            </span>
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsActionMode(!isActionMode);
              setIsDropupOpen(false);
            }}
            className={row("justify-between")}
          >
            <div className="flex items-center gap-3">
              <Monitor className={cn("w-4 h-4", isActionMode ? "text-primary" : "text-muted-foreground")} />
              Computer
            </div>
            <span className={cn("text-xs font-semibold", isActionMode ? "text-primary" : "text-muted-foreground")}>
              {isActionMode ? "ON" : "OFF"}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setIsPlanMode(!isPlanMode);
            setIsDropupOpen(false);
          }}
          className={row("justify-between")}
        >
          <div className="flex items-center gap-3">
            <Target className={cn("w-4 h-4", isPlanMode ? "text-primary" : "text-muted-foreground")} />
            Planning
          </div>
          <span className={cn("text-xs font-semibold", isPlanMode ? "text-primary" : "text-muted-foreground")}>
            {isPlanMode ? "ON" : "OFF"}
          </span>
        </button>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          fileInputRef.current?.click();
          setIsDropupOpen(false);
        }}
        className={row()}
      >
        <FileUp className="w-4 h-4 text-muted-foreground" />
        Upload Files
      </button>

      {!extensionConnected ? (
        <a
          href={EDGE_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setIsDropupOpen(false);
          }}
          className={row("justify-between")}
        >
          <div className="flex items-center gap-3">
            <Monitor className="w-4 h-4 text-muted-foreground" />
            Computer
          </div>
          <span className="text-xs font-semibold text-primary flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            Get Extension
          </span>
        </a>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsActionMode(!isActionMode);
            setIsDropupOpen(false);
          }}
          className={row("justify-between")}
        >
          <div className="flex items-center gap-3">
            <Monitor className={cn("w-4 h-4", isActionMode ? "text-primary" : "text-muted-foreground")} />
            Computer
          </div>
          <span className={cn("text-xs font-semibold", isActionMode ? "text-primary" : "text-muted-foreground")}>
            {isActionMode ? "ON" : "OFF"}
          </span>
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          setIsPlanMode(!isPlanMode);
          setIsDropupOpen(false);
        }}
        className={row("justify-between")}
      >
        <div className="flex items-center gap-3">
          <Target className={cn("w-4 h-4", isPlanMode ? "text-primary" : "text-muted-foreground")} />
          Planning
        </div>
        <span className={cn("text-xs font-semibold", isPlanMode ? "text-primary" : "text-muted-foreground")}>
          {isPlanMode ? "ON" : "OFF"}
        </span>
      </button>
    </>
  );
}

/** Plus trigger button (shared desktop hover + mobile tap). */
export function AgentChatPlusTrigger({
  isMobile,
  isDropupOpen,
  setIsDropupOpen,
  isActionMode,
}: {
  isMobile: boolean;
  isDropupOpen: boolean;
  setIsDropupOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  isActionMode: boolean;
}) {
  return (
    <div
      className="group relative"
      onMouseEnter={() => {
        if (!isMobile && !isDropupOpen) setIsDropupOpen(true);
      }}
    >
      <button
        type="button"
        onClick={() => {
          setIsDropupOpen(!isDropupOpen);
        }}
        className={cn(
          "p-2.5 rounded-full transition-all active:scale-95 flex items-center justify-center",
          isActionMode
            ? isDropupOpen
              ? "bg-primary/20 text-primary"
              : "text-primary hover:bg-primary/10"
            : isDropupOpen
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}
