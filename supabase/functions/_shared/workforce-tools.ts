// Tool definitions + executors that let the assistant chat actually
// create real ai_agents and ai_employees rows after a user has worked
// through the agents.md / employees.md skill conversation.
//
// This is the "Option A" implementation referenced in chat: when the
// model is confident the spec is complete, it emits a tool_call. The
// edge function executes the insert (RLS-scoped to the auth'd user +
// workspace) and emits a `created_entity` SSE event the UI renders as
// a confirmation card.

export const workforceTools = [
  {
    type: "function" as const,
    function: {
      name: "create_agent",
      description:
        "Create a new AI Agent in the user's workspace. Call this ONLY after you have a complete, validated spec (name, single trigger, 3-8 SOP steps, explicit can-do/cannot-do). Never call without confirming the design with the user first.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Short agent name, 2-40 chars (e.g. 'Slack Triage Agent')." },
          description: { type: "string", description: "One-sentence purpose." },
          trigger_type: { type: "string", enum: ["manual", "schedule", "event"], description: "How the agent starts." },
          trigger_source: { type: "string", description: "Integration or surface that fires it (e.g. 'slack', 'gmail', 'manual')." },
          trigger_condition: { type: "string", description: "Plain-English condition for event triggers (e.g. 'new message in #support')." },
          trigger_schedule: { type: "string", description: "Plain-English schedule for schedule triggers (e.g. 'every weekday at 9am')." },
          required_integrations: {
            type: "array",
            items: { type: "string" },
            description: "Integration ids the agent needs (e.g. ['slack', 'gmail']).",
          },
          sop_steps: {
            type: "array",
            description: "3-8 ordered steps the agent always follows.",
            items: {
              type: "object",
              properties: {
                label: { type: "string" },
                detail: { type: "string" },
              },
              required: ["label"],
            },
          },
          sop_output: { type: "string", description: "What the agent produces when finished." },
          safety_can_do: { type: "array", items: { type: "string" }, description: "Explicit allowed actions." },
          safety_cannot_do: { type: "array", items: { type: "string" }, description: "Explicit forbidden actions." },
          safety_escalation_path: { type: "string", description: "What/who the agent hands off to when blocked." },
        },
        required: ["name", "trigger_type", "sop_steps", "safety_can_do", "safety_cannot_do"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_employee",
      description:
        "Create a new AI Employee in the user's workspace. Call this ONLY after you have a complete spec (name, role, domain lens, owns/advises_on/does_not_touch, SOP procedure). Never call without confirming the design with the user first.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Employee display name, 2-40 chars." },
          role: { type: "string", description: "Concise role/title (e.g. 'CMO', 'Lead Qualifier')." },
          domain_lens: { type: "string", description: "How this employee thinks — their lens on every problem." },
          owns: { type: "array", items: { type: "string" }, description: "Decisions/outputs they own." },
          advises_on: { type: "array", items: { type: "string" }, description: "Areas they advise on but don't own." },
          does_not_touch: { type: "array", items: { type: "string" }, description: "Areas explicitly outside their scope." },
          sop_title: { type: "string" },
          sop_purpose: { type: "string" },
          sop_scope: { type: "string" },
          sop_procedure: { type: "array", items: { type: "string" }, description: "3-8 thinking/decision steps." },
          sop_responsibilities: { type: "array", items: { type: "string" } },
          sop_safety_notes: { type: "string" },
        },
        required: ["name", "role", "domain_lens", "sop_purpose"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_todo",
      description:
        "Add a To-Do card to the user's CEO dashboard snapshot for this brand. Use when the user explicitly wants a tracked task or you agreed to create one.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short task title" },
          description: { type: "string", description: "One or two sentences — concrete next step" },
          priority: { type: "string", enum: ["High", "Medium", "Low"], description: "Default Medium" },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_objective",
      description: "Add an Objective card to the CEO dashboard snapshot (strategic outcome / KPI).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_briefing",
      description: "Add a Briefing card to the CEO dashboard snapshot (executive note / signal).",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_update",
      description: "Add an Updates card (waiting-on / status update style) to the CEO dashboard snapshot.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string", enum: ["High", "Medium", "Low"] },
        },
        required: ["title", "description"],
        additionalProperties: false,
      },
    },
  },
];

interface ExecCtx {
  supabase: any;
  userId: string;
  workspaceId?: string;
  brandId?: string;
}

interface ToolResult {
  ok: boolean;
  kind: "agent" | "employee" | "dashboard";
  id?: string;
  name?: string;
  tab?: string;
  error?: string;
}

