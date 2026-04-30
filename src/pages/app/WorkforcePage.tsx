import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EmployeesHubView } from "@/components/database/EmployeesHubView";
import type { EmployeesTab } from "@/components/database/DatabaseSidebar";

/**
 * WorkforcePage — /app/workforce
 *
 * Unified hub for AI Agents and AI Employees. Renders EmployeesHubView,
 * which provides:
 *   • a "Customize" left-rail to switch between Agents and Employees
 *   • a middle list of items (with search + create-with-TimeWarp button)
 *   • a right detail panel
 *
 * Creating a new agent/employee navigates to the Assistant chat with a
 * prefilled prompt that triggers the corresponding skill (agents.md or
 * employees.md).
 */
export default function WorkforcePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab: EmployeesTab =
    searchParams.get("tab") === "agents" ? "agents" : "employees";
  const [activeTab, setActiveTab] = useState<EmployeesTab>(initialTab);

  useEffect(() => {
    const fromUrl = searchParams.get("tab") === "agents" ? "agents" : "employees";
    if (fromUrl !== activeTab) setActiveTab(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (tab: EmployeesTab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const handleCreateWithTimeWarp = (kind: "agent" | "employee") => {
    const initialMessage =
      kind === "agent"
        ? "I want to create an agent — walk me through the trigger, the SOP, the integrations it needs, and the safety boundary."
        : "I want to create an employee — help me define the domain lens, what they own vs. advise on vs. don't touch, and the agents they should supervise.";
    navigate("/app/assistant", { state: { initialMessage } });
  };

  return (
    <EmployeesHubView
      activeTab={activeTab}
      onTabChange={handleTabChange}
      onCreateWithTimeWarp={handleCreateWithTimeWarp}
    />
  );
}
