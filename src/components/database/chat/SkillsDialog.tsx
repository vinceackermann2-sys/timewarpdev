import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Pencil, Plus, ScrollText, Search, Sparkles, Trash2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Skills system
 *
 * - PRESET_SKILLS — built-in skills with full instructions surfaced in the dialog.
 * - Custom skills are persisted per-browser in localStorage.
 * - SkillsSubMenu renders the small popover (like the screenshot) shown next
 *   to the Plus menu — list of skill names, "Manage skills", "+ Add skill".
 * - SkillsDialog is the full manager: list ⇄ detail with Enable button,
 *   plus full CRUD for custom skills.
 *
 * Selecting / enabling a skill calls `onEnable(activeSkill)`. The composer
 * then renders a removable chip and prepends the skill instructions to the
 * next outbound message.
 */

export type CustomSkill = {
  id: string;
  name: string;
  trigger: string;
  instructions: string;
};

export type ActiveSkill = {
  id: string;
  name: string;
  /** Optional trigger phrase inserted into the prompt prefix. */
  trigger?: string;
  /** Long-form instructions sent as part of the prompt prefix. */
  instructions?: string;
  /** Short blurb (preset description) shown in the chip tooltip. */
  description?: string;
};

const STORAGE_KEY = "tw.customSkills.v1";

export type PresetSkill = {
  id: string;
  name: string;
  description: string;
  trigger: string;
  emoji: string;
  instructions: string;
};

/**
 * Preset skills.
 *
 * Each preset's `instructions` is the full skill.md prompt — frontmatter +
 * Markdown body — exactly the format used by the assistant's internal
 * skill playbooks under `supabase/functions/_shared/skills/`. The block is
 * prepended to the next outbound message so the model treats it as an
 * authoritative system prompt for that turn.
 */
