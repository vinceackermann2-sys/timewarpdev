import { useEffect, type ReactNode, type RefObject } from "react";
import {
  ArrowUp,
  ChevronDown,
  FileUp,
  Monitor,
  Palette,
  Square,
  StickyNote,
  User,
  X,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { MentionState } from "@/lib/agentChat/mentionHelpers";
import { AgentChatPlusMenu, AgentChatPlusTrigger } from "./AgentChatPlusMenu";

type FileChip = { id: string; name: string; file?: File };

export function AgentChatInput({
  composerOverlay,
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
  selectedChatEmployees,
  setSelectedChatEmployees,
  selectedGraphic,
  setSelectedGraphic,
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
  setMentionState,
  referenceUrlInput,
  setReferenceUrlInput,
  searchResults,
  onInsertReference,
  onSend,
  onCancel,
  onInputForMention,
  activeSubMenu,
  referenceSubContent,
  graphicsSubContent,
  employeesSubContent,
}: {
  composerOverlay?: ReactNode;
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
  selectedChatEmployees: { id: string; name: string; role: string }[];
  setSelectedChatEmployees: React.Dispatch<React.SetStateAction<{ id: string; name: string; role: string }[]>>;
  selectedGraphic: string | null;
  setSelectedGraphic: (v: string | null) => void;
  isActionMode: boolean;
  setIsActionMode: (v: boolean | ((p: boolean) => boolean)) => void;
  extensionConnected: boolean;
  onRetryExtensionDetection?: () => void;
  showReference: boolean;
  setShowReference: (v: boolean | ((p: boolean) => boolean)) => void;
  showGraphicsMenu: boolean;
  setShowGraphicsMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  showEmployeesMenu: boolean;
  setShowEmployeesMenu: (v: boolean | ((p: boolean) => boolean)) => void;
  setIsSettingsOpen: (v: boolean) => void;
  isSending: boolean;
  mentionState: MentionState;
  setMentionState: (v: MentionState) => void;
  referenceUrlInput: string;
  setReferenceUrlInput: (v: string) => void;
  searchResults: { id: string; url: string; name: string; logo: string }[];
  onInsertReference: (result: { url: string; name: string; logo: string }) => void;
  onSend: () => void;
  onCancel: () => void;
  onInputForMention: () => void;
  activeSubMenu: "reference" | "graphics" | "employees" | null;
  referenceSubContent: React.ReactNode;
  graphicsSubContent: React.ReactNode;
  employeesSubContent: React.ReactNode;
}) {
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

      <div ref={dropupRef} className="relative flex flex-col bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border rounded-2xl p-2">
        <div className="px-1 pb-1 border-b border-border/40 mb-1">
          <button
            type="button"
            onClick={() => setSessionMemoryOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <StickyNote className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left">Session memory</span>
            <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", sessionMemoryOpen && "rotate-180")} />
          </button>
          {sessionMemoryOpen && (
            <Textarea
              value={sessionMemory}
              onChange={(e) => setSessionMemory(e.target.value)}
              placeholder="Notes for this thread: facts, preferences, goals (saved with the chat)."
              className="mt-1 min-h-[72px] max-h-[160px] resize-y text-sm bg-card"
            />
          )}
        </div>

        {(uploadedFiles.length > 0 ||
          selectedChatEmployees.length > 0 ||
          selectedGraphic ||
          (isActionMode && extensionConnected)) && (
          <div className="flex flex-wrap gap-1.5 px-1 pb-2">
            {isActionMode && extensionConnected && (
              <div className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5">
                <Monitor className="w-3.5 h-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground">Computer ON</span>
              </div>
            )}
            {selectedGraphic && (
              <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-2">
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">{selectedGraphic}</span>
                <button type="button" onClick={() => setSelectedGraphic(null)} className="text-primary/60 hover:text-primary">
                  <X className="w-3 h-3" />
                </button>
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
            {selectedChatEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-1.5 bg-foreground/10 border border-foreground/20 rounded-lg px-2.5 py-1.5 animate-in fade-in slide-in-from-bottom-2"
              >
                <User className="w-3.5 h-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground max-w-[120px] truncate">{emp.name}</span>
                <button type="button" onClick={() => setSelectedChatEmployees((es) => es.filter((e) => e.id !== emp.id))} className="text-foreground/60 hover:text-foreground">
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
                  showReference={showReference}
                  setShowReference={setShowReference}
                  showGraphicsMenu={showGraphicsMenu}
                  setShowGraphicsMenu={setShowGraphicsMenu}
                  showEmployeesMenu={showEmployeesMenu}
                  setShowEmployeesMenu={setShowEmployeesMenu}
                  setIsDropupOpen={setIsDropupOpen}
                  setIsSettingsOpen={setIsSettingsOpen}
                  referenceSubContent={referenceSubContent}
                  graphicsSubContent={graphicsSubContent}
                  employeesSubContent={employeesSubContent}
                />
              </div>
              {activeSubMenu && (
                <div className="ml-2 w-72 max-h-[60vh] overflow-y-auto bg-card rounded-2xl shadow-xl border border-border animate-in slide-in-from-left-2 fade-in duration-150">
                  {activeSubMenu === "reference" && referenceSubContent}
                  {activeSubMenu === "graphics" && graphicsSubContent}
                  {activeSubMenu === "employees" && employeesSubContent}
                </div>
              )}
            </div>
          )}

          <Sheet
            open={isDropupOpen && isMobileChatView}
            onOpenChange={(open) => {
              if (!open) {
                setIsDropupOpen(false);
                setShowEmployeesMenu(false);
                setShowReference(false);
                setShowGraphicsMenu(false);
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
                  showReference={showReference}
                  setShowReference={setShowReference}
                  showGraphicsMenu={showGraphicsMenu}
                  setShowGraphicsMenu={setShowGraphicsMenu}
                  showEmployeesMenu={showEmployeesMenu}
                  setShowEmployeesMenu={setShowEmployeesMenu}
                  setIsDropupOpen={setIsDropupOpen}
                  setIsSettingsOpen={setIsSettingsOpen}
                  referenceSubContent={referenceSubContent}
                  graphicsSubContent={graphicsSubContent}
                  employeesSubContent={employeesSubContent}
                />
              </div>
            </SheetContent>
          </Sheet>

          <AgentChatPlusTrigger
            isMobile={isMobileChatView}
            isDropupOpen={isDropupOpen}
            setIsDropupOpen={setIsDropupOpen}
            isActionMode={isActionMode}
            setShowEmployeesMenu={setShowEmployeesMenu}
            setShowReference={setShowReference}
            setShowGraphicsMenu={setShowGraphicsMenu}
          />

          <div className="flex-1 flex items-center px-3 py-1">
            <div
              ref={chatInputRef}
              contentEditable
              suppressContentEditableWarning
              className="flex-1 bg-transparent border-none outline-none text-foreground text-base min-w-[120px] max-h-[120px] overflow-y-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text cursor-text"
              data-placeholder="Ask me anything..."
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
    </footer>
  );
}
