import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Skeleton } from "@/components/ui/skeleton";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { EmployeeDetailView } from "./EmployeeDetailView";
import type { AIEmployee } from "./EmployeesView";
import type { EmployeesTab } from "./DatabaseSidebar";
import { cn } from "@/lib/utils";

interface EmployeesHubViewProps {
  activeTab: EmployeesTab;
  onTabChange: (tab: EmployeesTab) => void;
  onCreateWithTimeWarp: (kind: "agent" | "employee") => void;
}

export function EmployeesHubView({ activeTab, onTabChange, onCreateWithTimeWarp }: EmployeesHubViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();
  const [items, setItems] = useState<AIEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      let query = supabase
        .from("ai_employees" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (activeWorkspaceId) query = query.eq("workspace_id", activeWorkspaceId);
      else query = query.eq("user_id", user.id);
      const { data, error } = await query;
      if (!error && data) setItems(data as unknown as AIEmployee[]);
    } catch (e) {
      console.warn("Failed to load employees:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    load();
    setSelectedId(null);
    setSearch("");
    setSearchOpen(false);
  }, [activeWorkspaceId, authLoading, workspaceLoading, user, activeTab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.role.toLowerCase().includes(q) ||
        (it.sop_title || "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const selected = items.find((i) => i.id === selectedId) || null;

  const labelPlural = activeTab === "agents" ? "Agents" : "Employees";
  const labelSingular = activeTab === "agents" ? "agent" : "employee";

  const handleDelete = async (id: string) => {
    await supabase.from("ai_employees" as any).delete().eq("id", id);
    setSelectedId(null);
    load();
  };

  return (
    <div className="flex h-full min-h-0 w-full">
      {/* Left customize side menu */}
      <aside className="w-56 shrink-0 border-r border-border/60 bg-background p-3">
        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Customize
        </p>
        <nav className="mt-1 flex flex-col gap-0.5">
          <button
            onClick={() => onTabChange("agents")}
            className={cn(
              "w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
              activeTab === "agents" ? "font-medium bg-[#f3f5f7] text-[#101828]" : "hover:bg-muted/50",
            )}
          >
            Agents
          </button>
          <button
            onClick={() => onTabChange("employees")}
            className={cn(
              "w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors",
              activeTab === "employees" ? "font-medium bg-[#f3f5f7] text-[#101828]" : "hover:bg-muted/50",
            )}
          >
            Employees
          </button>
        </nav>
      </aside>

      {/* Middle list sidebar */}
      <aside className="w-64 shrink-0 border-r border-border/60 bg-background flex flex-col min-h-0">
        <div className="px-3 pt-3 pb-2 flex items-center justify-between gap-2">
          {searchOpen ? (
            <div className="flex-1 flex items-center gap-1 rounded-md border border-border/60 bg-white px-2 h-8">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${labelPlural.toLowerCase()}...`}
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearch(""); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your {labelPlural}
              </p>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setSearchOpen(true)}
                  className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Search ${labelPlural.toLowerCase()}`}
                  title="Search"
                >
                  <Search className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onCreateWithTimeWarp(activeTab === "agents" ? "agent" : "employee")}
                  className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`Create ${labelSingular} with TimeWarp`}
                  title={`Create ${labelSingular} with TimeWarp`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
          {isLoading ? (
            <div className="space-y-1.5 px-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-6 text-center">
              <p className="text-xs text-muted-foreground mb-3">
                {items.length === 0
                  ? `No ${labelPlural.toLowerCase()} yet.`
                  : `No ${labelPlural.toLowerCase()} match "${search}".`}
              </p>
              {items.length === 0 && (
                <button
                  onClick={() => onCreateWithTimeWarp(activeTab === "agents" ? "agent" : "employee")}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  Create with TimeWarp
                </button>
              )}
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((it) => {
                const isSel = it.id === selectedId;
                return (
                  <li key={it.id}>
                    <button
                      onClick={() => setSelectedId(it.id)}
                      className={cn(
                        "w-full text-left flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors",
                        isSel ? "bg-[#f3f5f7] text-[#101828]" : "hover:bg-muted/50",
                      )}
                    >
                      <BusinessBrainOrb size={24} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm truncate", isSel ? "font-medium" : "")}>{it.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{it.role}</p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right detail panel */}
      <main className="flex-1 min-h-0 overflow-y-auto bg-background">
        {selected ? (
          <EmployeeDetailView
            employee={selected}
            onBack={() => setSelectedId(null)}
            onDelete={handleDelete}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <BusinessBrainOrb size={72} className="mb-5 opacity-80" />
            <h2 className="text-xl font-semibold mb-1.5">
              {items.length === 0
                ? `No ${labelPlural.toLowerCase()} yet`
                : `Select a ${labelSingular}`}
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mb-5">
              {items.length === 0
                ? `Create your first ${labelSingular} with TimeWarp — describe what you want done and TimeWarp will set it up for you.`
                : `Choose a ${labelSingular} from the list to view its details, SOP, and activity.`}
            </p>
            <button
              onClick={() => onCreateWithTimeWarp(activeTab === "agents" ? "agent" : "employee")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              Create {labelSingular} with TimeWarp
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
