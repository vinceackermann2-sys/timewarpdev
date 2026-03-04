import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type WorkspaceRole = "owner" | "editor" | "viewer";

export interface WorkspaceInfo {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRole;
  memberCount: number;
  createdAt: string;
}

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
  const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setIsLoading(false); return; }

    // Use the RPC to get all workspaces
    const { data: wsData, error } = await supabase.rpc("get_user_workspaces", {
      _user_id: session.user.id,
    });

    if (error || !wsData || (wsData as any[]).length === 0) {
      // Create default workspace if none exist
      const newWorkspaceId = crypto.randomUUID();
      const { error: wsError } = await supabase
        .from("workspaces")
        .insert({ id: newWorkspaceId, name: "My Workspace", created_by: session.user.id });

      if (!wsError) {
        await supabase
          .from("workspace_members")
          .insert({ workspace_id: newWorkspaceId, user_id: session.user.id, role: "owner" });

        setWorkspaces([{
          workspaceId: newWorkspaceId,
          workspaceName: "My Workspace",
          role: "owner",
          memberCount: 1,
          createdAt: new Date().toISOString(),
        }]);
      }
      setIsLoading(false);
      return;
    }

    const mapped: WorkspaceInfo[] = (wsData as any[]).map((w) => ({
      workspaceId: w.workspace_id,
      workspaceName: w.workspace_name,
      role: w.role as WorkspaceRole,
      memberCount: Number(w.member_count),
      createdAt: w.created_at,
    }));

    setWorkspaces(mapped);

    // Auto-select preferred workspace or first owned
    const preferredId = localStorage.getItem("preferred_workspace_id");
    if (preferredId && mapped.some(w => w.workspaceId === preferredId)) {
      setActiveWorkspaceId(preferredId);
    }

    setIsLoading(false);
  }, []);

  // Load members for the active workspace
  const loadMembers = useCallback(async (wsId: string) => {
    const { data: membersData } = await supabase.rpc("get_workspace_members", {
      _workspace_id: wsId,
    });

    if (membersData) {
      setMembers((membersData as any[]).map((m) => ({
        id: m.id,
        userId: m.user_id,
        email: m.email || "unknown",
        role: m.role as WorkspaceRole,
        joinedAt: m.joined_at,
      })));
    }

    const { data: invData } = await supabase
      .from("workspace_invitations")
      .select("id, email, role, status, created_at, token")
      .eq("workspace_id", wsId)
      .eq("status", "pending");

    if (invData) {
      setInvitations(invData.map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.created_at,
        token: inv.token,
      })));
    }
  }, []);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadMembers(activeWorkspaceId);
    } else {
      setMembers([]);
      setInvitations([]);
    }
  }, [activeWorkspaceId, loadMembers]);

  const selectWorkspace = useCallback((wsId: string | null) => {
    setActiveWorkspaceId(wsId);
    if (wsId) {
      localStorage.setItem("preferred_workspace_id", wsId);
    } else {
      localStorage.removeItem("preferred_workspace_id");
    }
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Not authenticated");

    const newId = crypto.randomUUID();
    const { error: wsError } = await supabase
      .from("workspaces")
      .insert({ id: newId, name, created_by: session.user.id });
    if (wsError) throw wsError;

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: newId, user_id: session.user.id, role: "owner" });

    await loadWorkspaces();
    return newId;
  }, [loadWorkspaces]);

  const sendInvite = useCallback(async (email: string, role: WorkspaceRole) => {
    if (!activeWorkspaceId) throw new Error("No workspace selected");
    const { data, error } = await supabase.functions.invoke("send-workspace-invite", {
      body: { email, role, workspaceId: activeWorkspaceId },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    await loadMembers(activeWorkspaceId);
    return data;
  }, [activeWorkspaceId, loadMembers]);

  const removeMember = useCallback(async (memberId: string) => {
    await supabase.from("workspace_members").delete().eq("id", memberId);
    if (activeWorkspaceId) await loadMembers(activeWorkspaceId);
  }, [activeWorkspaceId, loadMembers]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: WorkspaceRole) => {
    await supabase.from("workspace_members").update({ role: newRole }).eq("id", memberId);
    if (activeWorkspaceId) await loadMembers(activeWorkspaceId);
  }, [activeWorkspaceId, loadMembers]);

  const cancelInvitation = useCallback(async (invitationId: string) => {
    await supabase.from("workspace_invitations").delete().eq("id", invitationId);
    if (activeWorkspaceId) await loadMembers(activeWorkspaceId);
  }, [activeWorkspaceId, loadMembers]);

  const activeWorkspace = workspaces.find(w => w.workspaceId === activeWorkspaceId) || null;

  return {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    selectWorkspace,
    createWorkspace,
    members,
    invitations,
    isLoading,
    sendInvite,
    removeMember,
    updateMemberRole,
    cancelInvitation,
    reload: loadWorkspaces,
  };
}
