import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Send, Loader2, Check, AlertTriangle, Zap, Workflow, ShieldCheck, Plug, Monitor, Cog, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useExtensionBridge } from "@/hooks/useExtensionBridge";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import {
  AgentExecutionMode,
  AgentSopStep,
  AgentTriggerType,
} from "./types";

interface Props {
  onCancel: () => void;
  onCreated: (agentId: string) => void;
  /** Optional — switch back to the deterministic form wizard */
  onSwitchToForm?: () => void;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  quick_replies?: string[];
}

interface DraftSpec {
  name?: string;
  description?: string;
  execution_mode?: AgentExecutionMode;
  trigger_type?: AgentTriggerType;
  trigger_source?: string;
  trigger_condition?: string;
  trigger_schedule?: string;
  required_integrations?: string[];
  sop_steps?: AgentSopStep[];
  sop_output?: string;
  safety_can_do?: string[];
  safety_cannot_do?: string[];
  safety_escalation_path?: string;
}

const REQUIRED_FIELDS: Array<{ key: keyof DraftSpec; label: string }> = [
  { key: "name", label: "Name" },
  { key: "description", label: "Description" },
  { key: "execution_mode", label: "Execution mode" },
  { key: "trigger_type", label: "Trigger" },
  { key: "sop_steps", label: "SOP steps" },
  { key: "sop_output", label: "Expected output" },
  { key: "safety_can_do", label: "Allow-list" },
  { key: "safety_cannot_do", label: "Deny-list" },
  { key: "safety_escalation_path", label: "Escalation path" },
];

function isFilled(spec: DraftSpec, key: keyof DraftSpec): boolean {
  const v = spec[key];
  if (v === undefined || v === null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function mergeSpec(prev: DraftSpec, patch: Partial<DraftSpec>): DraftSpec {
  const next: DraftSpec = { ...prev };
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === null || v === undefined) continue;
    if (Array.isArray(v)) {
      // Replace arrays wholesale — let the model own list state.
      (next as any)[k] = v;
    } else if (typeof v === "object") {
      (next as any)[k] = { ...((next as any)[k] || {}), ...v };
    } else {
      (next as any)[k] = v;
    }
  }
  return next;
}

