import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Zap,
  Workflow,
  ShieldCheck,
  Clock,
  PlayCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import {
  AIAgent,
  STATUS_LABEL,
  TRIGGER_TYPE_LABEL,
  normalizeAgentRow,
} from "@/components/database/agents/types";
import { CreateAgentWizard } from "@/components/database/agents/CreateAgentWizard";
import { AgentBuilderChat } from "@/components/database/agents/AgentBuilderChat";
import { AgentDetailView } from "@/components/database/agents/AgentDetailView";

/**
 * AgentsPage — /app/agents
 *
 * Real list of pure-executor automations, backed by the ai_agents table.
 * Internal navigation:
 *   • list (default)
 *   • create wizard
 *   • detail view
 */
export default function AgentsPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, isLoading: wsLoading } = useWorkspace();

  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selected, setSelected] = useState<AIAgent | null>(null);
  const [renaming, setRenaming] = useState<AIAgent | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [deleting, setDeleting] = useState<AIAgent | null>(null);

  const handleRename = async () => {
    if (!renaming) return;
    const name = renameValue.trim();
    if (!name) return;
    setRenameSaving(true);
    const { error } = await supabase.from("ai_agents").update({ name }).eq("id", renaming.id);
    setRenameSaving(false);
    if (error) { toast.error("Could not rename", { description: error.message }); return; }
    toast.success("Renamed");
    setRenaming(null);
    loadAgents();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ai_agents").delete().eq("id", deleting.id);
    if (error) { toast.error("Could not delete", { description: error.message }); return; }
    toast.success("Agent deleted");
    setDeleting(null);
    loadAgents();
  };

  const loadAgents = async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    let q = supabase.from("ai_agents").select("*").order("created_at", { ascending: false });
    if (activeWorkspaceId) q = q.eq("workspace_id", activeWorkspaceId);
    else q = q.eq("user_id", user.id);
    const { data } = await q;
    setAgents(((data || []) as any[]).map(normalizeAgentRow));
    setLoading(false);
  };

  useEffect(() => {
    if (authLoading || wsLoading) return;
    loadAgents();
  }, [authLoading, wsLoading, activeWorkspaceId, user]);

  if (authLoading || wsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  if (showWizard) {
    return (
      <CreateAgentWizard
        onCancel={() => setShowWizard(false)}
        onCreated={async (id) => {
          setShowWizard(false);
          await loadAgents();
          // Auto-open the newly created agent.
          const { data } = await supabase.from("ai_agents").select("*").eq("id", id).maybeSingle();
          if (data) setSelected(normalizeAgentRow(data));
        }}
      />
    );
  }

  if (selected) {
    return (
      <AgentDetailView
        agent={selected}
        onBack={() => { setSelected(null); loadAgents(); }}
        onDeleted={() => { setSelected(null); loadAgents(); }}
        onUpdated={(updated) => {
          setSelected(updated);
          setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }}
      />
    );
  }

  // Empty state
  if (agents.length === 0 && !loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold flex items-center gap-2">
                <Zap className="h-6 w-6 text-primary" />
                Agents
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Pure-executor automations. One trigger, one SOP, one job — every time, the same way.
              </p>
            </div>
            <Button onClick={() => setShowWizard(true)} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" /> Create agent
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <InfoCard icon={Workflow} title="Trigger → SOP → Output" body="Every agent has a single trigger (event, schedule, threshold, or manual), a deterministic SOP, and a defined output." />
            <InfoCard icon={ShieldCheck} title="Safety boundary" body="Each agent has explicit can-do, cannot-do, and an escalation path that pings the supervising Employee when something exceeds its scope." />
            <InfoCard icon={Zap} title="Supervised by an Employee" body="Agents don't think strategically — that's the Employee's job. Each agent reports to one Employee that owns the broader domain." />
          </div>

          <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Zap className="h-10 w-10 text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No agents yet</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Build your first agent: pick a trigger, list the steps, set hard safety limits, and assign a supervising employee.
            </p>
            <Button onClick={() => setShowWizard(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Build your first agent
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Agents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {agents.length} agent{agents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button onClick={() => setShowWizard(true)} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Create agent
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="group relative p-5 rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all flex flex-col gap-2"
              >
                <button
                  onClick={() => setSelected(agent)}
                  className="absolute inset-0 rounded-xl"
                  aria-label={`Open ${agent.name}`}
                />
                <div className="flex items-start justify-between gap-2 relative">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Zap className="h-4 w-4 text-primary shrink-0" />
                    <p className="font-semibold text-sm truncate">{agent.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {agent.status !== "draft" && (
                      <Badge
                        className={cn(
                          "capitalize text-[10px]",
                          agent.status === "active" && "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
                          agent.status === "paused" && "bg-amber-500/10 text-amber-600 border-amber-500/20",
                        )}
                      >
                        {STATUS_LABEL[agent.status]}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onSelect={() => { setRenameValue(agent.name); setRenaming(agent); }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleting(agent)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 relative pointer-events-none">{agent.description}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground relative pointer-events-none">
                  <span className="flex items-center gap-1">
                    <PlayCircle className="h-3 w-3" />
                    {agent.run_count} run{agent.run_count !== 1 ? "s" : ""}
                  </span>
                  {agent.last_run_at && (
                    <span className="flex items-center gap-1 truncate">
                      <Clock className="h-3 w-3" />
                      {new Date(agent.last_run_at).toLocaleDateString()}
                    </span>
                  )}
                  <span className="ml-auto truncate text-[10px]">
                    {TRIGGER_TYPE_LABEL[agent.trigger_type].split(" — ")[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename agent</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Agent name"
            onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenaming(null)}>Cancel</Button>
            <Button onClick={handleRename} disabled={renameSaving || !renameValue.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleting?.name}" and its run history. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="p-5 rounded-xl border border-border/60 bg-card">
      <Icon className="h-5 w-5 text-primary mb-3" />
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
