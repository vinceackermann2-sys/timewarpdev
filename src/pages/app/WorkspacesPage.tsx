import { useNavigate } from "react-router-dom";
import { WorkspacesView } from "@/components/database/WorkspacesView";

/**
 * WorkspacesPage — /app/workspaces
 *
 * Lists workspaces and lets the user manage members/invitations.
 */
export default function WorkspacesPage() {
  const navigate = useNavigate();
  return <WorkspacesView onBack={() => navigate("/app/dna")} />;
}
