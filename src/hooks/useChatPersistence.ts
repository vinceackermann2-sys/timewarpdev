import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage, GoalState } from "@/lib/agentChat/types";
import type { ChatSession } from "@/components/database/ChatHistorySidebar";

export function useChatPersistence({
  user,
  activeWorkspaceId,
  selectedAgent,
  sessionMemory,
  messages,
  setMessages,
  setSelectedAgent,
  setSelectedChatEmployees,
  setSessionMemory,
  setSessionMemoryOpen,
}: {
  user: User | null;
  activeWorkspaceId: string | null;
  selectedAgent: string;
  sessionMemory: string;
  messages: ChatMessage[];
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSelectedAgent: Dispatch<SetStateAction<string>>;
  setSelectedChatEmployees: Dispatch<SetStateAction<{ id: string; name: string; role: string }[]>>;
  setSessionMemory: Dispatch<SetStateAction<string>>;
  setSessionMemoryOpen: Dispatch<SetStateAction<boolean>>;
}) {
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [goalState, setGoalState] = useState<GoalState | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveChatSession = useCallback(
    async (msgs: ChatMessage[], chatId: string | null) => {
      if (!user || msgs.length === 0) return;
      // Persist ALL messages (including in-progress assistant streams) so that
      // navigating away mid-response does not lose the user's question or the
      // partial reply. Streaming messages are finalized in the persisted copy.
      const persisted = msgs.map((m) =>
        m.isStreaming
          ? {
              ...m,
              isStreaming: false,
              content:
                m.content && m.content.trim().length > 0
                  ? m.content + "\n\n---\n*⏸ Paused — you navigated away. Send another message to continue.*"
                  : "⏸ Paused — you navigated away before this reply finished.",
            }
          : m,
      );
      if (persisted.length === 0) return;

      const title = persisted.find((m) => m.role === "user")?.content?.slice(0, 60) || "New Chat";
      const payload = {
        user_id: user.id,
        workspace_id: activeWorkspaceId || null,
        agent_name: selectedAgent || null,
        title,
        messages: persisted,
        assistant_memory: sessionMemory ?? "",
        goal_state: goalState as any,
        updated_at: new Date().toISOString(),
      };

      try {
        if (chatId) {
          await supabase
            .from("agent_chat_sessions")
            .update({
              messages: persisted as any,
              updated_at: new Date().toISOString(),
              title,
              assistant_memory: sessionMemory ?? "",
              goal_state: goalState as any,
            })
            .eq("id", chatId)
            .eq("user_id", user.id);
          setSidebarRefreshKey((k) => k + 1);
        } else {
          const { data } = await supabase.from("agent_chat_sessions").insert(payload as any).select("id").maybeSingle();
          if (data?.id) {
            setActiveChatId(data.id);
            setSidebarRefreshKey((k) => k + 1);
          }
        }
      } catch (e) {
        console.warn("Failed to save chat session:", e);
      }
    },
    [user?.id, activeWorkspaceId, selectedAgent, sessionMemory, goalState],
  );

  // Refs to latest values so unmount cleanup can flush without stale closures.
  const messagesRef = useRef(messages);
  const activeChatIdRef = useRef<string | null>(null);
  const saveRef = useRef(saveChatSession);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  useEffect(() => {
    saveRef.current = saveChatSession;
  }, [saveChatSession]);

  useEffect(() => {
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        if (!m.isStreaming && m.streamStartTime && typeof m.elapsedSeconds !== "number") {
          const diff = Math.max(0, Math.floor((Date.now() - m.streamStartTime) / 1000));
          if (diff <= 60 * 60 * 24) {
            changed = true;
            return { ...m, elapsedSeconds: diff };
          }
        }
        return m;
      });
      return changed ? next : prev;
    });
  }, [messages, setMessages]);

  useEffect(() => {
    if (messages.length === 0) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveChatSession(messages, activeChatId), 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, activeChatId, saveChatSession, sessionMemory, goalState]);

  // Track latest activeChatId so the unmount flush can target it.
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Flush on unmount (user navigates away mid-stream) so the user message and
  // any partial assistant reply are preserved instead of being lost.
  useEffect(() => {
    return () => {
      const msgs = messagesRef.current;
      if (msgs.length === 0) return;
      void saveRef.current(msgs, activeChatIdRef.current);
    };
  }, []);

  // When the user signs out / switches account or workspace, drop the active
  // chat id so we never update or display another user's session.
  useEffect(() => {
    setActiveChatId(null);
  }, [user?.id, activeWorkspaceId]);

  const handleSelectChat = (session: ChatSession) => {
    setActiveChatId(session.id);
    const msgs = session.messages as ChatMessage[];
    setMessages(msgs);
    const gs = session.goal_state;
    setGoalState(gs && typeof gs === "object" && gs !== null && "id" in gs ? (gs as GoalState) : null);
    setSessionMemory(typeof session.assistant_memory === "string" ? session.assistant_memory : "");
    setSessionMemoryOpen(!!(session.assistant_memory && String(session.assistant_memory).trim()));
    if (session.agent_name) setSelectedAgent(session.agent_name);
    const lastEmployeeMsg = [...msgs].reverse().find((m) => m.employees && m.employees.length > 0);
    if (lastEmployeeMsg?.employees) {
      setSelectedChatEmployees(lastEmployeeMsg.employees);
    } else {
      setSelectedChatEmployees([]);
    }
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setSelectedChatEmployees([]);
    setSessionMemory("");
    setSessionMemoryOpen(false);
    setGoalState(null);
  };

  return { activeChatId, goalState, setGoalState, handleSelectChat, handleNewChat, saveChatSession, sidebarRefreshKey };
}
