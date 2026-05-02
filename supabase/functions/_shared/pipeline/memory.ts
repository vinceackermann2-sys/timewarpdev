/** Read / write `assistant_memory` (service-role client; caller must enforce auth user). */

export async function loadPersistedMemoryMarkdown(
  supabase: { from: (t: string) => any },
  userId: string,
  workspaceId: string | null | undefined,
): Promise<string> {
  try {
    let personalQ = supabase.from("assistant_memory").select("key,value,category,updated_at").eq("user_id", userId).order("updated_at", {
      ascending: false,
    }).limit(35);
    if (workspaceId) personalQ = personalQ.eq("workspace_id", workspaceId);
    else personalQ = personalQ.is("workspace_id", null);
    const { data: personal } = await personalQ;

    let team: { key: string; value: string; category: string; updated_at: string; user_id: string }[] = [];
    if (workspaceId) {
      const { data: t } = await supabase.from("assistant_memory").select("key,value,category,updated_at,user_id").eq(
        "workspace_id",
        workspaceId,
      ).neq("user_id", userId).order("updated_at", { ascending: false }).limit(25);
      team = (t || []) as typeof team;
    }

    const lines: string[] = [];
    if (personal && personal.length > 0) {
      lines.push("## Your Memory (persisted across sessions)");
      for (const row of personal as { key: string; value: string; category?: string; updated_at?: string }[]) {
        lines.push(`- **${row.key}**: ${String(row.value).slice(0, 500)}${row.category ? ` (${row.category})` : ""}`);
      }
    }
    if (team.length > 0) {
      lines.push("\n## Workspace Knowledge (from team members)");
      for (const row of team) {
        lines.push(`- **${row.key}**: ${String(row.value).slice(0, 400)} _(teammate)_`);
      }
    }
    return lines.length ? lines.join("\n") : "";
  } catch (e) {
    console.warn("[assistant_memory] read failed", (e as Error)?.message);
    return "";
  }
}

export async function upsertAssistantMemoryRow(
  supabase: { from: (t: string) => any },
  userId: string,
  workspaceId: string | null | undefined,
  key: string,
  value: string,
  category: string,
  source: string,
): Promise<{ ok: boolean; error?: string }> {
  const k = String(key || "").trim().slice(0, 120);
  const v = String(value || "").trim().slice(0, 8000);
  if (!k || !v) return { ok: false, error: "key and value required" };
  const row: Record<string, unknown> = {
    user_id: userId,
    workspace_id: workspaceId || null,
    key: k,
    value: v,
    category: (category || "general").slice(0, 64),
    source: (source || "assistant").slice(0, 32),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("assistant_memory").upsert(row, {
    onConflict: "user_id,workspace_id,key",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
