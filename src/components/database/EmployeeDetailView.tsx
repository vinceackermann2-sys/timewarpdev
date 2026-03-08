import { useState, useEffect, useRef, useCallback } from "react";
import { AIEmployee } from "./EmployeesView";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { ArrowLeft, Trash2, Play, Loader2, CheckCircle2, XCircle, Clock, Wifi, WifiOff, RefreshCw, FileText, ChevronDown, ChevronUp, Download, Database, X, Pencil, Save, Plus } from "lucide-react";
import { EmployeeRunOverlay } from "./EmployeeRunOverlay";
import { useToast } from "@/hooks/use-toast";
import { useExtensionBridge, type BrowserAction } from "@/hooks/useExtensionBridge";
import { useActionGate } from "@/hooks/useActionGate";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useWorkspace } from "@/hooks/useWorkspace";

interface LogEntry {
  id: string;
  status: string;
  step_label: string | null;
  message: string | null;
  created_at: string;
}

interface Props {
  employee: AIEmployee;
  onBack: () => void;
  onDelete: (id: string) => void;
}

// Safety: blocked action keywords
const BLOCKED_ACTIONS = [
  "pay", "purchase", "buy", "checkout", "place order", "subscribe",
  "sign up", "register", "create account",
  "log in", "sign in", "login", "signin",
];

function isSafetyBlocked(action: any): string | null {
  const actionStr = JSON.stringify(action).toLowerCase();

  // Check for payment-related actions
  if (/\b(pay|purchase|buy|checkout|place.?order|add.?to.?cart.*checkout)\b/.test(actionStr)) {
    return "Blocked: payment action detected. Manual takeover required.";
  }
  // Check for signup
  if (/\b(sign.?up|register|create.?account|registration)\b/.test(actionStr)) {
    return "Blocked: account creation detected. Manual takeover required.";
  }
  // Check for login
  if (/\b(log.?in|sign.?in|password|authenticate)\b/.test(actionStr)) {
    return "Blocked: login action detected. Manual takeover required.";
  }
  // Check for sensitive data entry (credit card patterns, SSN patterns)
  if (/\b(credit.?card|card.?number|cvv|ssn|social.?security)\b/.test(actionStr)) {
    return "Blocked: sensitive data entry detected. Manual takeover required.";
  }
  return null;
}

