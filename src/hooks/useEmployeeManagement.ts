import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AIEmployee } from "@/components/database/EmployeesView";

export function useEmployeeManagement(user: User | null, activeWorkspaceId: string | null) {
  const [employees, setEmployees] = useState<AIEmployee[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addEmployeePrompt, setAddEmployeePrompt] = useState("");
  const [isGeneratingEmployee, setIsGeneratingEmployee] = useState(false);
  const [generatedEmployee, setGeneratedEmployee] = useState<Record<string, unknown> | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!user) return;
    let query = supabase.from("ai_employees" as any).select("*").order("created_at", { ascending: false });
    if (activeWorkspaceId) query = query.eq("workspace_id", activeWorkspaceId);
    else query = query.eq("user_id", user.id);
    const { data } = await query;
    if (data) setEmployees(data as unknown as AIEmployee[]);
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const handleDeleteEmployee = async (id: string) => {
    await supabase.from("ai_employees" as any).delete().eq("id", id);
    void loadEmployees();
  };

  const handleUpdateEmployee = async (emp: AIEmployee) => {
    await supabase
      .from("ai_employees" as any)
      .update({ name: emp.name, role: emp.role, sop_purpose: emp.sop_purpose } as any)
      .eq("id", emp.id);
    void loadEmployees();
  };

  const handleAddEmployee = async (employeeData: {
    name: string;
    role: string;
    sop_title?: string;
    sop_purpose?: string;
    sop_scope?: string;
    sop_procedure?: string[];
    sop_responsibilities?: string[];
    sop_safety_notes?: string;
  }) => {
    if (!user) return;
    await supabase.from("ai_employees" as any).insert({
      user_id: user.id,
      workspace_id: activeWorkspaceId || null,
      name: employeeData.name,
      role: employeeData.role,
      sop_title: employeeData.sop_title || null,
      sop_purpose: employeeData.sop_purpose || null,
      sop_scope: employeeData.sop_scope || null,
      sop_procedure: employeeData.sop_procedure || [],
      sop_responsibilities: employeeData.sop_responsibilities || [],
      sop_safety_notes: employeeData.sop_safety_notes || null,
      status: "active",
    } as any);
    void loadEmployees();
  };

  const handleGenerateEmployee = async () => {
    if (!addEmployeePrompt.trim()) return;
    setIsGeneratingEmployee(true);
    setGeneratedEmployee(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in first");
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-employee`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ prompt: addEmployeePrompt.trim() }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        toast.error(err.error || "Failed to generate employee");
        return;
      }
      const data = await response.json();
      setGeneratedEmployee(data.employee);
    } catch {
      toast.error("Failed to generate employee");
    } finally {
      setIsGeneratingEmployee(false);
    }
  };

  const handleConfirmEmployee = async () => {
    if (!generatedEmployee) return;
    const name = String((generatedEmployee as { name?: string }).name || "Employee");
    await handleAddEmployee(generatedEmployee as Parameters<typeof handleAddEmployee>[0]);
    setShowAddEmployee(false);
    setAddEmployeePrompt("");
    setGeneratedEmployee(null);
    toast.success(`${name} has been created!`);
  };

  return {
    employees,
    loadEmployees,
    handleDeleteEmployee,
    handleUpdateEmployee,
    handleAddEmployee,
    showAddEmployee,
    setShowAddEmployee,
    addEmployeePrompt,
    setAddEmployeePrompt,
    isGeneratingEmployee,
    generatedEmployee,
    setGeneratedEmployee,
    handleGenerateEmployee,
    handleConfirmEmployee,
  };
}
