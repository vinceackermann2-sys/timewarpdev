import type { EmployeesTab } from "./DatabaseSidebar";

interface EmployeesHubViewProps {
  activeTab: EmployeesTab;
  onTabChange: (tab: EmployeesTab) => void;
}

export function EmployeesHubView({ activeTab, onTabChange }: EmployeesHubViewProps) {
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
            className={`w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors ${
              activeTab === "agents"
                ? "text-primary font-medium bg-[#f3f5f7]"
                : "hover:bg-muted/50"
            }`}
          >
            Agents
          </button>
          <button
            onClick={() => onTabChange("employees")}
            className={`w-full text-left text-sm py-1.5 px-2 rounded-md transition-colors ${
              activeTab === "employees"
                ? "text-primary font-medium bg-[#f3f5f7]"
                : "hover:bg-muted/50"
            }`}
          >
            Employees
          </button>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-y-auto p-8">
        <h1 className="text-2xl font-semibold mb-2">
          {activeTab === "agents" ? "Agents" : "Employees"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeTab === "agents"
            ? "Manage your AI agents."
            : "Manage your employees."}
        </p>
      </main>
    </div>
  );
}
