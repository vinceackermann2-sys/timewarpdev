import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Plus, MessageSquare, Trash2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

export interface ChatSession {
  id: string;
  title: string;
  agent_name: string | null;
  messages: any[];
  created_at: string;
  updated_at: string;
}

interface Props {
  activeChatId: string | null;
  onSelectChat: (session: ChatSession) => void;
  onNewChat: () => void;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  return format(d, "MMM d");
}

export function ChatHistorySidebar({ activeChatId, onSelectChat, onNewChat }: Props) {
  const { user } = useAuth();
  const { activeWorkspaceId } = useWorkspace();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    try {
      let query = (supabase as any)
        .from("agent_chat_sessions")
        .select("id, title, agent_name, messages, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (activeWorkspaceId) {
        query = query.eq("workspace_id", activeWorkspaceId);
      } else {
        query = query.eq("user_id", user.id).is("workspace_id", null);
      }

      const { data } = await query;
      setSessions((data || []) as ChatSession[]);
    } catch (e) {
      console.warn("Failed to load chat sessions:", e);
    }
    setIsLoading(false);
  }, [user, activeWorkspaceId]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await (supabase as any).from("agent_chat_sessions").delete().eq("id", id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeChatId === id) onNewChat();
  };

  return (
    <div className="w-64 h-full border-l border-border bg-card/50 flex flex-col sticky top-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">Chat History</span>
        </div>
        <button
          onClick={onNewChat}
          className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          title="New Chat"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          <div className="px-4 space-y-3 pt-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No chats yet</p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {sessions.map(session => {
              const msgCount = Array.isArray(session.messages) ? session.messages.length : 0;
              const isActive = activeChatId === session.id;

              return (
                <button
                  key={session.id}
                  onClick={() => onSelectChat(session)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-lg transition-all group",
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        "text-sm truncate",
                        isActive ? "font-semibold text-foreground" : "font-medium text-foreground/80"
                      )}>
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {session.agent_name && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                            {session.agent_name}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(session.updated_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, session.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