export const PRESET_SKILLS: PresetSkill[] = [
  {
    id: "skill-creator",
    name: "Skill Creator",
    emoji: "🪄",
    description: "Design and write a complete, ready-to-deploy skill.md for the assistant.",
    trigger: "Act as the Skill Creator.",
    instructions: `---
name: Skill Creator
pillars: Strategy, Operations, Brand
surface: assistant-chat
trigger: create a skill, make a new skill, build a skill, add a skill, I want a skill for, can you create a skill, skill template, write a skill, design a skill for the assistant, create my own skill, custom skill, personalise the assistant, add a capability, I need the assistant to be good at, teach the assistant, new capability, skill for, build me a skill
mode: meta
---

# Skill Creator

## What This Skill Does

You are a skill architect. When the user wants to add a new capability to the assistant — or create a personalised skill for their specific business, role, or workflow — you design and write a complete, ready-to-deploy SKILL.md file in the correct format. You also help users improve or iterate on existing skills.

A skill is a structured system prompt module that:
- Tells the assistant what role to play when a specific topic arises
- Maps which Business DNA pillars to pull from automatically
- Defines the right framework and playbooks for that topic
- Sets [SUGGEST:] chips that drive the conversation forward
- Maintains the CEO personality traits

Your output is always a complete, deployable SKILL.md — not advice about how to write one.

## Business DNA Context

When creating a skill, check which pillars it should reference:
- \`Brand\` — voice, tone, positioning, identity-related skills
- \`Product\` — features, USP, pricing, roadmap-related skills
- \`Audience\` — persona, pain points, research, customer-facing skills
- \`Market\` — competitive, industry, trend-related skills
- \`Financial\` — revenue, CAC, LTV, pricing, unit economics skills
- \`Operations\` — process, workflow, tech stack, systems skills
- \`Growth\` — campaigns, channels, funnels, acquisition skills
- \`People\` — team, hiring, culture, HR skills
- \`Strategy\` — OKR, vision, decisions, milestones skills

## CEO Personality (Apply Always)

- **Decisive** — Produce the complete skill file, don't just describe it.
- **Direct** — Ask only what you need before writing. Maximum 2–3 clarifying questions.
- **Strategic** — Design the skill to be genuinely useful, not just technically correct.

---

## Skill Design Framework

### Step 1 — Understand the Need
Before writing, clarify (in one conversational turn if possible):

1. **What topic does this skill cover?** (The domain of expertise)
2. **What triggers it?** (What does the user say that activates it?)
3. **What's the goal?** (What should a perfect response from this skill achieve?)
4. **Any constraints?** (Things to avoid, tone requirements, specific frameworks to use)

If the user has given enough context, skip the questions and write directly.

### Step 2 — Choose the Right Pillars
Map the skill's topic to Business DNA pillars. Pick 2–4 pillars maximum. The first pillar listed should be the primary one.

### Step 3 — Define the Persona & Lens
Every skill needs a clear point of view: what role is the assistant playing, what's the lens, what does it always do, and what are the anti-patterns it never does.

### Step 4 — Build the Playbooks
The body of the skill should contain 3–6 topic-specific playbooks with numbered procedures, concrete examples, and named frameworks.

### Step 5 — Design the [SUGGEST:] Tag
Format: \`[SUGGEST:Question text?::Option A|Option B|Option C|Option D]\`

---

## SKILL.md File Structure

Every skill must follow this exact structure:

\`\`\`markdown
---
name: [Skill Name]
pillars: [Pillar1, Pillar2, Pillar3]
surface: assistant-chat
trigger: [comma-separated trigger phrases]
---

# [Skill Name]

## What This Skill Does
[2-3 sentences]

## Business DNA Context
[Exact field names like \`Brand.voice\`, \`Financial.CAC\`]

## CEO Personality (Apply Always)
[5-trait block + domain-specific anti-patterns]

---

## [Core Skill Content]
[3-6 playbooks, frameworks, or topic sections]

---

## Output Format
[Templates, tables, formatting conventions]

---

## Follow-Up Suggestions
[The [SUGGEST:] tag with 4 options]
\`\`\`

---

## Quality Checklist

Before delivering a skill, verify:
- Trigger phrases cover realistic ways a user would ask
- Pillar mapping names exact fields, not just pillar names
- Persona is distinct vs a generic chat response
- Playbooks are actionable step-by-step
- Anti-patterns prevent common mistakes
- [SUGGEST:] options lead to genuinely different next conversations
- No file system or external file references — all knowledge is embedded
- CEO personality block is present
- Business DNA context is specific

---

## Guided Creation Flow

**Turn 1 — Intent:** "What do you want the assistant to be better at?"
**Turn 2 — Clarify (max 3 questions):** Only the questions that change how the skill is written.
**Turn 3 — Produce:** Write the complete skill file without further questions.
**Turn 4 — Review:** "Does this capture what you wanted? Tell me what to change and I'll revise the whole skill."

## Skill Improvement Mode

If the user provides an existing skill to improve:
1. Read the full skill
2. Identify gaps against the quality checklist
3. Rewrite the weak sections
4. Deliver the complete improved version, not a diff

---

## Follow-Up Suggestions

[SUGGEST:What would you like to do?::✍️ Create a new skill from scratch|🔧 Improve an existing skill|💡 Get skill ideas for my business|📋 Review skill quality checklist]
`,
  },
];

function loadCustom(): CustomSkill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustom(skills: CustomSkill[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills));
  } catch {
    /* ignore quota errors */
  }
}

/** Read custom skills synchronously — used by the sub-menu. */
export function getCustomSkills(): CustomSkill[] {
  return loadCustom();
}

// ─────────────────────────────────────────────────────────────────────────────
// Small sub-popover (matches the screenshot)
// ─────────────────────────────────────────────────────────────────────────────

