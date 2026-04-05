import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAuth } from "@/hooks/useAuth";
import { Plus, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";
import { CreateEmployeeWizard } from "./CreateEmployeeWizard";
import { EmployeeDetailView } from "./EmployeeDetailView";

export interface AIEmployee {
  id: string;
  name: string;
  role: string;
  status: string;
  sop_title: string | null;
  sop_purpose: string | null;
  sop_scope: string | null;
  sop_responsibilities: any[];
  sop_definitions: any[];
  sop_materials: any[];
  sop_procedure: any[];
  sop_safety_notes: string | null;
  sop_documentation: string | null;
  sop_revision_history: any[];
  orb_colors: { c1: string; c2: string; c3: string };
  created_at: string;
  updated_at: string;
  workspace_id: string | null;
  user_id: string;
  linked_business_id: string | null;
}

const ORB_PALETTES = [
  { c1: "oklch(75% 0.15 350)", c2: "oklch(80% 0.12 200)", c3: "oklch(78% 0.14 280)" },
  { c1: "oklch(72% 0.18 140)", c2: "oklch(76% 0.14 80)", c3: "oklch(70% 0.16 160)" },
  { c1: "oklch(78% 0.16 30)", c2: "oklch(74% 0.14 60)", c3: "oklch(80% 0.12 10)" },
  { c1: "oklch(70% 0.18 260)", c2: "oklch(75% 0.14 300)", c3: "oklch(72% 0.16 240)" },
  { c1: "oklch(82% 0.12 90)", c2: "oklch(78% 0.10 120)", c3: "oklch(76% 0.14 60)" },
];

export function EmployeesView() {
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<AIEmployee | null>(null);
  const { activeWorkspaceId, isLoading: workspaceLoading } = useWorkspace();
  const { user, isLoading: authLoading } = useAuth();

  const loadEmployees = async () => {
    if (!user) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      let query = supabase
        .from("ai_employees" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (activeWorkspaceId) {
        query = query.eq("workspace_id", activeWorkspaceId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await Promise.race([
        query,
        new Promise<{ data: null; error: Error }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 8000)
        ),
      ]);

      if (!error && data) {
        setEmployees(data as unknown as AIEmployee[]);
      }
    } catch (e) {
      console.warn("Failed to load employees:", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (authLoading || workspaceLoading) return;
    loadEmployees();
  }, [activeWorkspaceId, authLoading, workspaceLoading, user]);

  if (authLoading || workspaceLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    );
  }

  const handleCreated = () => {
    setShowWizard(false);
    loadEmployees();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ai_employees" as any).delete().eq("id", id);
    setSelectedEmployee(null);
    loadEmployees();
  };

  if (selectedEmployee) {
    return (
      <EmployeeDetailView
        employee={selectedEmployee}
        onBack={() => { setSelectedEmployee(null); loadEmployees(); }}
        onDelete={handleDelete}
      />
    );
  }

  if (showWizard) {
    return (
      <CreateEmployeeWizard
        onCancel={() => setShowWizard(false)}
        onCreated={handleCreated}
        orbPalettes={ORB_PALETTES}
      />
    );
  }

  if (isLoading && employees.length > 0) {
    const skeletonCount = employees.length;
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-xl border border-border/60 bg-card flex flex-col items-center gap-3 animate-fade-in"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: "both" }}
            >
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="text-center space-y-1.5 w-full">
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-3 w-16 mx-auto" />
              </div>
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (employees.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <BusinessBrainOrb size={96} className="mb-6" />
        <h2 className="text-2xl font-semibold mb-2">No AI Employees yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create your first AI employee. Give them a name, role, and a Standard Operating Procedure — they'll execute tasks based on your SOP.
        </p>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
      </div>
    );
  }

  // List view
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} AI employee{employees.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <a href="https://microsoftedge.microsoft.com/addons/detail/timewarp-%E2%80%93-ai-ceo/fajgkgjioehbiccafonfbdkjhoedceim" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Get Extension
            </a>
          </Button>
          <Button onClick={() => setShowWizard(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {employees.map((emp) => (
          <button
            key={emp.id}
            onClick={() => setSelectedEmployee(emp)}
            className="group p-5 rounded-xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all text-left flex flex-col items-center gap-3"
          >
            <BusinessBrainOrb
              size={56}
              className="group-hover:scale-105 transition-transform"
            />
            <div className="text-center">
              <p className="font-medium text-sm">{emp.name}</p>
              <p className="text-xs text-muted-foreground">{emp.role}</p>
            </div>
            {emp.sop_title && (
              <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full truncate max-w-full">
                {emp.sop_title}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
