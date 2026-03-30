import React, { useState, useRef, useEffect } from "react";
import {
  Plus, Settings, ArrowUp, FileUp, Users, X, Globe, ChevronRight,
  Monitor, Search, Shield, Link, User, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import type { AIEmployee } from "./EmployeesView";

/* ─── Orb ─── */
function Orb({ size = 64 }: { size?: number }) {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ "--sz": `${size}px`, width: size, height: size } as React.CSSProperties}
    >
      <div className="orb-glow-aura" />
      <div className="orb-connectors">
        <div className="silver-connector silver-connector-1" />
        <div className="silver-connector silver-connector-2" />
      </div>
      <div className="orb-container" />
    </div>
  );
}

/* ─── Main view ─── */
export function AgentChatView() {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();

  /* ── employees (from DB) ── */
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const loadEmployees = async () => {
    if (!user) return;
    let query = supabase
      .from("ai_employees" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (activeWorkspaceId) query = query.eq("workspace_id", activeWorkspaceId);
    else query = query.eq("user_id", user.id);
    const { data } = await query;
    if (data) setEmployees(data as unknown as AIEmployee[]);
  };
  useEffect(() => { loadEmployees(); }, [user, activeWorkspaceId]);

  /* ── UI state ── */
  const [isDropupOpen, setIsDropupOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("Agent");
  const [showAgents, setShowAgents] = useState(false);
  const [showEmployeesMenu, setShowEmployeesMenu] = useState(false);
  const [isActionMode, setIsActionMode] = useState(false);
  const [settingsTab, setSettingsTab] = useState("agent");
  const [showReference, setShowReference] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ id: string; name: string }[]>([]);
  const [referencedUrls, setReferencedUrls] = useState<{ id: string; url: string; name: string; logo: string }[]>([]);
  const [referenceUrlInput, setReferenceUrlInput] = useState("");
  const [mentionState, setMentionState] = useState<{ active: boolean; node: Node | null; startOffset: number; endOffset: number }>({ active: false, node: null, startOffset: 0, endOffset: 0 });
  const [selectedChatEmployees, setSelectedChatEmployees] = useState<{ id: string; name: string; role: string }[]>([]);

  const dropupRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLDivElement>(null);

  /* set default agent name */
  useEffect(() => {
    if (user?.email) setSelectedAgent(user.email.split("@")[0]);
  }, [user]);

  /* ── @mention / reference helpers ── */
  const insertReference = (result: { url: string; name: string; logo: string }) => {
    if (!chatInputRef.current) return;
    chatInputRef.current.focus();
    const selection = window.getSelection();
    let range: Range;
    if (mentionState.active && mentionState.node && document.contains(mentionState.node)) {
      range = document.createRange();
      range.setStart(mentionState.node, mentionState.startOffset);
      range.setEnd(mentionState.node, mentionState.endOffset);
      range.deleteContents();
      setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });
    } else if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
      if (!chatInputRef.current.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(chatInputRef.current);
        range.collapse(false);
      }
    } else {
      range = document.createRange();
      range.selectNodeContents(chatInputRef.current);
      range.collapse(false);
    }
    const beforeSpace = document.createTextNode("\u200B");
    range.insertNode(beforeSpace);
    range.setStartAfter(beforeSpace);
    range.collapse(true);
    const refNode = document.createElement("span");
    refNode.contentEditable = "false";
    refNode.className =
      "inline-flex items-center gap-1.5 h-6 px-2 rounded-md bg-card border border-border align-middle mx-1 cursor-default shadow-sm select-none";
    refNode.innerHTML = `<img src="${result.logo}" alt="" class="w-3.5 h-3.5 rounded-sm pointer-events-none" /><span class="text-xs font-medium text-foreground max-w-[120px] truncate pointer-events-none">${result.name}</span>`;
    range.insertNode(refNode);
    range.setStartAfter(refNode);
    range.collapse(true);
    const afterSpace = document.createTextNode("\u00A0");
    range.insertNode(afterSpace);
    range.setStartAfter(afterSpace);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const searchResults =
    referenceUrlInput.length > 2
      ? (() => {
          const cleanInput = referenceUrlInput.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
          const baseName = cleanInput.split(".")[0];
          return [
            { id: "1", url: `https://${cleanInput}`, name: cleanInput, logo: `https://www.google.com/s2/favicons?domain=${cleanInput}&sz=64` },
            { id: "2", url: `https://${baseName}.com`, name: `${baseName}.com`, logo: `https://www.google.com/s2/favicons?domain=${baseName}.com&sz=64` },
            { id: "3", url: `https://${baseName}.io`, name: `${baseName}.io`, logo: `https://www.google.com/s2/favicons?domain=${baseName}.io&sz=64` },
          ].filter((v, i, a) => a.findIndex((t) => t.name === v.name) === i);
        })()
      : [];

  /* click-outside */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropupRef.current && !dropupRef.current.contains(event.target as Node)) {
        setIsDropupOpen(false);
        setShowAgents(false);
        setShowEmployeesMenu(false);
        setShowReference(false);
      }
    }
    if (isDropupOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropupOpen]);

  /* ── Employee CRUD helpers (settings modal) ── */
  const handleDeleteEmployee = async (id: string) => {
    await supabase.from("ai_employees" as any).delete().eq("id", id);
    loadEmployees();
  };

  const handleUpdateEmployee = async (emp: AIEmployee) => {
    await supabase
      .from("ai_employees" as any)
      .update({ name: emp.name, role: emp.role, sop_purpose: emp.sop_purpose } as any)
      .eq("id", emp.id);
    loadEmployees();
  };

  const handleAddEmployee = async (name: string, role: string) => {
    if (!user) return;
    await supabase.from("ai_employees" as any).insert({
      user_id: user.id,
      workspace_id: activeWorkspaceId || null,
      name,
      role,
      status: "active",
    } as any);
    loadEmployees();
  };

  /* ─────────── Render ─────────── */
  return (
    <div className="h-full bg-background flex flex-col relative overflow-hidden">
      {/* Header – agent selector */}
      <header className="flex justify-end items-center p-4 md:p-6 absolute top-0 w-full z-20">
        <div className="relative">
          <button
            onClick={() => setShowAgents(!showAgents)}
            className="flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border/50 shadow-sm px-4 py-2 rounded-full text-sm font-medium text-foreground hover:bg-card transition-colors"
          >
            <Users className="w-4 h-4 text-muted-foreground" />
            {selectedAgent}
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showAgents ? "rotate-90" : ""}`} />
          </button>
          {showAgents && (
            <div className="absolute right-0 top-[calc(100%+8px)] w-48 bg-card rounded-2xl shadow-xl border border-border py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => { setSelectedAgent(emp.name); setShowAgents(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors ${selectedAgent === emp.name ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {emp.name}
                </button>
              ))}
              {employees.length === 0 && (
                <p className="px-4 py-2 text-sm text-muted-foreground text-center">No agents yet</p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Central Orb */}
      <main className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 animate-in fade-in zoom-in duration-700">
          <BusinessBrainOrb size={280} />
        </div>
        <div className="mt-12 text-center z-10">
          <h2 className="text-3xl font-bold text-foreground tracking-tight">{selectedAgent}</h2>
          <p className="text-muted-foreground mt-2 font-medium">Ready to assist you</p>
        </div>
      </main>

      {/* Chat Input */}
      <footer className="p-4 md:p-6 w-full max-w-3xl mx-auto relative z-20">
        <input
          type="file"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files) {
              const newFiles = Array.from(e.target.files).map((f) => ({ name: f.name, id: Math.random().toString() }));
              setUploadedFiles((prev) => [...prev, ...newFiles]);
            }
            e.target.value = "";
          }}
        />

        {/* Uploaded files chips */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 px-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <FileUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground max-w-[150px] truncate">{file.name}</span>
                <button onClick={() => setUploadedFiles((fs) => fs.filter((f) => f.id !== file.id))} className="text-muted-foreground hover:text-foreground ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Selected employees chips */}
        {selectedChatEmployees.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3 px-2">
            {selectedChatEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary max-w-[150px] truncate">{emp.name}</span>
                <button onClick={() => setSelectedChatEmployees((es) => es.filter((e) => e.id !== emp.id))} className="text-primary/60 hover:text-primary ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div ref={dropupRef} className="relative flex items-center bg-card shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border rounded-2xl p-2">
          {/* Dropup Menu */}
          {isDropupOpen && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 w-56 bg-card rounded-2xl shadow-xl border border-border overflow-visible py-2 animate-in slide-in-from-bottom-2 fade-in duration-200 z-40">
              <button
                onClick={() => { fileInputRef.current?.click(); setIsDropupOpen(false); }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 text-sm font-medium text-foreground transition-colors"
              >
                <FileUp className="w-4 h-4 text-muted-foreground" />
                Upload Files
              </button>

              {/* Reference sub-menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowReference(!showReference); setShowEmployeesMenu(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    Reference (@)
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showReference ? "rotate-90" : ""}`} />
                </button>
                {showReference && (
                  <div
                    className="absolute left-[calc(100%+8px)] top-0 w-72 bg-card/80 backdrop-blur-xl shadow-2xl border border-border/40 rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-200 z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search website or app..."
                        className="w-full bg-background/50 border border-border/50 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:ring-0 focus:border-border outline-none transition-all placeholder-muted-foreground text-foreground"
                        value={referenceUrlInput}
                        onChange={(e) => setReferenceUrlInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && searchResults.length > 0) {
                            const result = searchResults[0];
                            setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
                            insertReference(result);
                            setReferenceUrlInput("");
                            setIsDropupOpen(false);
                            setShowReference(false);
                          }
                        }}
                        autoFocus
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1 max-h-[200px] overflow-y-auto">
                        {searchResults.map((result) => (
                          <button
                            key={result.id}
                            onClick={() => {
                              setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
                              insertReference(result);
                              setReferenceUrlInput("");
                              setIsDropupOpen(false);
                              setShowReference(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted/50 rounded-xl transition-colors text-left"
                          >
                            <img src={result.logo} alt="" className="w-8 h-8 rounded-full bg-card p-1 shadow-sm object-contain" />
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-semibold text-foreground truncate">{result.name}</span>
                              <span className="text-xs text-muted-foreground truncate">{result.url}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Employees sub-menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowEmployeesMenu(!showEmployeesMenu); setShowReference(false); }}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    Agents
                  </div>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${showEmployeesMenu ? "rotate-90" : ""}`} />
                </button>
                {showEmployeesMenu && (
                  <div className="absolute left-[calc(100%+8px)] top-0 w-48 bg-card rounded-2xl shadow-xl border border-border py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                    {employees.length > 0 ? (
                      employees.map((emp) => (
                        <button
                          key={emp.id}
                          onClick={() => {
                            if (!selectedChatEmployees.find((e) => e.id === emp.id)) {
                              setSelectedChatEmployees((prev) => [...prev, { id: emp.id, name: emp.name, role: emp.role }]);
                            }
                            setIsDropupOpen(false);
                            setShowEmployeesMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-muted-foreground flex flex-col"
                        >
                          <span className="font-medium text-foreground">{emp.name}</span>
                          <span className="text-xs text-muted-foreground">{emp.role}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-muted-foreground text-center">No agents added</div>
                    )}
                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => { setIsSettingsOpen(true); setSettingsTab("employees"); setIsDropupOpen(false); setShowEmployeesMenu(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 transition-colors text-primary font-medium flex items-center gap-2"
                      >
                        <Settings className="w-3 h-3" />
                        Manage Agents
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action mode toggle */}
              <button
                onClick={() => { setIsActionMode(!isActionMode); setIsDropupOpen(false); setShowEmployeesMenu(false); setShowReference(false); }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center justify-between text-sm font-medium text-foreground transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Monitor className={`w-4 h-4 ${isActionMode ? "text-primary" : "text-muted-foreground"}`} />
                  Computer
                </div>
                <span className={`text-xs font-semibold ${isActionMode ? "text-primary" : "text-muted-foreground"}`}>
                  {isActionMode ? "ON" : "OFF"}
                </span>
              </button>

              {/* Settings */}
              <button
                onClick={() => { setIsSettingsOpen(true); setIsDropupOpen(false); setShowEmployeesMenu(false); setShowReference(false); }}
                className="w-full text-left px-4 py-3 hover:bg-muted/50 flex items-center gap-3 text-sm font-medium text-foreground transition-colors"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
                Settings
              </button>
            </div>
          )}

          {/* Plus button */}
          <div className="group relative">
            <button
              onClick={() => { setIsDropupOpen(!isDropupOpen); if (isDropupOpen) { setShowEmployeesMenu(false); setShowReference(false); } }}
              className={`p-2.5 rounded-full transition-all active:scale-95 flex items-center justify-center ${
                isActionMode
                  ? isDropupOpen ? "bg-primary/20 text-primary" : "text-primary hover:bg-primary/10"
                  : isDropupOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Contenteditable input */}
          <div className="flex-1 flex items-center px-3 py-1">
            <div
              ref={chatInputRef}
              contentEditable
              suppressContentEditableWarning
              className="flex-1 bg-transparent border-none outline-none text-foreground text-base min-w-[120px] max-h-[120px] overflow-y-auto whitespace-pre-wrap empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:cursor-text cursor-text"
              data-placeholder="Ask me anything..."
              onInput={() => {
                const selection = window.getSelection();
                if (!selection || selection.rangeCount === 0) return;
                const range = selection.getRangeAt(0);
                const node = range.startContainer;
                if (node.nodeType === Node.TEXT_NODE) {
                  const text = node.textContent || "";
                  const offset = range.startOffset;
                  const textBeforeCursor = text.slice(0, offset);
                  const match = textBeforeCursor.match(/(?:^|\s)@(\S*)$/);
                  if (match) {
                    setMentionState({ active: true, node, startOffset: offset - match[1].length - 1, endOffset: offset });
                    setReferenceUrlInput(match[1]);
                    setIsDropupOpen(true);
                    setShowReference(true);
                  } else if (mentionState.active) {
                    setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });
                    setShowReference(false);
                    setIsDropupOpen(false);
                  }
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (mentionState.active && searchResults.length > 0) {
                    const result = searchResults[0];
                    setReferencedUrls((prev) => [...prev, { id: Math.random().toString(), ...result }]);
                    insertReference(result);
                    setReferenceUrlInput("");
                    setIsDropupOpen(false);
                    setShowReference(false);
                    return;
                  }
                  // TODO: send message via run-employee edge function
                  if (chatInputRef.current) chatInputRef.current.innerHTML = "";
                  setReferencedUrls([]);
                  setMentionState({ active: false, node: null, startOffset: 0, endOffset: 0 });
                }
              }}
            />
          </div>

          {/* Send button */}
          <button className={`p-2.5 rounded-full text-primary-foreground transition-all active:scale-95 flex items-center justify-center shadow-sm ${isActionMode ? "bg-primary hover:bg-primary/90" : "bg-foreground hover:bg-foreground/90"}`}>
            <ArrowUp className="w-5 h-5" />
          </button>
        </div>
      </footer>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsSettingsOpen(false)} />
          <div className="relative w-full max-w-4xl h-[600px] bg-background shadow-2xl border border-border rounded-2xl z-50 animate-in zoom-in-95 fade-in duration-200 flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
              <div className="w-8" />
              <h3 className="text-lg font-bold text-foreground text-center flex-1">Your Agent</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 bg-card border-r border-border p-4 space-y-1 overflow-y-auto">
                {([
                  { key: "agent", label: "Your Agent", icon: User },
                  { key: "safety", label: "Safety", icon: Shield },
                  { key: "employees", label: "Employees", icon: Users },
                  { key: "connections", label: "Connections", icon: Link },
                ] as const).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSettingsTab(key)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-3 ${settingsTab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"}`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 p-8 overflow-y-auto flex flex-col">
                {settingsTab === "agent" && (
                  <div className="space-y-6 flex-1">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Active Agent</label>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      >
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">System Prompt</label>
                      <textarea
                        className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-card text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all h-32 resize-none"
                        placeholder="You are a helpful assistant..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Creativity (Temperature)</label>
                      <input type="range" className="w-full accent-primary" min="0" max="100" defaultValue="70" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1 font-medium">
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>
                  </div>
                )}

                {settingsTab === "employees" && (
                  <div className="space-y-6 flex-1">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-4">Manage Employees</h4>
                      <div className="space-y-4">
                        {employees.map((emp) => (
                          <div key={emp.id} className="bg-card border border-border p-4 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 mr-4">
                                <input
                                  type="text"
                                  defaultValue={emp.name}
                                  onBlur={(e) => handleUpdateEmployee({ ...emp, name: e.target.value })}
                                  className="font-semibold text-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder-muted-foreground outline-none"
                                  placeholder="Employee Name"
                                />
                                <input
                                  type="text"
                                  defaultValue={emp.role}
                                  onBlur={(e) => handleUpdateEmployee({ ...emp, role: e.target.value })}
                                  className="text-xs text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full mt-0.5 placeholder-muted-foreground outline-none"
                                  placeholder="Role / Title"
                                />
                              </div>
                              <button onClick={() => handleDeleteEmployee(emp.id)} className="text-destructive hover:text-destructive/80 p-1 flex-shrink-0">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          const name = prompt("Enter employee name:");
                          if (!name) return;
                          const role = prompt("Enter employee role:");
                          if (!role) return;
                          handleAddEmployee(name, role);
                        }}
                        className="mt-4 w-full py-2.5 border border-dashed border-border text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Employee
                      </button>
                    </div>
                  </div>
                )}

                {settingsTab !== "agent" && settingsTab !== "employees" && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground">
                    <p>Configuration for {settingsTab} will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