export function SkillsSubMenu({
  onEnable,
  onManage,
  onAdd,
}: {
  onEnable: (skill: ActiveSkill) => void;
  onManage: () => void;
  onAdd: () => void;
}) {
  const [custom, setCustom] = useState<CustomSkill[]>([]);
  useEffect(() => {
    setCustom(loadCustom());
  }, []);

  const items: ActiveSkill[] = [
    ...custom.map((c) => ({ id: c.id, name: c.name, trigger: c.trigger, instructions: c.instructions })),
    ...PRESET_SKILLS.map((p) => ({
      id: p.id,
      name: p.name,
      trigger: p.trigger,
      instructions: p.instructions,
      description: p.description,
    })),
  ];

  return (
    <div className="flex flex-col">
      <div className="max-h-[120px] overflow-y-auto py-1">{/* ~3 rows then scroll */}
        {items.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">No skills yet</div>
        ) : (
          items.map((skill) => (
            <button
              key={skill.id}
              type="button"
              onClick={() => onEnable(skill)}
              className="w-full text-left px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors truncate"
              title={skill.description || skill.instructions || skill.name}
            >
              {skill.name}
            </button>
          ))
        )}
      </div>
      <div className="border-t border-border py-1">
        <button
          type="button"
          onClick={onManage}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center gap-3"
        >
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          Manage skills
        </button>
        <button
          type="button"
          onClick={onAdd}
          className="w-full text-left px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center gap-3"
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
          Add skill
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full manager dialog with detail view + custom skill CRUD
// ─────────────────────────────────────────────────────────────────────────────

type DialogMode = "browse" | "mine" | "create";

export function SkillsDialog({
  open,
  onOpenChange,
  onEnable,
  initialMode = "browse",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onEnable: (skill: ActiveSkill) => void;
  initialMode?: DialogMode;
}) {
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [query, setQuery] = useState("");
  const [custom, setCustom] = useState<CustomSkill[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; trigger: string; instructions: string }>({
    name: "",
    trigger: "",
    instructions: "",
  });
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCustom(loadCustom());
    if (initialMode === "create") {
      setTab("mine");
      setCreating(true);
      setEditingId(null);
      setDraft({ name: "", trigger: "", instructions: "" });
    } else if (initialMode === "mine") {
      setTab("mine");
      setCreating(false);
    } else {
      setTab("browse");
      setCreating(false);
    }
    setSelectedPresetId(null);
    setSelectedCustomId(null);
    setQuery("");
  }, [open, initialMode]);

  const filteredPresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PRESET_SKILLS;
    return PRESET_SKILLS.filter((s) => `${s.name} ${s.description}`.toLowerCase().includes(q));
  }, [query]);

  const selectedPreset = selectedPresetId ? PRESET_SKILLS.find((s) => s.id === selectedPresetId) ?? null : null;
  const selectedCustom = selectedCustomId ? custom.find((s) => s.id === selectedCustomId) ?? null : null;

  const enablePreset = (s: PresetSkill) => {
    onEnable({ id: s.id, name: s.name, trigger: s.trigger, instructions: s.instructions, description: s.description });
    onOpenChange(false);
  };

  const enableCustom = (s: CustomSkill) => {
    onEnable({ id: s.id, name: s.name, trigger: s.trigger, instructions: s.instructions });
    onOpenChange(false);
  };

  const handleSaveDraft = () => {
    if (!draft.name.trim()) return;
    if (editingId) {
      const updated = custom.map((c) =>
        c.id === editingId ? { ...c, name: draft.name.trim(), trigger: draft.trigger.trim(), instructions: draft.instructions.trim() } : c,
      );
      setCustom(updated);
      saveCustom(updated);
    } else {
      const next: CustomSkill = {
        id: `cs_${Date.now()}`,
        name: draft.name.trim(),
        trigger: draft.trigger.trim(),
        instructions: draft.instructions.trim(),
      };
      const updated = [next, ...custom];
      setCustom(updated);
      saveCustom(updated);
    }
    setDraft({ name: "", trigger: "", instructions: "" });
    setCreating(false);
    setEditingId(null);
  };

  const handleEdit = (s: CustomSkill) => {
    setEditingId(s.id);
    setDraft({ name: s.name, trigger: s.trigger, instructions: s.instructions });
    setCreating(true);
    setSelectedCustomId(null);
  };

  const handleDelete = (id: string) => {
    const updated = custom.filter((s) => s.id !== id);
    setCustom(updated);
    saveCustom(updated);
    if (selectedCustomId === id) setSelectedCustomId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
            <ScrollText className="w-5 h-5 text-primary" />
            Skills
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-2 flex items-center gap-2 border-b border-border">
          <button
            type="button"
            onClick={() => { setTab("browse"); setSelectedCustomId(null); setCreating(false); }}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "browse" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => { setTab("mine"); setSelectedPresetId(null); }}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "mine" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            My Skills {custom.length > 0 && <span className="text-xs text-muted-foreground">({custom.length})</span>}
          </button>
        </div>

        {tab === "browse" && (
          <div className="grid grid-cols-[1fr_1.2fr] min-h-[420px] max-h-[60vh]">
            <div className="border-r border-border overflow-y-auto p-4">
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search skills…"
                  className="pl-9"
                />
              </div>
              <div className="space-y-1">
                {filteredPresets.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedPresetId(s.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2 transition-colors flex items-start gap-2",
                      selectedPresetId === s.id ? "bg-muted" : "hover:bg-muted/50",
                    )}
                  >
                    <span className="text-base leading-none mt-0.5">{s.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{s.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                    </div>
                  </button>
                ))}
                {filteredPresets.length === 0 && (
                  <div className="text-sm text-muted-foreground py-8 text-center">No skills match "{query}".</div>
                )}
              </div>
            </div>
            <div className="overflow-y-auto p-6">
              {selectedPreset ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl leading-none">{selectedPreset.emoji}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-foreground">{selectedPreset.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{selectedPreset.description}</p>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Trigger</div>
                    <div className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2 font-mono">
                      {selectedPreset.trigger}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                      <span>skill.md</span>
                      <span className="font-mono normal-case tracking-normal text-muted-foreground/70">{selectedPreset.id}.md</span>
                    </div>
                    <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed font-mono bg-muted/40 border border-border rounded-md p-3 max-h-[280px] overflow-y-auto">
{selectedPreset.instructions}
                    </pre>
                  </div>
                  <Button onClick={() => enablePreset(selectedPreset)} className="w-full">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Enable skill
                  </Button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Select a skill to see what it does.
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "mine" && (
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {creating ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => { setCreating(false); setEditingId(null); setDraft({ name: "", trigger: "", instructions: "" }); }}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Skill name</label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="e.g. Weekly investor update"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Trigger phrase (optional)</label>
                  <Input
                    value={draft.trigger}
                    onChange={(e) => setDraft({ ...draft, trigger: e.target.value })}
                    placeholder="e.g. Draft my weekly investor update."
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Instructions</label>
                  <Textarea
                    value={draft.instructions}
                    onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
                    placeholder="Tell the assistant exactly how to behave when this skill is used."
                    rows={8}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button onClick={handleSaveDraft} disabled={!draft.name.trim()}>
                    <Wand2 className="w-4 h-4 mr-1" />
                    {editingId ? "Save changes" : "Save skill"}
                  </Button>
                </div>
              </div>
            ) : selectedCustom ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedCustomId(null)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Back
                </button>
                <div>
                  <h3 className="text-lg font-bold text-foreground">{selectedCustom.name}</h3>
                  {selectedCustom.trigger && (
                    <div className="text-sm text-foreground bg-muted/50 rounded-md px-3 py-2 font-mono mt-2">
                      {selectedCustom.trigger}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Instructions</div>
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedCustom.instructions || <span className="text-muted-foreground italic">No instructions.</span>}
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="outline" onClick={() => handleEdit(selectedCustom)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" onClick={() => handleDelete(selectedCustom.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                  </Button>
                  <Button onClick={() => enableCustom(selectedCustom)}>
                    <Sparkles className="w-4 h-4 mr-1" /> Enable
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <Button variant="outline" className="w-full justify-start mb-3" onClick={() => setCreating(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create your own skill
                </Button>
                {custom.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-8 text-center">
                    No custom skills yet. Create one to save your own prompts and playbooks.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {custom.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedCustomId(s.id)}
                        className="w-full text-left rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="text-sm font-semibold text-foreground truncate">{s.name}</div>
                        {s.instructions && (
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{s.instructions}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
