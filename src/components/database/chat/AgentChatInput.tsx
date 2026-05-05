import { useEffect, type ReactNode, type RefObject } from "react";
import { ArrowUp, FileUp, Monitor, Square, X } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MentionState } from "@/lib/agentChat/mentionHelpers";
import { AgentChatPlusMenu, AgentChatPlusTrigger } from "./AgentChatPlusMenu";

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
  setIsSettingsOpen,
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
  setIsSettingsOpen: (v: boolean) => void;
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
  }, [isDropupOpen, extensionConnected, onRetryExtensionDetection]);

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

        {(uploadedFiles.length > 0 || (isActionMode && extensionConnected)) && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
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
                  setIsSettingsOpen={setIsSettingsOpen}
                />
              </div>
              {showReference && (
                <div className="ml-2 w-72 max-h-[60vh] overflow-y-auto bg-card rounded-2xl shadow-xl border border-border animate-in slide-in-from-left-2 fade-in duration-150 py-2">
                  {referenceSubContent}
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
                  setIsSettingsOpen={setIsSettingsOpen}
                  mentionActive={mentionState.active}
                  referenceSubContent={referenceSubContent}
                />
              </div>
            </SheetContent>
          </Sheet>

          <AgentChatPlusTrigger isMobile={isMobileChatView} isDropupOpen={isDropupOpen} setIsDropupOpen={setIsDropupOpen} isActionMode={isActionMode} />

          <div className="flex-1 flex items-center px-3 py-1">
            <div
              ref={chatInputRef}
              contentEditable
              suppressContentEditableWarning
              className="flex-1 bg-transparent border-none outline-none text-foreground text-base min-w-[120px] max-h-[120px] overflow-y-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text cursor-text"
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
                  onSend();
                }
              }}
            />
          </div>

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
              onClick={onSend}
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
    </footer>
  );
}
