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

  const normalizeWorkspaceRole = (role: string): WorkspaceRole => {
    if (role === "owner" || role === "editor" || role === "viewer") return role;
    return "viewer";
  };

  const loadWorkspaces = useCallback(async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setIsLoading(false); return; }

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

        const ws: WorkspaceInfo = {
          workspaceId: newWorkspaceId,
          workspaceName: "My Workspace",
          role: "owner",
          memberCount: 1,
          createdAt: new Date().toISOString(),
        };
        setWorkspaces([ws]);
        setActiveWorkspaceId(newWorkspaceId);
        localStorage.setItem("preferred_workspace_id", newWorkspaceId);
      }
      setIsLoading(false);
      return;
    }

    const mapped: WorkspaceInfo[] = (wsData as any[]).map((w) => ({
      workspaceId: w.workspace_id,
      workspaceName: w.workspace_name,
      role: normalizeWorkspaceRole(w.role),
      memberCount: Number(w.member_count),
      createdAt: w.created_at,
    }));

    setWorkspaces(mapped);

    // Auto-select: preferred → first owned → first available
    const preferredId = localStorage.getItem("preferred_workspace_id");
    const currentActive = preferredId && mapped.some(w => w.workspaceId === preferredId)
      ? preferredId
      : (mapped.find(w => w.role === "owner")?.workspaceId || mapped[0]?.workspaceId || null);

    if (currentActive) {
      setActiveWorkspaceId(currentActive);
      localStorage.setItem("preferred_workspace_id", currentActive);
    }

    setIsLoading(false);
  }, []);

  const fetchWorkspaceMembersData = useCallback(async (wsId: string) => {
    const { data: membersData, error: membersError } = await supabase.rpc("get_workspace_members", {
      _workspace_id: wsId,
    });

    let mappedMembers: WorkspaceMember[] = membersData
      ? (membersData as any[]).map((m) => ({
          id: m.id,
          userId: m.user_id,
          email: m.email || "unknown",
          role: normalizeWorkspaceRole(m.role),
          joinedAt: m.joined_at,
        }))
      : [];

    // Fallback for cases where RPC returns empty due session/RPC edge cases
    if (mappedMembers.length === 0) {
      const { data: fallbackMembers, error: fallbackError } = await supabase
        .from("workspace_members")
        .select("id, user_id, role, joined_at")
        .eq("workspace_id", wsId);

      if (!fallbackError && fallbackMembers?.length) {
        mappedMembers = fallbackMembers.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          email: "unknown",
          role: normalizeWorkspaceRole(m.role),
          joinedAt: m.joined_at,
        }));
      }
    }

    if (membersError) {
      console.warn("Failed to load workspace members via RPC:", membersError.message);
    }

    const { data: invData } = await supabase
      .from("workspace_invitations")
      .select("id, email, role, status, created_at, token")
      .eq("workspace_id", wsId)
      .eq("status", "pending");

    const mappedInvitations: WorkspaceInvitation[] = invData
      ? invData.map((inv: any) => ({
          id: inv.id,
          email: inv.email,
          role: normalizeWorkspaceRole(inv.role),
          status: inv.status,
          createdAt: inv.created_at,
          token: inv.token,
        }))
      : [];

    return { members: mappedMembers, invitations: mappedInvitations };
  }, []);

  // Load members for a specific workspace
  const loadMembers = useCallback(async (wsId: string) => {
    const data = await fetchWorkspaceMembersData(wsId);
    setMembers(data.members);
    setInvitations(data.invitations);
  }, [fetchWorkspaceMembersData]);

  // Load members for a given workspace without changing global state (for dialog)
  const loadMembersForWorkspace = useCallback(async (wsId: string) => {
    return fetchWorkspaceMembersData(wsId);
  }, [fetchWorkspaceMembersData]);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadMembers(activeWorkspaceId);
    } else {
      setMembers([]);
      setInvitations([]);
    }
  }, [activeWorkspaceId, loadMembers]);

  const selectWorkspace = useCallback((wsId: string) => {
    setActiveWorkspaceId(wsId);
    localStorage.setItem("preferred_workspace_id", wsId);
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

  const sendInvite = useCallback(async (email: string, role: WorkspaceRole, wsId?: string) => {
    const targetWsId = wsId || activeWorkspaceId;
    if (!targetWsId) throw new Error("No workspace selected");
    const { data, error } = await supabase.functions.invoke("send-workspace-invite", {
      body: { email, role, workspaceId: targetWsId },
    });
    if (error) throw error;
    // Treat "already invited" as success, not an error
    if (data?.error && data?.error !== "Already a member") throw new Error(data.error);
    if (data?.alreadyInvited) {
      // Return data normally — caller can check alreadyInvited flag for messaging
      if (targetWsId === activeWorkspaceId) await loadMembers(activeWorkspaceId);
      return data;
    }
    if (data?.error === "Already a member") throw new Error(data.error);
    if (targetWsId === activeWorkspaceId) await loadMembers(activeWorkspaceId);
    return data;
  }, [activeWorkspaceId, loadMembers]);

  const removeMember = useCallback(async (memberId: string, wsId?: string) => {
    await supabase.from("workspace_members").delete().eq("id", memberId);
    const targetWsId = wsId || activeWorkspaceId;
    if (targetWsId) await loadMembers(targetWsId);
  }, [activeWorkspaceId, loadMembers]);

  const updateMemberRole = useCallback(async (memberId: string, newRole: WorkspaceRole, wsId?: string) => {
    await supabase.from("workspace_members").update({ role: newRole }).eq("id", memberId);
    const targetWsId = wsId || activeWorkspaceId;
    if (targetWsId) await loadMembers(targetWsId);
  }, [activeWorkspaceId, loadMembers]);

  const cancelInvitation = useCallback(async (invitationId: string, wsId?: string) => {
    await supabase.from("workspace_invitations").delete().eq("id", invitationId);
    const targetWsId = wsId || activeWorkspaceId;
    if (targetWsId) await loadMembers(targetWsId);
  }, [activeWorkspaceId, loadMembers]);

  const renameWorkspace = useCallback(async (wsId: string, newName: string) => {
    const { error } = await supabase.from("workspaces").update({ name: newName }).eq("id", wsId);
    if (error) throw error;
    await loadWorkspaces();
  }, [loadWorkspaces]);

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
    renameWorkspace,
    loadMembersForWorkspace,
    reload: loadWorkspaces,
  };
}
