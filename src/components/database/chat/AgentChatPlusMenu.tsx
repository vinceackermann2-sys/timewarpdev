import type { ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileUp,
  Globe,
  Monitor,
  Palette,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const EDGE_EXT_URL =
  "https://microsoftedge.microsoft.com/addons/detail/timewarp-%E2%80%93-ai-ceo/fajgkgjioehbiccafonfbdkjhoedceim";

type Props = {
  layout: "desktop" | "mobile";
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  extensionConnected: boolean;
  isActionMode: boolean;
  setIsActionMode: (v: boolean | ((p: boolean) => boolean)) => void;
  showReference: boolean;
  setShowReference: (v: boolean | ((p: boolean) => boolean)) => void;
  showGraphicsMenu: boolean;
  setShowGraphicsMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  showEmployeesMenu: boolean;
  setShowEmployeesMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsDropupOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsSettingsOpen: (v: boolean) => void;
  referenceSubContent: ReactNode;
  graphicsSubContent: ReactNode;
  employeesSubContent: ReactNode;
};

export function AgentChatPlusMenu({
  layout,
  fileInputRef,
  extensionConnected,
  isActionMode,
  setIsActionMode,
  showReference,
  setShowReference,
  showGraphicsMenu,
  setShowGraphicsMenu,
  showEmployeesMenu,
  setShowEmployeesMenu,
  setIsDropupOpen,
  setIsSettingsOpen,
  referenceSubContent,
  graphicsSubContent,
  employeesSubContent,
}: Props) {
  const isMobile = layout === "mobile";
  const row = (extra?: string) =>
    cn(
      "w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 text-sm font-medium text-foreground transition-colors",
      !isMobile && "rounded-lg",
      extra,
    );
  const closeMenus = () => {
    setShowEmployeesMenu(false);
    setShowReference(false);
    setShowGraphicsMenu(false);
  };

  if (isMobile) {
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

        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowReference(!showReference);
              setShowEmployeesMenu(false);
              setShowGraphicsMenu(false);
            }}
            className={row("justify-between")}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Reference (@)
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showReference && "rotate-180")} />
          </button>
          {showReference && referenceSubContent}
        </div>

        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowGraphicsMenu(!showGraphicsMenu);
              setShowReference(false);
              setShowEmployeesMenu(false);
            }}
            className={row("justify-between")}
          >
            <div className="flex items-center gap-3">
              <Palette className="w-4 h-4 text-muted-foreground" />
              Graphics
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showGraphicsMenu && "rotate-180")} />
          </button>
          {showGraphicsMenu && graphicsSubContent}
        </div>

        <div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowEmployeesMenu(!showEmployeesMenu);
              setShowReference(false);
              setShowGraphicsMenu(false);
            }}
            className={row("justify-between")}
          >
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              Employees
            </div>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showEmployeesMenu && "rotate-180")} />
          </button>
          {showEmployeesMenu && employeesSubContent}
        </div>

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
            setIsSettingsOpen(true);
            setIsDropupOpen(false);
          }}
          className={row()}
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
          Settings
        </button>
      </>
    );
  }

  /* Desktop: flat rows; sub-menus fly out from parent */
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

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowReference(!showReference);
          setShowEmployeesMenu(false);
          setShowGraphicsMenu(false);
        }}
        className={cn(row("justify-between"), showReference && "bg-muted/50")}
      >
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-muted-foreground" />
          Reference (@)
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowGraphicsMenu(!showGraphicsMenu);
          setShowReference(false);
          setShowEmployeesMenu(false);
        }}
        className={cn(row("justify-between"), showGraphicsMenu && "bg-muted/50")}
      >
        <div className="flex items-center gap-3">
          <Palette className="w-4 h-4 text-muted-foreground" />
          Graphics
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowEmployeesMenu(!showEmployeesMenu);
          setShowReference(false);
          setShowGraphicsMenu(false);
        }}
        className={cn(row("justify-between"), showEmployeesMenu && "bg-muted/50")}
      >
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-muted-foreground" />
          Employees
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </button>

      {!extensionConnected ? (
        <a
          href={EDGE_EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            setIsDropupOpen(false);
            closeMenus();
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
            closeMenus();
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
          setIsSettingsOpen(true);
          setIsDropupOpen(false);
          closeMenus();
        }}
        className={row()}
      >
        <Settings className="w-4 h-4 text-muted-foreground" />
        Settings
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
  setShowEmployeesMenu,
  setShowReference,
  setShowGraphicsMenu,
}: {
  isMobile: boolean;
  isDropupOpen: boolean;
  setIsDropupOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  isActionMode: boolean;
  setShowEmployeesMenu: (v: boolean) => void;
  setShowReference: (v: boolean) => void;
  setShowGraphicsMenu: (v: boolean) => void;
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
          if (isDropupOpen) {
            setShowEmployeesMenu(false);
            setShowReference(false);
            setShowGraphicsMenu(false);
          }
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
