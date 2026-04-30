import { EmployeesView } from "@/components/database/EmployeesView";

/**
 * EmployeesPage — /app/employees
 *
 * AI Employees list + creation wizard.  EmployeesView already handles its
 * own internal navigation between list / wizard / detail.
 */
export default function EmployeesPage() {
  return <EmployeesView />;
}
