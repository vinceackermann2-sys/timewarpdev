import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/lib/agentChat/types";
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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveChatSession = useCallback(
    async (msgs: ChatMessage[], chatId: string | null) => {
      if (!user || msgs.length === 0) return;
      const nonStreaming = msgs.filter((m) => !m.isStreaming);
      if (nonStreaming.length === 0) return;

      const title = nonStreaming.find((m) => m.role === "user")?.content?.slice(0, 60) || "New Chat";
      const payload = {
        user_id: user.id,
        workspace_id: activeWorkspaceId || null,
        agent_name: selectedAgent || null,
        title,
        messages: nonStreaming,
        assistant_memory: sessionMemory ?? "",
        updated_at: new Date().toISOString(),
      };

      try {
        if (chatId) {
          // Defense-in-depth: only update if this session belongs to the
          // current user. Prevents any stale activeChatId from a previous
          // account/workspace from overwriting another user's chat.
          await supabase
            .from("agent_chat_sessions")
            .update({
              messages: nonStreaming as any,
              updated_at: new Date().toISOString(),
              title,
              assistant_memory: sessionMemory ?? "",
            })
            .eq("id", chatId)
            .eq("user_id", user.id);
        } else {
          const { data } = await supabase.from("agent_chat_sessions").insert(payload as any).select("id").maybeSingle();
          if (data?.id) setActiveChatId(data.id);
        }
      } catch (e) {
        console.warn("Failed to save chat session:", e);
      }
    },
    [user?.id, activeWorkspaceId, selectedAgent, sessionMemory],
  );

  // When the user signs out / switches account or workspace, drop the active
  // chat id so we never update or display another user's session.
  useEffect(() => {
    setActiveChatId(null);
  }, [user?.id, activeWorkspaceId]);

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
    saveTimerRef.current = setTimeout(() => saveChatSession(messages, activeChatId), 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, activeChatId, saveChatSession, sessionMemory]);

  const handleSelectChat = (session: ChatSession) => {
    setActiveChatId(session.id);
    const msgs = session.messages as ChatMessage[];
    setMessages(msgs);
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
  };

  return { activeChatId, handleSelectChat, handleNewChat, saveChatSession };
}
