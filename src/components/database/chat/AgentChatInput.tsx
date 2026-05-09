import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { ArrowUp, FileUp, ListTodo, Monitor, ScrollText, Square, X } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { MentionState } from "@/lib/agentChat/mentionHelpers";
import { AgentChatPlusMenu, AgentChatPlusTrigger } from "./AgentChatPlusMenu";
import { SkillsDialog, SkillsSubMenu, type ActiveSkill } from "./SkillsDialog";

type FileChip = { id: string; name: string; file?: File };

export function AgentChatInput({
  composerOverlay,
  hideComposerBar = false,
  dropupRef,
  fileInputRef,
  chatInputRef,
  isMobileChatView,
  isDropupOpen,
  setIsDropupOpen,
  sessionMemoryOpen,
  setSessionMemoryOpen,
  sessionMemory,
  setSessionMemory,
  contextTokens = 0,
  contextTokenLimit = 200000,
  uploadedFiles,
  setUploadedFiles,
  employees,
  selectedChatEmployees,
  setSelectedChatEmployees,
  onQuickRunEmployee,
  isActionMode,
  setIsActionMode,
  extensionConnected,
  onRetryExtensionDetection,
  showReference,
  setShowReference,
  showGraphicsMenu,
  setShowGraphicsMenu,
  showEmployeesMenu,
  setShowEmployeesMenu,
  isPlanMode,
  setIsPlanMode,
  isSending,
  mentionState,
  referenceUrlInput,
  setReferenceUrlInput,
  searchResults,
  onInsertReference,
  onSend,
  onCancel,
  onInputForMention,
  referenceSubContent,
}: {
  composerOverlay?: ReactNode;
  hideComposerBar?: boolean;
  dropupRef: RefObject<HTMLDivElement | null>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  chatInputRef: RefObject<HTMLDivElement | null>;
  isMobileChatView: boolean;
  isDropupOpen: boolean;
  setIsDropupOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  sessionMemoryOpen: boolean;
  setSessionMemoryOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  sessionMemory: string;
  setSessionMemory: (v: string) => void;
  contextTokens?: number;
  contextTokenLimit?: number;
  uploadedFiles: FileChip[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<FileChip[]>>;
  employees: { id: string; name: string; role: string }[];
  selectedChatEmployees: { id: string; name: string; role: string }[];
  setSelectedChatEmployees: React.Dispatch<React.SetStateAction<{ id: string; name: string; role: string }[]>>;
  /** Run employee's browser SOP without typing a message (extension + computer path). */
  onQuickRunEmployee?: (emp: { id: string; name: string; role: string }) => void;
  isActionMode: boolean;
  setIsActionMode: (v: boolean | ((p: boolean) => boolean)) => void;
  extensionConnected: boolean;
  onRetryExtensionDetection?: () => void;
  /** True when @mention opened the reference picker */
  showReference: boolean;
  setShowReference: (v: boolean | ((p: boolean) => boolean)) => void;
  showGraphicsMenu: boolean;
  setShowGraphicsMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  showEmployeesMenu: boolean;
  setShowEmployeesMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  isPlanMode: boolean;
  setIsPlanMode: (v: boolean | ((p: boolean) => boolean)) => void;
  isSending: boolean;
  mentionState: MentionState;
  referenceUrlInput: string;
  setReferenceUrlInput: (v: string) => void;
  searchResults: { id: string; url: string; name: string; logo: string }[];
  onInsertReference: (result: { url: string; name: string; logo: string }) => void;
  onSend: () => void;
  onCancel: () => void;
  onInputForMention: () => void;
  referenceSubContent: React.ReactNode;
}) {
  // Re-detect the extension whenever the user opens the Plus dropup so the
  // "Computer" row reflects the current state without requiring a full reload.
  useEffect(() => {
    if (isDropupOpen && !extensionConnected) {
      onRetryExtensionDetection?.();
    }
    if (!isDropupOpen) {
      setSkillsSubOpen(false);
    }
  }, [isDropupOpen, extensionConnected, onRetryExtensionDetection]);

  const [skillsDialogOpen, setSkillsDialogOpen] = useState(false);
  const [skillsDialogMode, setSkillsDialogMode] = useState<"browse" | "mine" | "create">("browse");
  const [skillsSubOpen, setSkillsSubOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<ActiveSkill | null>(null);

  // Wrap onSend so the active skill's instructions are prepended to the
  // outbound message. The chip persists across sends until the user clears it.
  const handleSend = () => {
    if (activeSkill && chatInputRef.current) {
      const txt = chatInputRef.current.innerText ?? "";
      const prefixParts: string[] = [];
      if (activeSkill.trigger) prefixParts.push(activeSkill.trigger.trim());
      if (activeSkill.instructions) prefixParts.push(`[Skill: ${activeSkill.name}]\n${activeSkill.instructions.trim()}`);
      const prefix = prefixParts.join("\n\n");
      const sentinel = activeSkill.trigger?.trim() || `[Skill: ${activeSkill.name}]`;
      if (prefix && !txt.startsWith(sentinel)) {
        chatInputRef.current.innerText = `${prefix}\n\n${txt}`;
      }
    }
    onSend();
  };

  const enableSkill = (skill: ActiveSkill) => {
    setActiveSkill(skill);
    setSkillsSubOpen(false);
    setIsDropupOpen(false);
    chatInputRef.current?.focus();
  };

  return (
    <footer className="shrink-0 p-3 sm:p-4 md:p-6 w-full max-w-3xl mx-auto relative z-20 bg-background">
      <input
        type="file"
        multiple
        className="hidden"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) {
            const newFiles = Array.from(e.target.files).map((f) => ({ name: f.name, id: Math.random().toString(), file: f }));
            setUploadedFiles((prev) => [...prev, ...newFiles]);
          }
          e.target.value = "";
        }}
      />
      {composerOverlay}

      {hideComposerBar ? null : (

      <div ref={dropupRef} className="relative flex flex-col bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border rounded-2xl p-2">

        {(uploadedFiles.length > 0 || (isActionMode && extensionConnected) || isPlanMode || activeSkill) && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
            {isPlanMode && (
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                <ListTodo className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">Planning</span>
                <button type="button" onClick={() => setIsPlanMode(false)} className="text-primary/60 hover:text-primary">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {activeSkill && (
              <div
                className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5"
                title={activeSkill.description || activeSkill.instructions}
              >
                <ScrollText className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary truncate max-w-[160px]">{activeSkill.name}</span>
                <button type="button" onClick={() => setActiveSkill(null)} className="text-primary/60 hover:text-primary">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            {isActionMode && extensionConnected && (
              <div className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5">
                <Monitor className="w-3.5 h-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground">Computer ON</span>
              </div>
            )}
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-2"
              >
                <FileUp className="w-3.5 h-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{file.name}</span>
                <button type="button" onClick={() => setUploadedFiles((fs) => fs.filter((f) => f.id !== file.id))} className="text-foreground/60 hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-center">
          {isDropupOpen && !isMobileChatView && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 flex items-end z-40">
              <div className="w-72 max-h-[60vh] overflow-y-auto bg-card rounded-2xl shadow-xl border border-border py-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                <AgentChatPlusMenu
                  layout="desktop"
                  fileInputRef={fileInputRef}
                  extensionConnected={extensionConnected}
                  isActionMode={isActionMode}
                  setIsActionMode={setIsActionMode}
                  setIsDropupOpen={setIsDropupOpen}
                  isPlanMode={isPlanMode}
                  setIsPlanMode={setIsPlanMode}
                  onOpenSkills={() => { setSkillsSubOpen((v) => !v); }}
                />
              </div>
              {showReference && (
                <div className="ml-2 w-72 max-h-[60vh] overflow-y-auto bg-card rounded-2xl shadow-xl border border-border animate-in slide-in-from-left-2 fade-in duration-150 py-2">
                  {referenceSubContent}
                </div>
              )}
              {skillsSubOpen && (
                <div className="ml-2 w-64 bg-card rounded-2xl shadow-xl border border-border animate-in slide-in-from-left-2 fade-in duration-150 overflow-hidden">
                  <SkillsSubMenu
                    onEnable={enableSkill}
                    onManage={() => { setSkillsSubOpen(false); setSkillsDialogMode("browse"); setSkillsDialogOpen(true); setIsDropupOpen(false); }}
                    onAdd={() => { setSkillsSubOpen(false); setSkillsDialogMode("create"); setSkillsDialogOpen(true); setIsDropupOpen(false); }}
                  />
                </div>
              )}
            </div>
          )}

          <Sheet
            open={isDropupOpen && isMobileChatView}
            onOpenChange={(open) => {
              if (!open) {
                setIsDropupOpen(false);
              }
            }}
          >
            <SheetContent side="bottom" className="rounded-t-2xl max-h-[70vh] overflow-y-auto px-2 pb-6">
              <SheetHeader className="sr-only">
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>
              <div className="py-2">
                <AgentChatPlusMenu
                  layout="mobile"
                  fileInputRef={fileInputRef}
                  extensionConnected={extensionConnected}
                  isActionMode={isActionMode}
                  setIsActionMode={setIsActionMode}
                  setIsDropupOpen={setIsDropupOpen}
                  isPlanMode={isPlanMode}
                  setIsPlanMode={setIsPlanMode}
                  onOpenSkills={() => { setSkillsDialogMode("browse"); setSkillsDialogOpen(true); }}
                  mentionActive={mentionState.active}
                  referenceSubContent={referenceSubContent}
                />
              </div>
            </SheetContent>
          </Sheet>

          <AgentChatPlusTrigger isMobile={isMobileChatView} isDropupOpen={isDropupOpen} setIsDropupOpen={setIsDropupOpen} isActionMode={isActionMode} />

          <div className="flex-1 flex items-center px-3 py-3">
            <div
              ref={chatInputRef}
              contentEditable
              suppressContentEditableWarning
              className="flex-1 bg-transparent border-none outline-none text-foreground text-base min-w-[120px] min-h-[48px] max-h-[180px] overflow-y-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text cursor-text"
              data-placeholder="Ask anything…"
              onInput={() => {
                onInputForMention();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (mentionState.active && searchResults.length > 0) {
                    const result = searchResults[0];
                    onInsertReference(result);
                    return;
                  }
                  handleSend();
                }
              }}
            />
          </div>

          {(() => {
            const pct = Math.min(100, (contextTokens / Math.max(1, contextTokenLimit)) * 100);
            const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`);
            const status =
              pct < 60
                ? { label: "Plenty of room", color: "text-emerald-600" }
                : pct < 85
                ? { label: "Getting full", color: "text-amber-600" }
                : { label: "Almost full — start a new chat soon", color: "text-destructive" };
            return (
              <Popover open={sessionMemoryOpen} onOpenChange={setSessionMemoryOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    title="Context window — how much of the AI's memory this chat is using"
                    className="flex items-center gap-1.5 px-1.5 h-8 mr-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="font-medium tabular-nums">{pct.toFixed(1)}%</span>
                    <span className="relative inline-flex w-3.5 h-3.5">
                      <svg viewBox="0 0 16 16" className="w-3.5 h-3.5">
                        <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2" />
                        <circle
                          cx="8"
                          cy="8"
                          r="6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeDasharray={`${(pct / 100) * 2 * Math.PI * 6} ${2 * Math.PI * 6}`}
                          strokeDashoffset="0"
                          transform="rotate(-90 8 8)"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-60 p-3">
                  <div className="text-xs font-semibold text-foreground">Context window</div>
                  <div className="flex items-baseline justify-between mt-2">
                    <span className="text-sm font-medium text-foreground tabular-nums">{pct.toFixed(1)}% used</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {fmt(contextTokens)} / {fmt(contextTokenLimit)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        pct < 60 ? "bg-foreground" : pct < 85 ? "bg-amber-500" : "bg-destructive",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className={cn("mt-1.5 text-xs", status.color)}>{status.label}</div>
                </PopoverContent>
              </Popover>
            );
          })()}

          {isSending ? (
            <button
              type="button"
              onClick={onCancel}
              className="p-2.5 rounded-full bg-destructive text-destructive-foreground transition-all active:scale-95 flex items-center justify-center shadow-sm hover:bg-destructive/90"
              title="Stop generating"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              data-send-btn
              onClick={handleSend}
              className={cn(
                "p-2.5 rounded-full text-primary-foreground transition-all active:scale-95 flex items-center justify-center shadow-sm",
                isActionMode ? "bg-primary hover:bg-primary/90" : "bg-foreground hover:bg-foreground/90",
              )}
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      )}

      <SkillsDialog
        open={skillsDialogOpen}
        onOpenChange={setSkillsDialogOpen}
        onEnable={enableSkill}
        initialMode={skillsDialogMode}
      />
    </footer>
  );
}
