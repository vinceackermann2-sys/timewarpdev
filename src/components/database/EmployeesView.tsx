import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Plus, Loader2 } from "lucide-react";
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
  const { activeWorkspaceId } = useWorkspace();

  const loadEmployees = async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setIsLoading(false); return; }

    let query = supabase
      .from("ai_employees" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (activeWorkspaceId) {
      query = query.eq("workspace_id", activeWorkspaceId);
    } else {
      query = query.eq("user_id", session.user.id);
    }

    const { data, error } = await query;
    if (!error && data) {
      setEmployees(data as unknown as AIEmployee[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadEmployees();
  }, [activeWorkspaceId]);

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
    <div className="flex-1 overflow-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">My Employees</h1>
          <p className="text-sm text-muted-foreground">{employees.length} AI employee{employees.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setShowWizard(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Employee
        </Button>
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
