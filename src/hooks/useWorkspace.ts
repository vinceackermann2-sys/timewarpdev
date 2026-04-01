import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type WorkspaceRole = "owner" | "editor";

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

const normalizeWorkspaceRole = (role: string): WorkspaceRole => {
  if (role === "owner" || role === "editor") return role;
  return "editor";
};

async function fetchWorkspaces(userId: string): Promise<WorkspaceInfo[]> {
  const { data: wsData, error } = await supabase.rpc("get_user_workspaces", {
    _user_id: userId,
  });

  if (error || !wsData || (wsData as any[]).length === 0) {
    // For brand-new users, the create_default_workspace trigger may not have
    // propagated yet. Wait briefly and re-check before creating a duplicate.
    await new Promise(r => setTimeout(r, 1500));
    const { data: retryData } = await supabase.rpc("get_user_workspaces", { _user_id: userId });
    if (retryData && (retryData as any[]).length > 0) {
      return (retryData as any[]).map((w: any) => ({
        workspaceId: w.workspace_id,
        workspaceName: w.workspace_name,
        role: normalizeWorkspaceRole(w.role),
        memberCount: Number(w.member_count),
        createdAt: w.created_at,
      }));
    }

    // Still empty — create workspace, but handle 409 conflict gracefully
    const newWorkspaceId = crypto.randomUUID();
    const { error: wsError } = await supabase
      .from("workspaces")
      .insert({ id: newWorkspaceId, name: "My Workspace", created_by: userId });

    if (wsError) {
      // 409 conflict = workspace already exists from trigger; re-fetch
      if (wsError.code === '23505' || wsError.message?.includes('duplicate') || wsError.message?.includes('conflict')) {
        const { data: conflictData } = await supabase.rpc("get_user_workspaces", { _user_id: userId });
        if (conflictData && (conflictData as any[]).length > 0) {
          return (conflictData as any[]).map((w: any) => ({
            workspaceId: w.workspace_id,
            workspaceName: w.workspace_name,
            role: normalizeWorkspaceRole(w.role),
            memberCount: Number(w.member_count),
            createdAt: w.created_at,
          }));
        }
      }
      return [];
    }

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: newWorkspaceId, user_id: userId, role: "owner" });

    localStorage.setItem("preferred_workspace_id", newWorkspaceId);
    return [{
      workspaceId: newWorkspaceId,
      workspaceName: "My Workspace",
      role: "owner" as WorkspaceRole,
      memberCount: 1,
      createdAt: new Date().toISOString(),
    }];
  }

  return (wsData as any[]).map((w) => ({
    workspaceId: w.workspace_id,
    workspaceName: w.workspace_name,
    role: normalizeWorkspaceRole(w.role),
    memberCount: Number(w.member_count),
    createdAt: w.created_at,
  }));
}

export function useWorkspace() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => localStorage.getItem("preferred_workspace_id")
  );
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);

  // Cached workspace list — shared across all components via React Query
  const { data: workspaces = [], isLoading: queryLoading } = useQuery({
    queryKey: ["workspaces", user?.id],
    queryFn: () => {
      if (!user) return Promise.resolve([]);
      return fetchWorkspaces(user.id);
    },
    enabled: !!user && !authLoading,
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const isLoading = authLoading || queryLoading;

  useEffect(() => {
    if (authLoading || user) return;
    setMembers([]);
    setInvitations([]);
  }, [authLoading, user]);

  // Auto-select workspace when list loads
  useEffect(() => {
    if (workspaces.length === 0) return;
    const preferredId = localStorage.getItem("preferred_workspace_id");
    const current = preferredId && workspaces.some(w => w.workspaceId === preferredId)
      ? preferredId
      : (workspaces.find(w => w.role === "owner")?.workspaceId || workspaces[0]?.workspaceId || null);

    if (current && current !== activeWorkspaceId) {
      setActiveWorkspaceId(current);
      localStorage.setItem("preferred_workspace_id", current);
    }
  }, [workspaces]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const loadMembers = useCallback(async (wsId: string) => {
    const data = await fetchWorkspaceMembersData(wsId);
    setMembers(data.members);
    setInvitations(data.invitations);
  }, [fetchWorkspaceMembersData]);

  const loadMembersForWorkspace = useCallback(async (wsId: string) => {
    return fetchWorkspaceMembersData(wsId);
  }, [fetchWorkspaceMembersData]);

  // Members are loaded lazily — only when loadMembers is called explicitly
  // (e.g. when opening the workspace settings/members panel)

  const invalidateWorkspaces = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  }, [queryClient]);

  const selectWorkspace = useCallback((wsId: string) => {
    setActiveWorkspaceId(wsId);
    localStorage.setItem("preferred_workspace_id", wsId);
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    if (!user) throw new Error("Not authenticated");

    const newId = crypto.randomUUID();
    const { error: wsError } = await supabase
      .from("workspaces")
      .insert({ id: newId, name, created_by: user.id });
    if (wsError) throw wsError;

    await supabase
      .from("workspace_members")
      .insert({ workspace_id: newId, user_id: user.id, role: "owner" });

    invalidateWorkspaces();
    return newId;
  }, [invalidateWorkspaces, user]);

  const sendInvite = useCallback(async (email: string, role: WorkspaceRole, wsId?: string) => {
    const targetWsId = wsId || activeWorkspaceId;
    if (!targetWsId) throw new Error("No workspace selected");
    const { data, error } = await supabase.functions.invoke("send-workspace-invite", {
      body: { email, role, workspaceId: targetWsId },
    });
    if (error) throw error;
    if (data?.error && data?.error !== "Already a member") throw new Error(data.error);
    if (data?.alreadyInvited) {
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
    invalidateWorkspaces();
  }, [invalidateWorkspaces]);

  const deleteWorkspace = useCallback(async (wsId: string) => {
    await supabase.from("workspace_invitations").delete().eq("workspace_id", wsId);
    await supabase.from("workspace_members").delete().eq("workspace_id", wsId);
    const { error } = await supabase.from("workspaces").delete().eq("id", wsId);
    if (error) throw error;
    if (activeWorkspaceId === wsId) {
      localStorage.removeItem("preferred_workspace_id");
      setActiveWorkspaceId(null);
    }
    invalidateWorkspaces();
  }, [activeWorkspaceId, invalidateWorkspaces]);

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
    deleteWorkspace,
    loadMembersForWorkspace,
    reload: invalidateWorkspaces,
  };
}