export function EmployeeDetailView({ employee: initialEmployee, onBack, onDelete }: Props) {
  const [employee, setEmployee] = useState<AIEmployee>(initialEmployee);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [running, setRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);
  const pauseResolverRef = useRef<(() => void) | null>(null);
  const isPausedRef = useRef(false);
  const isManualModeRef = useRef(false);
  const { extensionConnected, detecting, retryDetection, getPageContext, executeAction, signalStart, signalStop, updateOverlay } = useExtensionBridge();
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());
  const [viewingResult, setViewingResult] = useState<LogEntry | null>(null);
  const [savingToDb, setSavingToDb] = useState(false);
  const { checkCanUseAction } = useActionGate();
  const { activeWorkspace } = useWorkspace();
  const [producedFiles, setProducedFiles] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Helper to split double-newline joined fields
  const splitField = (val: string | null, index: number) => {
    if (!val) return "";
    const parts = val.split("\n\n");
    return parts[index] || "";
  };

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(employee.name);
  const [editRole, setEditRole] = useState(employee.role);
  const [editSopTitle, setEditSopTitle] = useState(employee.sop_title || "");
  const [editPurposeWhy, setEditPurposeWhy] = useState(splitField(employee.sop_purpose, 0));
  const [editPurposeProblem, setEditPurposeProblem] = useState(splitField(employee.sop_purpose, 1));
  const [editScopeWhere, setEditScopeWhere] = useState(splitField(employee.sop_scope, 0));
  const [editScopeWhen, setEditScopeWhen] = useState(splitField(employee.sop_scope, 1));
  const [editDefinitions, setEditDefinitions] = useState<{ term: string; meaning: string }[]>(
    Array.isArray(employee.sop_definitions) ? employee.sop_definitions.map((d: any) => ({ term: d.term || "", meaning: d.meaning || "" })) : []
  );
  const [editProcedure, setEditProcedure] = useState<string[]>(
    Array.isArray(employee.sop_procedure) ? employee.sop_procedure.map(String) : []
  );
  const [editSafetyWarnings, setEditSafetyWarnings] = useState(splitField(employee.sop_safety_notes, 0));
  const [editSafetyRisks, setEditSafetyRisks] = useState(splitField(employee.sop_safety_notes, 1));
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => { loadLogs(); loadProducedFiles(); }, [employee.id]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const { data } = await supabase
      .from("ai_employee_logs")
      .select("*")
      .eq("employee_id", employee.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setLogs((data || []) as unknown as LogEntry[]);
    setLoadingLogs(false);
  };

  const loadProducedFiles = async () => {
    setLoadingFiles(true);
    const { data } = await supabase
      .from("user_business_data")
      .select("id, title, created_at")
      .eq("source", "ai_employee")
      .ilike("title", `${employee.name}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    setProducedFiles((data || []) as { id: string; title: string; created_at: string }[]);
    setLoadingFiles(false);
  };

  const handleDeleteLog = async (logId: string) => {
    await supabase.from("ai_employee_logs").delete().eq("id", logId);
    setLogs(prev => prev.filter(l => l.id !== logId));
    toast({ title: "Log entry deleted" });
  };

  const handleClearAllLogs = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from("ai_employee_logs").delete().eq("employee_id", employee.id).eq("user_id", session.user.id);
    setLogs([]);
    toast({ title: "Activity log cleared" });
  };

  const startEditing = () => {
    setIsEditing(true);
    setEditName(employee.name);
    setEditRole(employee.role);
    setEditSopTitle(employee.sop_title || "");
    setEditPurposeWhy(splitField(employee.sop_purpose, 0));
    setEditPurposeProblem(splitField(employee.sop_purpose, 1));
    setEditScopeWhere(splitField(employee.sop_scope, 0));
    setEditScopeWhen(splitField(employee.sop_scope, 1));
    setEditDefinitions(Array.isArray(employee.sop_definitions) ? employee.sop_definitions.map((d: any) => ({ term: d.term || "", meaning: d.meaning || "" })) : []);
    setEditProcedure(Array.isArray(employee.sop_procedure) ? employee.sop_procedure.map(String) : []);
    setEditSafetyWarnings(splitField(employee.sop_safety_notes, 0));
    setEditSafetyRisks(splitField(employee.sop_safety_notes, 1));
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    const { error } = await supabase
      .from("ai_employees" as any)
      .update({
        name: editName.trim(),
        role: editRole.trim(),
        sop_title: editSopTitle.trim() || null,
        sop_purpose: editPurpose.trim() || null,
        sop_scope: editScope.trim() || null,
        sop_definitions: editDefinitions.filter(d => d.term.trim()),
        sop_procedure: editProcedure.filter(p => p.trim()),
        sop_safety_notes: editSafety.trim() || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", employee.id);
    setSavingEdit(false);
    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      setEmployee(prev => ({
        ...prev,
        name: editName.trim(),
        role: editRole.trim(),
        sop_title: editSopTitle.trim() || null,
        sop_purpose: editPurpose.trim() || null,
        sop_scope: editScope.trim() || null,
        sop_definitions: editDefinitions.filter(d => d.term.trim()),
        sop_procedure: editProcedure.filter(p => p.trim()),
        sop_safety_notes: editSafety.trim() || null,
      }));
      setIsEditing(false);
      toast({ title: "Employee updated" });
    }
  };

  const logStep = async (status: string, stepLabel: string, message: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await supabase.from("ai_employee_logs").insert({
      employee_id: employee.id,
      user_id: session.user.id,
      status,
      step_label: stepLabel,
      message,
    });
    await loadLogs();
  };

  const waitForUnpause = useCallback((): Promise<void> => {
    if (!isPausedRef.current && !isManualModeRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      pauseResolverRef.current = resolve;
    });
  }, []);

  const handlePause = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    setSafetyAlert(null);
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: true, isManualMode: false, safetyAlert: null });
  };

  const handleContinue = () => {
    setIsPaused(false);
    isPausedRef.current = false;
    setIsManualMode(false);
    isManualModeRef.current = false;
    setSafetyAlert(null);
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: false, isManualMode: false, safetyAlert: null });
  };

  const handleManualTakeover = () => {
    setIsPaused(true);
    isPausedRef.current = true;
    setIsManualMode(true);
    isManualModeRef.current = true;
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: true, isManualMode: true, safetyAlert });
  };

  const handleReturnControl = () => {
    setIsManualMode(false);
    isManualModeRef.current = false;
    setIsPaused(false);
    isPausedRef.current = false;
    setSafetyAlert(null);
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    updateOverlay({ visible: true, employeeName: employee.name, currentStep, isPaused: false, isManualMode: false, safetyAlert: null });
  };

  const parseAction = (text: string): (BrowserAction & { done?: boolean; message?: string }) | null => {
    try {
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
      const parsed = JSON.parse(jsonStr);
      if (parsed.action) return parsed;
      return null;
    } catch {
      return null;
    }
  };

  const callRunEmployee = async (
    session: any,
    messages: Array<{ role: string; content: string }>,
    pageContext: any
  ): Promise<string> => {
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-employee`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        employee_id: employee.id,
        messages,
        pageContext,
      }),
      signal: abortRef.current?.signal,
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    const data = await resp.json();
    return data.content || "";
  };

  const handleRun = async () => {
    if (!extensionConnected) {
      toast({ title: "Extension not detected", description: "Install and log into the TimeWarp extension to run employees.", variant: "destructive" });
      return;
    }
    if (!checkCanUseAction()) return;

    setRunning(true);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsManualMode(false);
    isManualModeRef.current = false;
    setSafetyAlert(null);
    setCurrentStep("Preparing tab group…");
    updateOverlay({ visible: true, employeeName: employee.name, currentStep: "Preparing tab group…", isPaused: false, isManualMode: false });
    const groupReady = await signalStart(employee.id, employee.name);
    if (!groupReady) {
      toast({
        title: "Extension tab group failed",
        description: "The extension didn't create a tab group. Make sure the TimeWarp extension is installed, enabled, and you're not in an incognito window.",
        variant: "destructive",
      });
      setRunning(false);
      setCurrentStep("");
      updateOverlay({ visible: false });
      return;
    }
    setCurrentStep("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setRunning(false); return; }

      await logStep("running", "Started", `Running SOP: ${employee.sop_title || employee.role}`);

      // Small delay to let extension set up the tab group
      await new Promise(r => setTimeout(r, 1200));

      const procedureSteps = Array.isArray(employee.sop_procedure) ? employee.sop_procedure : [];
      const stepCount = procedureSteps.length;

      const conversationHistory: Array<{ role: string; content: string }> = [
        { role: "user", content: `Execute the FULL SOP procedure now, step by step. You have ${stepCount} procedure steps to complete. Start with step 1 immediately — navigate to the correct URL. There is no page context yet because you need to open the first page yourself. Do NOT return "done" until every single procedure step has been completed. Work through ALL ${stepCount} steps sequentially.` },
      ];

      const MAX_STEPS = 80;

      for (let step = 0; step < MAX_STEPS; step++) {
        if (abortRef.current?.signal.aborted) break;

        // Wait if paused or manual mode (use refs for fresh values)
        if (isPausedRef.current || isManualModeRef.current) {
          await waitForUnpause();
        }
        if (abortRef.current?.signal.aborted) break;

        const pageContext = await getPageContext();

        setCurrentStep(`Step ${step + 1}: Thinking…`);
        updateOverlay({ visible: true, employeeName: employee.name, currentStep: `Step ${step + 1}: Thinking…`, isPaused: false, isManualMode: false });
        await logStep("running", `Step ${step + 1}`, "Thinking…");
        const aiResponse = await callRunEmployee(session, conversationHistory, pageContext);

        conversationHistory.push({ role: "assistant", content: aiResponse });

        const action = parseAction(aiResponse);

        if (!action) {
          // Retry: AI responded with plain text instead of JSON — ask it to fix
          conversationHistory.push({
            role: "user",
            content: `Your response was not valid JSON. You MUST always respond with a JSON code block. Re-read the SOP and continue from where you left off. Respond with the next action as a JSON code block.`,
          });
          await logStep("running", `Step ${step + 1}`, "Retrying: AI did not return JSON");
          continue;
        }

        if (action.done || action.action === "done") {
          setCurrentStep("Completed");
          updateOverlay({ visible: false });
          await logStep("completed", "Completed", action.message || "SOP execution finished.");
          toast({ title: "Run completed", description: `${employee.name} finished executing the SOP.` });
          break;
        }

        // Safety check BEFORE execution
        const safetyBlock = isSafetyBlocked(action);
        if (safetyBlock) {
          setSafetyAlert(safetyBlock);
          setIsPaused(true);
          isPausedRef.current = true;
          setIsManualMode(true);
          isManualModeRef.current = true;
          await logStep("running", `Step ${step + 1} ⚠️`, `SAFETY: ${safetyBlock}`);

          // Wait for user to handle manually and return control
          await new Promise<void>((resolve) => {
            pauseResolverRef.current = resolve;
          });

          if (abortRef.current?.signal.aborted) break;

          // After manual takeover, tell AI the user handled it
          conversationHistory.push({
            role: "user",
            content: `The user manually completed the sensitive action (${action.action}). Continue with the next SOP step. Get fresh page context.`,
          });
          setSafetyAlert(null);
          continue;
        }

        if (action.action === "respond") {
          setCurrentStep(`Step ${step + 1}: ${action.message?.slice(0, 60) || "Message"}`);
          await logStep("running", `Step ${step + 1}`, action.message || action.reasoning || "Response");
          conversationHistory.push({
            role: "user",
            content: `User saw your message. Continue with the next SOP step.`,
          });
          continue;
        }

        setCurrentStep(`Step ${step + 1}: ${action.action}`);
        updateOverlay({ visible: true, employeeName: employee.name, currentStep: `Step ${step + 1}: ${action.action}`, isPaused: false, isManualMode: false });
        await logStep("running", `Step ${step + 1}`, `${action.action}: ${action.reasoning || action.selector || action.url || ""}`);

        const result = await executeAction(action, true) || { success: false, action: action.action, error: "No response from extension" };

        const resultMsg = result.success
          ? `Action "${action.action}" succeeded.${result.data ? ` Data: ${JSON.stringify(result.data)}` : ""}`
          : `Action "${action.action}" failed: ${result.error || "unknown error"}`;

        // Include fresh page context so AI knows current state
        const freshContext = await getPageContext();
        const contextInfo = freshContext?.url ? ` Current page: ${freshContext.url}` : "";
        conversationHistory.push({ role: "user", content: resultMsg + contextInfo + ` Continue with the next SOP step. You have ${stepCount} total steps to complete.` });

        if (result.success) {
          await logStep("running", `Step ${step + 1} ✓`, `Completed: ${action.action}`);
        } else {
          await logStep("error", `Step ${step + 1} ✗`, result.error || "Action failed");
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        await logStep("error", "Error", e.message || "Unknown error");
        toast({ title: "Run failed", description: e.message, variant: "destructive" });
      }
    } finally {
      setRunning(false);
      setIsPaused(false);
      isPausedRef.current = false;
      setIsManualMode(false);
      isManualModeRef.current = false;
      setSafetyAlert(null);
      setCurrentStep("");
      updateOverlay({ visible: false });
      signalStop(employee.id);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    updateOverlay({ visible: false });
    signalStop(employee.id);
    setRunning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    setIsManualMode(false);
    isManualModeRef.current = false;
    setSafetyAlert(null);
    pauseResolverRef.current?.();
    pauseResolverRef.current = null;
    toast({ title: "Run stopped" });
  };

  const toggleResultExpand = (logId: string) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const handleDownloadResult = (log: LogEntry) => {
    const blob = new Blob([log.message || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${employee.name}-${log.step_label || "result"}-${new Date(log.created_at).toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToDatabase = async (log: LogEntry) => {
    setSavingToDb(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const wsId = activeWorkspace?.workspaceId || localStorage.getItem("preferred_workspace_id");
      await supabase.from("user_business_data").insert({
        user_id: session.user.id,
        workspace_id: wsId || null,
        title: `${employee.name} – ${log.step_label || "Result"}`,
        data_type: "document",
        source: "ai_employee",
        content: log.message || "",
      });
      toast({ title: "Saved to database", description: "Result added to your Business Database." });
      setViewingResult(null);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSavingToDb(false);
    }
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</h3>
      <div className="text-sm">{children}</div>
    </div>
  );

  const renderList = (items: any[], renderItem?: (item: any, i: number) => React.ReactNode) => {
    if (!items || items.length === 0) return <p className="text-muted-foreground italic">Not specified</p>;
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-muted-foreground font-mono text-xs mt-0.5 w-5 text-right shrink-0">{i + 1}.</span>
            <span>{renderItem ? renderItem(item, i) : String(item)}</span>
          </li>
        ))}
      </ul>
    );
  };

  const statusIcon = (status: string) => {
    if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />;
    if (status === "error") return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="font-semibold">{employee.name}</h2>
          <p className="text-xs text-muted-foreground">{employee.role}</p>
        </div>

        {/* Extension status */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {detecting ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Detecting extension…</>
          ) : extensionConnected ? (
            <><Wifi className="h-3.5 w-3.5 text-primary" /> Extension connected</>
          ) : (
            <button onClick={retryDetection} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
              <WifiOff className="h-3.5 w-3.5 text-destructive" /> Extension not found
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>

        {!running && (
          <>
            <Button variant="outline" size="sm" className="gap-2" onClick={isEditing ? handleSaveEdit : startEditing} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isEditing ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
              {isEditing ? "Save" : "Edit"}
            </Button>
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
            )}
            <Button
              onClick={handleRun}
              disabled={!extensionConnected || detecting || isEditing}
              className="gap-2"
              size="sm"
              title={!extensionConnected ? "Install and log into the TimeWarp extension to run employees" : undefined}
            >
              <Play className="h-4 w-4" />
              Run Employee
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(employee.id)} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <BusinessBrainOrb size={64} />
            <div>
              <h2 className="text-xl font-semibold">{employee.name}</h2>
              <p className="text-muted-foreground">{employee.role}</p>
            </div>
          </div>

          {!extensionConnected && !detecting && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="font-medium text-destructive">Browser extension required</p>
              <p className="text-muted-foreground mt-1">
                Install and log into the TimeWarp browser extension to connect this employee to your browser and execute SOP steps automatically.
              </p>
            </div>
          )}

          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Name</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Employee name" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Role</Label>
                <Input value={editRole} onChange={e => setEditRole(e.target.value)} placeholder="e.g. Audience Researcher" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">SOP Title</Label>
                <Input value={editSopTitle} onChange={e => setEditSopTitle(e.target.value)} placeholder="e.g. Signal Mining Method" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Purpose</Label>
                <p className="text-xs text-muted-foreground">Why does this procedure exist and what problem does it solve?</p>
                <Input value={editPurpose} onChange={e => setEditPurpose(e.target.value)} placeholder="e.g. To gather data-backed product research" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Scope</Label>
                <p className="text-xs text-muted-foreground">Where and when does this procedure apply?</p>
                <Input value={editScope} onChange={e => setEditScope(e.target.value)} placeholder="e.g. Online, during product confusion" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Definitions</Label>
                <p className="text-xs text-muted-foreground">Technical terms or abbreviations used (optional).</p>
                {editDefinitions.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={d.term} onChange={e => { const c = [...editDefinitions]; c[i] = { ...c[i], term: e.target.value }; setEditDefinitions(c); }} placeholder="Term" className="w-1/3" />
                    <Input value={d.meaning} onChange={e => { const c = [...editDefinitions]; c[i] = { ...c[i], meaning: e.target.value }; setEditDefinitions(c); }} placeholder="Meaning" className="flex-1" />
                    <Button variant="ghost" size="icon" onClick={() => setEditDefinitions(editDefinitions.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditDefinitions([...editDefinitions, { term: "", meaning: "" }])} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Definition
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Procedure Steps</Label>
                <p className="text-xs text-muted-foreground">The step-by-step instructions this employee follows.</p>
                {editProcedure.map((p, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground font-mono w-5 text-right shrink-0">{i + 1}.</span>
                    <Input value={p} onChange={e => { const c = [...editProcedure]; c[i] = e.target.value; setEditProcedure(c); }} placeholder={`Step ${i + 1}`} />
                    {editProcedure.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => setEditProcedure(editProcedure.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
                    )}
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditProcedure([...editProcedure, ""])} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Step
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Safety / Compliance Notes</Label>
                <p className="text-xs text-muted-foreground">Any safety warnings, regulations, or risk considerations.</p>
                <Input value={editSafety} onChange={e => setEditSafety(e.target.value)} placeholder="e.g. Don't chat with anyone" />
              </div>
            </div>
          ) : (
            /* View Mode — always show all fields */
            <div className="space-y-6">
              <Section title="SOP Title">
                <p className="font-medium">{employee.sop_title || <span className="text-muted-foreground italic">Not specified</span>}</p>
              </Section>
              <Section title="Purpose">
                <p>{employee.sop_purpose || <span className="text-muted-foreground italic">Not specified</span>}</p>
              </Section>
              <Section title="Scope">
                <p>{employee.sop_scope || <span className="text-muted-foreground italic">Not specified</span>}</p>
              </Section>
              <Section title="Definitions">
                {employee.sop_definitions && employee.sop_definitions.length > 0
                  ? renderList(employee.sop_definitions, (d) => (
                      <span><strong>{d.term}:</strong> {d.meaning}</span>
                    ))
                  : <p className="text-muted-foreground italic">None</p>
                }
              </Section>
              <Section title="Procedure">
                {employee.sop_procedure && employee.sop_procedure.length > 0
                  ? renderList(employee.sop_procedure)
                  : <p className="text-muted-foreground italic">Not specified</p>
                }
              </Section>
              <Section title="Safety / Compliance Notes">
                <p>{employee.sop_safety_notes || <span className="text-muted-foreground italic">Not specified</span>}</p>
              </Section>

              {employee.sop_revision_history && employee.sop_revision_history.length > 0 && (
                <Section title="Revision History">
                  <div className="space-y-1">
                    {employee.sop_revision_history.map((rev: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="font-mono text-muted-foreground">{rev.version}</span>
                        <span className="text-muted-foreground">{rev.date}</span>
                        <span>{rev.notes}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}

          {/* Produced Files */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Produced Files</h3>
            {loadingFiles ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : producedFiles.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No files produced yet.</p>
            ) : (
              <div className="space-y-2">
                {producedFiles.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 text-sm">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{f.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Activity Log</h3>
              {logs.length > 0 && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1 h-7 text-xs" onClick={handleClearAllLogs}>
                  <Trash2 className="h-3 w-3" /> Clear All
                </Button>
              )}
            </div>
            {loadingLogs ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading logs...
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No activity yet. Click "Run Employee" to execute the SOP.</p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-auto border border-border rounded-lg p-3 bg-muted/20">
                {logs.map(log => {
                  const isResult = log.status === "completed" && log.message && log.message.length > 40;

                  return (
                    <div key={log.id}>
                      <div className="flex items-start gap-2.5 text-sm group">
                        {statusIcon(log.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {log.step_label && (
                              <span className="font-medium text-xs bg-muted px-1.5 py-0.5 rounded">{log.step_label}</span>
                            )}
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          {!isResult && log.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.message}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Result Card */}
                      {isResult && (
                        <button
                          onClick={() => setViewingResult(log)}
                          className="mt-2 ml-6 w-[calc(100%-1.5rem)] rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors p-4 text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{log.step_label || "Result"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.message?.slice(0, 150)}…</p>
                            </div>
                            <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Viewer Dialog */}
      <Dialog open={!!viewingResult} onOpenChange={(open) => !open && setViewingResult(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0">
          <div className="flex items-center justify-between p-5 pb-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{viewingResult?.step_label || "Result"}</h3>
                <p className="text-xs text-muted-foreground">
                  {viewingResult ? new Date(viewingResult.created_at).toLocaleString() : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-5 py-4">
            <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm whitespace-pre-wrap leading-relaxed">
              {viewingResult?.message}
            </div>
          </div>
          <div className="flex items-center gap-2 p-5 pt-0 border-t border-border mt-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => viewingResult && handleDownloadResult(viewingResult)}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => viewingResult && handleSaveToDatabase(viewingResult)}
              disabled={savingToDb}
            >
              {savingToDb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Database className="h-3.5 w-3.5" />}
              Add to Business Database
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {running && (
        <EmployeeRunOverlay
          employeeName={employee.name}
          currentStep={currentStep}
          isPaused={isPaused}
          isManualMode={isManualMode}
          onPause={handlePause}
          onContinue={handleContinue}
          onStop={handleStop}
          onManualTakeover={handleManualTakeover}
          onReturnControl={handleReturnControl}
          safetyAlert={safetyAlert}
        />
      )}
    </div>
  );
}