async function appendDashboardSnapshotCard(
  ctx: ExecCtx,
  tab: "Briefing" | "Updates" | "To-Dos" | "Objectives",
  card: { id: string; title: string; description: string; priority: string },
): Promise<ToolResult> {
  if (!ctx.brandId) {
    return { ok: false, kind: "dashboard", error: "brandId required for dashboard tools" };
  }
  const { data: row, error: selErr } = await ctx.supabase
    .from("dashboard_snapshots")
    .select("tab_cards, cards")
    .eq("user_id", ctx.userId)
    .eq("brand_id", ctx.brandId)
    .maybeSingle();
  if (selErr) return { ok: false, kind: "dashboard", error: selErr.message };

  const empty: Record<string, unknown[]> = { Briefing: [], Updates: [], "To-Dos": [], Objectives: [] };
  const prev = (row?.tab_cards || {}) as Record<string, unknown[]>;
  const tabCards: Record<string, unknown[]> = {
    Briefing: [...(prev.Briefing || empty.Briefing)],
    Updates: [...(prev.Updates || empty.Updates)],
    "To-Dos": [...(prev["To-Dos"] || empty["To-Dos"])],
    Objectives: [...(prev.Objectives || empty.Objectives)],
  };
  tabCards[tab].unshift({
    id: card.id,
    title: card.title,
    description: card.description,
    priority: card.priority,
    source: "assistant_chat",
  });

  const payload = {
    user_id: ctx.userId,
    brand_id: ctx.brandId,
    workspace_id: ctx.workspaceId || null,
    cards: (row?.cards && typeof row.cards === "object" ? row.cards : {}) as Record<string, unknown>,
    tab_cards: tabCards,
    updated_at: new Date().toISOString(),
  };

  const { error: upErr } = await ctx.supabase.from("dashboard_snapshots").upsert(payload, {
    onConflict: "user_id,brand_id",
  });
  if (upErr) return { ok: false, kind: "dashboard", error: upErr.message };
  return { ok: true, kind: "dashboard", id: card.id, name: card.title, tab };
}

export async function executeWorkforceToolCall(
  name: string,
  args: any,
  ctx: ExecCtx,
): Promise<ToolResult> {
  if (name === "create_agent") {
    try {
      const steps = Array.isArray(args.sop_steps)
        ? args.sop_steps
            .map((s: any) =>
              typeof s === "string"
                ? { label: s }
                : { label: String(s.label || "").trim(), detail: s.detail ? String(s.detail) : undefined },
            )
            .filter((s: any) => s.label.length > 0)
        : [];
      const { data, error } = await ctx.supabase
        .from("ai_agents")
        .insert({
          user_id: ctx.userId,
          workspace_id: ctx.workspaceId || null,
          linked_business_id: ctx.brandId || null,
          name: String(args.name || "").trim().slice(0, 80) || "Untitled Agent",
          description: args.description ? String(args.description).slice(0, 500) : null,
          status: "draft",
          trigger_type: args.trigger_type || "manual",
          trigger_source: args.trigger_source || null,
          trigger_condition: args.trigger_condition || null,
          trigger_schedule: args.trigger_schedule || null,
          required_integrations: Array.isArray(args.required_integrations) ? args.required_integrations : [],
          sop_steps: steps,
          sop_output: args.sop_output || null,
          safety_can_do: Array.isArray(args.safety_can_do) ? args.safety_can_do : [],
          safety_cannot_do: Array.isArray(args.safety_cannot_do) ? args.safety_cannot_do : [],
          safety_escalation_path: args.safety_escalation_path || null,
        })
        .select("id, name")
        .single();
      if (error) return { ok: false, kind: "agent", error: error.message };
      return { ok: true, kind: "agent", id: data.id, name: data.name };
    } catch (err: any) {
      return { ok: false, kind: "agent", error: String(err?.message || err) };
    }
  }

  if (name === "create_employee") {
    try {
      const procedure = Array.isArray(args.sop_procedure) ? args.sop_procedure.map((s: any) => String(s)) : [];
      const { data, error } = await ctx.supabase
        .from("ai_employees")
        .insert({
          user_id: ctx.userId,
          workspace_id: ctx.workspaceId || null,
          linked_business_id: ctx.brandId || null,
          name: String(args.name || "").trim().slice(0, 80) || "Untitled Employee",
          role: String(args.role || "").trim().slice(0, 80) || "Generalist",
          domain_lens: args.domain_lens || null,
          owns: Array.isArray(args.owns) ? args.owns : [],
          advises_on: Array.isArray(args.advises_on) ? args.advises_on : [],
          does_not_touch: Array.isArray(args.does_not_touch) ? args.does_not_touch : [],
          sop_title: args.sop_title || `${args.role || "Employee"} SOP`,
          sop_purpose: args.sop_purpose || null,
          sop_scope: args.sop_scope || null,
          sop_procedure: procedure,
          sop_responsibilities: Array.isArray(args.sop_responsibilities) ? args.sop_responsibilities : [],
          sop_safety_notes: args.sop_safety_notes || null,
          status: "active",
        })
        .select("id, name")
        .single();
      if (error) return { ok: false, kind: "employee", error: error.message };
      return { ok: true, kind: "employee", id: data.id, name: data.name };
    } catch (err: any) {
      return { ok: false, kind: "employee", error: String(err?.message || err) };
    }
  }

  const dashTools: Record<string, "Briefing" | "Updates" | "To-Dos" | "Objectives"> = {
    create_todo: "To-Dos",
    create_objective: "Objectives",
    create_briefing: "Briefing",
    create_update: "Updates",
  };
  if (dashTools[name]) {
    const title = String(args.title || "").trim().slice(0, 120);
    const description = String(args.description || "").trim().slice(0, 800);
    const priority = (["High", "Medium", "Low"].includes(String(args.priority)) ? args.priority : "Medium") as string;
    if (!title || !description) return { ok: false, kind: "dashboard", error: "title and description required" };
    const id = `asst_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
    return appendDashboardSnapshotCard(ctx, dashTools[name], { id, title, description, priority });
  }

  return { ok: false, kind: "agent", error: `Unknown tool: ${name}` };
}
