import { Link, Plus, Shield, Users, X } from "lucide-react";
import { SettingsView } from "@/components/database/SettingsView";
import { ConnectionsView } from "@/components/database/ConnectionsView";
import type { AIEmployee } from "@/components/database/EmployeesView";

export function AgentChatSettingsModal({
  open,
  onClose,
  agents,
  selectedAgent,
  setSelectedAgent,
  brands,
  settingsTab,
  setSettingsTab,
  employees,
  onDeleteEmployee,
  onUpdateEmployee,
  onOpenAddEmployee,
}: {
  open: boolean;
  onClose: () => void;
  agents: { id: string; name: string }[];
  selectedAgent: string;
  setSelectedAgent: (v: string) => void;
  brands: { id: string; agentName?: string; name?: string }[];
  settingsTab: string;
  setSettingsTab: (v: string) => void;
  employees: AIEmployee[];
  onDeleteEmployee: (id: string) => void;
  onUpdateEmployee: (emp: AIEmployee) => void;
  onOpenAddEmployee: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
      <div className="relative w-full sm:max-w-4xl h-[85vh] sm:h-[600px] bg-background shadow-2xl border border-border rounded-t-2xl sm:rounded-2xl z-50 animate-in slide-in-from-bottom sm:zoom-in-95 fade-in duration-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-[#fcfcfd]">
          <div className="w-8" />
          <div className="flex items-center gap-2 sm:gap-3 flex-1 justify-center">
            <h3 className="text-base sm:text-lg font-bold text-foreground">Settings</h3>
            <span className="text-muted-foreground">·</span>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="border border-border rounded-lg px-2 sm:px-3 py-1.5 text-sm font-medium text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer max-w-[140px] sm:max-w-none truncate bg-muted"
            >
              {agents.map((agent) => (
                <option key={agent.id} value={agent.name}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col sm:flex-row">
          <div className="sm:w-64 border-b sm:border-b-0 sm:border-r border-border p-2 sm:p-4 flex sm:flex-col gap-1 overflow-x-auto sm:overflow-y-auto shrink-0 bg-[#fcfcfd]">
            {(
              [
                { key: "safety", label: "Safety", icon: Shield },
                { key: "employees", label: "Employees", icon: Users },
                { key: "connections", label: "Connections", icon: Link },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSettingsTab(key)}
                className={`text-left px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 sm:gap-3 whitespace-nowrap ${
                  settingsTab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 sm:p-8 overflow-y-auto flex flex-col bg-[#fcfcfd]">
            {settingsTab === "safety" && (
              <div className="flex-1">
                {(() => {
                  const activeBrand = brands.find((b) => (b.agentName || b.name || "AI") === selectedAgent);
                  if (activeBrand) {
                    return <SettingsView activeBrandId={activeBrand.id} />;
                  }
                  return (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <p>Select an agent to configure safety settings.</p>
                    </div>
                  );
                })()}
              </div>
            )}

            {settingsTab === "employees" && (
              <div className="space-y-6 flex-1">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-4">Manage Employees</h4>
                  <div className="space-y-4">
                    {employees.map((emp) => (
                      <div key={emp.id} className="border border-border p-4 rounded-xl space-y-3 bg-muted">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <input
                              type="text"
                              defaultValue={emp.name}
                              onBlur={(e) => onUpdateEmployee({ ...emp, name: e.target.value })}
                              className="font-semibold text-foreground bg-transparent border-none p-0 focus:ring-0 w-full placeholder-muted-foreground outline-none"
                              placeholder="Employee Name"
                            />
                            <input
                              type="text"
                              defaultValue={emp.role}
                              onBlur={(e) => onUpdateEmployee({ ...emp, role: e.target.value })}
                              className="text-xs text-muted-foreground bg-transparent border-none p-0 focus:ring-0 w-full mt-0.5 placeholder-muted-foreground outline-none"
                              placeholder="Role / Title"
                            />
                          </div>
                          <button type="button" onClick={() => onDeleteEmployee(emp.id)} className="text-destructive hover:text-destructive/80 p-1 flex-shrink-0">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAddEmployee}
                    className="mt-4 w-full py-2.5 border border-dashed border-border text-muted-foreground rounded-xl text-sm font-medium hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Employee
                  </button>
                </div>
              </div>
            )}

            {settingsTab === "connections" && (
              <div className="flex-1 -mx-4 -mt-2">
                <ConnectionsView />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
