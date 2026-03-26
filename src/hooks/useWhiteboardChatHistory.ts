import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseChatHistoryOptions {
  nodeId: string;
  chatType: "research" | "action";
}

// Module-level in-memory cache — survives component unmount/remount
const memoryCache = new Map<string, { messages: any[]; dbRowId: string | null }>();

function cacheKey(nodeId: string, chatType: string) {
  return `${chatType}:${nodeId}`;
}

/**
 * Persists whiteboard chat history to the database, scoped by workspace.
 * Uses an in-memory cache so re-mounting the node is instant.
 * Falls back to localStorage for unauthenticated users.
 */
export function useWhiteboardChatHistory<T>({ nodeId, chatType }: UseChatHistoryOptions) {
  const key = cacheKey(nodeId, chatType);
  const cached = memoryCache.get(key);

  const [messages, setMessages] = useState<T[]>(() => {
    // 1. In-memory cache (fastest, survives navigation)
    if (cached && cached.messages.length > 0) return cached.messages as T[];
    // 2. localStorage fallback
    try {
      const saved = localStorage.getItem(`chat_history_${nodeId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isLoaded, setIsLoaded] = useState(!!cached);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dbRowIdRef = useRef<string | null>(cached?.dbRowId ?? null);

  // Load from DB on mount — skip if we already have a memory cache hit
  useEffect(() => {
    if (cached) {
      setIsLoaded(true);
      return;
    }
    let cancelled = false;

    const loadFromDb = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user || cancelled) {
          setIsLoaded(true);
          return;
        }

        const wsId = localStorage.getItem("preferred_workspace_id");
        let query = (supabase as any)
          .from("whiteboard_chat_history")
          .select("id, messages")
          .eq("node_id", nodeId)
          .eq("chat_type", chatType);

        if (wsId) {
          query = query.eq("workspace_id", wsId);
        } else {
          query = query.eq("user_id", session.user.id).is("workspace_id", null);
        }

        const { data, error } = await query.maybeSingle();

        if (cancelled) return;

        if (!error && data) {
          dbRowIdRef.current = data.id;
          const dbMessages = data.messages as T[];
          if (dbMessages && dbMessages.length > 0) {
            setMessages(dbMessages);
            memoryCache.set(key, { messages: dbMessages, dbRowId: data.id });
            localStorage.setItem(`chat_history_${nodeId}`, JSON.stringify(dbMessages));
          }
        }
      } catch (err) {
        console.error("Failed to load chat history from DB:", err);
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    };

    loadFromDb();
    return () => { cancelled = true; };
  }, [nodeId, chatType]);

  // Debounced save to DB whenever messages change
  const saveToDb = useCallback(async (msgs: T[]) => {
    // Always keep localStorage in sync
    if (msgs.length > 0) {
      localStorage.setItem(`chat_history_${nodeId}`, JSON.stringify(msgs));
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const wsId = localStorage.getItem("preferred_workspace_id");
      const payload = {
        user_id: session.user.id,
        workspace_id: wsId || null,
        node_id: nodeId,
        chat_type: chatType,
        messages: msgs as any,
        updated_at: new Date().toISOString(),
      };

      if (dbRowIdRef.current) {
        await (supabase as any)
          .from("whiteboard_chat_history")
          .update({ messages: msgs as any, updated_at: new Date().toISOString() })
          .eq("id", dbRowIdRef.current);
      } else {
        const { data } = await (supabase as any)
          .from("whiteboard_chat_history")
          .upsert(payload, { onConflict: "workspace_id,node_id" })
          .select("id")
          .maybeSingle();
        if (data?.id) dbRowIdRef.current = data.id;
      }
    } catch (err) {
      console.error("Failed to save chat history to DB:", err);
    }
  }, [nodeId, chatType]);

  // Debounce save — only save non-streaming messages
  const saveMessages = useCallback((msgs: T[]) => {
    // Filter out streaming messages before saving
    const filtered = (msgs as any[]).filter((m: any) => !m.isStreaming) as T[];
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveToDb(filtered), 1000);
  }, [saveToDb]);

  // Auto-save when messages change
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      saveMessages(messages);
    }
  }, [messages, isLoaded, saveMessages]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { messages, setMessages, isLoaded };
}