export function AgentBuilderChat({ onCancel, onCreated, onSwitchToForm }: Props) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const { extensionConnected } = useExtensionBridge();

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Hey — let's build an agent.\n\nIn one sentence: **what should this agent do for you?** I'll handle the rest by asking quick follow-ups.",
      quick_replies: [
        "Watch a Slack channel and summarise daily",
        "Email me when a HubSpot deal stalls",
        "Scrape competitor pricing weekly (browser)",
        "Auto-reply to support emails matching X",
      ],
    },
  ]);
  const [input, setInput] = useState("");
  const [spec, setSpec] = useState<DraftSpec>({});
  const [readyToCreate, setReadyToCreate] = useState(false);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // autoscroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const filledCount = useMemo(
    () => REQUIRED_FIELDS.filter((f) => isFilled(spec, f.key)).length,
    [spec],
  );
  const totalRequired = REQUIRED_FIELDS.length;
  const completion = Math.round((filledCount / totalRequired) * 100);

  const sendTurn = async (userText: string) => {
    if (!userText.trim() || sending) return;
    const next: ChatMsg[] = [...messages, { role: "user", content: userText.trim() }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not signed in");
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-builder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
            draftSpec: spec,
            workspaceId: activeWorkspaceId || null,
            hasExtension: !!extensionConnected,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Builder error (${res.status})`);
      }
      const data = await res.json();
      setSpec((prev) => mergeSpec(prev, data.spec_patch || {}));
      setReadyToCreate(!!data.ready_to_create);
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: data.assistant_message || "(no response)",
          quick_replies: Array.isArray(data.quick_replies) ? data.quick_replies : [],
        },
      ]);
    } catch (e: any) {
      toast.error("Builder failed", { description: e?.message });
      setMessages((cur) => [
        ...cur,
        { role: "assistant", content: `⚠️ ${e?.message || "Something went wrong."} Try again.` },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    // Final validation
    const missing = REQUIRED_FIELDS.filter((f) => !isFilled(spec, f.key));
    if (missing.length) {
      toast.error("Still missing fields", {
        description: missing.map((m) => m.label).join(", "),
      });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("ai_agents")
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspaceId || null,
          name: spec.name!.trim(),
          description: spec.description?.trim() || null,
          status: "active",
          execution_mode: spec.execution_mode || "api",
          trigger_type: spec.trigger_type || "manual",
          trigger_source: spec.trigger_source?.trim() || null,
          trigger_condition: spec.trigger_condition?.trim() || null,
          trigger_schedule: spec.trigger_schedule?.trim() || null,
          required_integrations: spec.required_integrations || [],
          sop_steps: (spec.sop_steps || [])
            .map((s) => ({ label: String(s.label || "").trim(), detail: s.detail?.trim() || undefined }))
            .filter((s) => s.label),
          sop_output: spec.sop_output?.trim() || null,
          safety_can_do: (spec.safety_can_do || []).map((s) => String(s).trim()).filter(Boolean),
          safety_cannot_do: (spec.safety_cannot_do || []).map((s) => String(s).trim()).filter(Boolean),
          safety_escalation_path: spec.safety_escalation_path?.trim() || null,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Agent created");
      onCreated(data.id);
    } catch (e: any) {
      toast.error("Could not create agent", { description: e?.message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
      {/* Chat column */}
      <div className="flex-1 flex flex-col border-r border-border min-w-0">
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-background/60 backdrop-blur shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onCancel}
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
            <span className="text-muted-foreground/40">/</span>
            <h2 className="text-sm font-semibold flex items-center gap-1.5 truncate">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Build an agent
            </h2>
          </div>
          {onSwitchToForm && (
            <button
              onClick={onSwitchToForm}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Use the form instead
            </button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div ref={scrollRef} className="p-5 space-y-5 max-w-2xl mx-auto">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className={cn("flex flex-col gap-2 max-w-[85%]", m.role === "user" && "items-end")}>
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-foreground",
                    )}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                  {m.role === "assistant" && m.quick_replies && m.quick_replies.length > 0 && i === messages.length - 1 && !sending && (
                    <div className="flex flex-wrap gap-1.5">
                      {m.quick_replies.map((q, qi) => (
                        <button
                          key={qi}
                          onClick={() => sendTurn(q)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted/60 transition-colors"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-10">
                <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border p-3 bg-background shrink-0">
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendTurn(input);
                }
              }}
              placeholder={readyToCreate ? "Add a tweak, or click Create →" : "Tell the builder more…"}
              rows={1}
              className="min-h-[40px] max-h-32 resize-none"
              disabled={sending || creating}
            />
            <Button
              size="icon"
              onClick={() => sendTurn(input)}
              disabled={sending || creating || !input.trim()}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Live spec preview */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-muted/20 overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Cog className="h-3.5 w-3.5 text-muted-foreground" />
            Draft spec
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {filledCount}/{totalRequired}
          </span>
        </div>
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${completion}%` }}
          />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <SpecBlock icon={Zap} title="Identity">
              <SpecField label="Name" value={spec.name} />
              <SpecField label="Description" value={spec.description} multiline />
              <SpecField
                label="Execution"
                value={spec.execution_mode}
                badge={spec.execution_mode === "computer" ? "Browser" : spec.execution_mode === "api" ? "Connected APIs" : undefined}
                badgeIcon={spec.execution_mode === "computer" ? Monitor : Plug}
              />
              {spec.execution_mode === "computer" && !extensionConnected && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="h-3 w-3" /> Extension not detected — will use a managed cloud browser.
                </p>
              )}
            </SpecBlock>

            <SpecBlock icon={Zap} title="Trigger">
              <SpecField label="Type" value={spec.trigger_type} />
              <SpecField label="Source" value={spec.trigger_source} />
              <SpecField label="Condition" value={spec.trigger_condition} />
              <SpecField label="Schedule" value={spec.trigger_schedule} />
            </SpecBlock>

            <SpecBlock icon={Plug} title="Integrations">
              {spec.required_integrations && spec.required_integrations.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {spec.required_integrations.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None</p>
              )}
            </SpecBlock>

            <SpecBlock icon={Workflow} title="SOP">
              {spec.sop_steps && spec.sop_steps.length > 0 ? (
                <ol className="space-y-1.5 list-decimal list-inside text-xs">
                  {spec.sop_steps.map((s, i) => (
                    <li key={i} className="leading-snug">
                      <span className="font-medium">{s.label}</span>
                      {s.detail && <span className="text-muted-foreground"> — {s.detail}</span>}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-muted-foreground">No steps yet</p>
              )}
              <SpecField label="Output" value={spec.sop_output} multiline />
            </SpecBlock>

            <SpecBlock icon={ShieldCheck} title="Safety">
              <SpecList label="Can do" items={spec.safety_can_do} tone="ok" />
              <SpecList label="Cannot do" items={spec.safety_cannot_do} tone="warn" />
              <SpecField label="Escalate to" value={spec.safety_escalation_path} />
            </SpecBlock>
          </div>
        </ScrollArea>
        <div className="border-t border-border p-3 shrink-0">
          <Button
            className="w-full gap-2"
            disabled={!readyToCreate || creating}
            onClick={handleCreate}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {readyToCreate ? "Create agent" : `Keep going (${filledCount}/${totalRequired})`}
          </Button>
          {!readyToCreate && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              The builder will enable this once every required field is set and confirmed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SpecBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <Icon className="h-3 w-3 text-muted-foreground" />
        {title}
      </div>
      {children}
    </div>
  );
}

function SpecField({
  label,
  value,
  multiline,
  badge,
  badgeIcon: BadgeIcon,
}: {
  label: string;
  value?: string;
  multiline?: boolean;
  badge?: string;
  badgeIcon?: React.ComponentType<{ className?: string }>;
}) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-xs text-foreground flex items-start gap-1.5">
        {badge && BadgeIcon && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/60">
            <BadgeIcon className="h-2.5 w-2.5" /> {badge}
          </span>
        )}
        <span className={cn(multiline ? "leading-snug" : "truncate")}>{value}</span>
      </div>
    </div>
  );
}

function SpecList({
  label,
  items,
  tone,
}: {
  label: string;
  items?: string[];
  tone: "ok" | "warn";
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <ul className="space-y-0.5 text-xs">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1">
            <span className={cn(tone === "ok" ? "text-emerald-600" : "text-amber-600")}>{tone === "ok" ? "✓" : "✗"}</span>
            <span className="leading-snug">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
