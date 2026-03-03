import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";

export interface WorkspaceMember {
  id: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: string;
  createdAt: string;
  token: string;
}

export function useWorkspace() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setIsLoading(false); return; }

    // Get user's workspace (they should have one from the trigger)
    const { data: memberRow } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", session.user.id)
      .limit(1)
      .maybeSingle();

    if (!memberRow) {
      // Create workspace if trigger didn't fire (existing users)
      const newWorkspaceId = crypto.randomUUID();
      const { error: wsError } = await supabase
        .from("workspaces")
        .insert({ id: newWorkspaceId, name: "My Workspace", created_by: session.user.id });

      if (wsError) {
        console.error("workspace create failed", wsError);
        setIsLoading(false);
        return;
      }

      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({ workspace_id: newWorkspaceId, user_id: session.user.id, role: "owner" });

      if (memberError) {
        console.error("workspace member create failed", memberError);
        setIsLoading(false);
        return;
      }

      setWorkspaceId(newWorkspaceId);
      setMembers([{
        id: "self",
        userId: session.user.id,
        email: "you",
        role: "owner",
        joinedAt: new Date().toISOString(),
      }]);
      setInvitations([]);
      setIsLoading(false);
      return;
    }

    setWorkspaceId(memberRow.workspace_id);

    // Load members
    const { data: membersData } = await supabase
      .from("workspace_members")
      .select("id, user_id, role, joined_at")
      .eq("workspace_id", memberRow.workspace_id);

    if (membersData) {
      // Get emails for members via auth - we use current user email and show others as user IDs
      const { data: { session: sess } } = await supabase.auth.getSession();
      const mapped: WorkspaceMember[] = membersData.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        email: m.user_id === sess?.user?.id ? (sess.user.email || "you") : m.user_id,
        role: m.role,
        joinedAt: m.joined_at,
      }));
      setMembers(mapped);
    }

    // Load invitations
    const { data: invData } = await supabase
      .from("workspace_invitations")
      .select("id, email, role, status, created_at, token")
      .eq("workspace_id", memberRow.workspace_id)
      .eq("status", "pending");

    if (invData) {
      setInvitations(
        invData.map((inv: any) => ({
          id: inv.id,
          email: inv.email,
          role: inv.role,
          status: inv.status,
          createdAt: inv.created_at,
          token: inv.token,
        }))
      );
    }

    setIsLoading(false);
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const sendInvite = useCallback(async (email: string, role: WorkspaceRole) => {
    if (!workspaceId) throw new Error("No workspace");

    const { data, error } = await supabase.functions.invoke("send-workspace-invite", {
      body: { email, role, workspaceId },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    await loadWorkspace();
    return data;
  }, [workspaceId, loadWorkspace]);

  const removeMember = useCallback(async (memberId: string) => {
    await supabase.from("workspace_members").delete().eq("id", memberId);
    await loadWorkspace();
  }, [loadWorkspace]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: WorkspaceRole) => {
    await supabase.from("workspace_members").update({ role: newRole }).eq("id", memberId);
    await loadWorkspace();
  }, [loadWorkspace]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    await supabase.from("workspace_invitations").delete().eq("id", invitationId);
    await loadWorkspace();
  }, [loadWorkspace]);

  return {
    workspaceId,
    members,
    invitations,
    isLoading,
    sendInvite,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    reload: loadWorkspace,
  };
}
