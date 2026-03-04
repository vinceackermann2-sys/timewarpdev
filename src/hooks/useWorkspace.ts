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

    // Check if there's a preferred workspace (set after accepting an invite)
    const preferredWsId = localStorage.getItem("preferred_workspace_id");

    let memberRow: { workspace_id: string } | null = null;

    if (preferredWsId) {
      // Try to load the preferred workspace first
      const { data } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", session.user.id)
        .eq("workspace_id", preferredWsId)
        .maybeSingle();
      memberRow = data;
    }

    if (!memberRow) {
      // Fallback: prefer workspaces where user is NOT owner (i.e., shared workspaces)
      const { data: allMemberships } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", session.user.id);

      if (allMemberships && allMemberships.length > 0) {
        // Prefer non-owner workspace (shared), fallback to any
        const shared = allMemberships.find(m => m.role !== "owner");
        memberRow = shared || allMemberships[0];
      }
    }

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

    // Load members with emails using security definer function
    const { data: membersData } = await supabase.rpc("get_workspace_members", {
      _workspace_id: memberRow.workspace_id,
    });

    if (membersData) {
      const mapped: WorkspaceMember[] = (membersData as any[]).map((m) => ({
        id: m.id,
        userId: m.user_id,
        email: m.email || "unknown",
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
