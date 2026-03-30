import { useState } from "react";
import { Shield, Focus, ShieldAlert, Filter, Plus, Trash2, X, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useBusinessDNA, DEFAULT_SAFETY_SETTINGS, type SafetySettings } from "@/components/database/BusinessDNAContext";
import { cn } from "@/lib/utils";

export function SettingsView({ activeBrandId }: { activeBrandId: string }) {
  const { brands, setBrands } = useBusinessDNA();
  const brand = brands.find((b) => b.id === activeBrandId);
  const safety: SafetySettings = brand?.safetySettings || DEFAULT_SAFETY_SETTINGS;

  const [modDialogOpen, setModDialogOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrompt, setNewPrompt] = useState("");

  const updateSafety = (patch: Partial<SafetySettings>) => {
    setBrands((prev) =>
      prev.map((b) =>
        b.id === activeBrandId
          ? { ...b, safetySettings: { ...safety, ...patch } }
          : b
      )
    );
  };

  const toggleCategory = (cat: string, enabled: boolean) => {
    updateSafety({
      moderationCategories: {
        ...safety.moderationCategories,
        [cat]: { ...safety.moderationCategories[cat], enabled },
      },
    });
  };

  const setCategoryLevel = (cat: string, level: "Low" | "Medium" | "High") => {
    updateSafety({
      moderationCategories: {
        ...safety.moderationCategories,
        [cat]: { ...safety.moderationCategories[cat], level },
      },
    });
  };

  const toggleAll = (enabled: boolean) => {
    const updated = { ...safety.moderationCategories };
    for (const key of Object.keys(updated)) {
      updated[key] = { ...updated[key], enabled };
    }
    updateSafety({ moderationCategories: updated });
  };

  const addCustom = () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    updateSafety({
      customGuardrails: [
        ...safety.customGuardrails,
        { name: newName.trim(), prompt: newPrompt.trim() },
      ],
    });
    setNewName("");
    setNewPrompt("");
  };

  const removeCustom = (idx: number) => {
    updateSafety({
      customGuardrails: safety.customGuardrails.filter((_, i) => i !== idx),
    });
  };

  const enabledModCount = Object.values(safety.moderationCategories).filter(
    (v) => v.enabled
  ).length;

  if (!brand) return null;

  return (
    <div className="space-y-6 pt-5">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Safety
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure guardrails to keep your AI employees safe and on-task.
        </p>
      </div>

      {/* Guardrail Cards */}
      <div className="space-y-3">
        {/* Focus */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Focus className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Focus</p>
              <p className="text-xs text-muted-foreground">
                Keep agents focused on their defined goal
              </p>
            </div>
          </div>
          <Switch
            checked={safety.focusEnabled}
            onCheckedChange={(v) => updateSafety({ focusEnabled: v })}
          />
        </div>

        {/* Prompt Injection */}
        <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <ShieldAlert className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Prompt Injection
              </p>
              <p className="text-xs text-muted-foreground">
                Block attempts to bypass system instructions
              </p>
            </div>
          </div>
          <Switch
            checked={safety.promptInjectionEnabled}
            onCheckedChange={(v) =>
              updateSafety({ promptInjectionEnabled: v })
            }
          />
        </div>

        {/* Moderation Guardrails */}
        <button
          onClick={() => setModDialogOpen(true)}
          className="w-full flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Filter className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Moderation Guardrails
              </p>
              <p className="text-xs text-muted-foreground">
                Filter harmful content categories
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {enabledModCount} / {Object.keys(safety.moderationCategories).length} active
          </span>
        </button>

        {/* Custom Guardrails */}
        <button
          onClick={() => setCustomDialogOpen(true)}
          className="w-full flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Plus className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Custom Guardrails
              </p>
              <p className="text-xs text-muted-foreground">
                Define your own safety rules
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {safety.customGuardrails.length} rule{safety.customGuardrails.length !== 1 ? "s" : ""}
          </span>
        </button>
      </div>

      {/* Moderation Dialog */}
      <Dialog open={modDialogOpen} onOpenChange={setModDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Moderation Guardrails</DialogTitle>
            <DialogDescription>
              Toggle categories and set severity levels.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => toggleAll(true)}
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7"
              onClick={() => toggleAll(false)}
            >
              None
            </Button>
          </div>
          <div className="space-y-3">
            {Object.entries(safety.moderationCategories).map(
              ([cat, val]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Switch
                      checked={val.enabled}
                      onCheckedChange={(v) => toggleCategory(cat, v)}
                    />
                    <span className="text-sm text-foreground truncate">
                      {cat}
                    </span>
                  </div>
                  <Select
                    value={val.level}
                    onValueChange={(v) =>
                      setCategoryLevel(cat, v as "Low" | "Medium" | "High")
                    }
                  >
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Guardrails Dialog */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Custom Guardrails</DialogTitle>
            <DialogDescription>
              Create rules to enforce specific behaviors.
            </DialogDescription>
          </DialogHeader>

          {safety.customGuardrails.length > 0 && (
            <div className="space-y-2 mb-4">
              {safety.customGuardrails.map((g, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {g.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {g.prompt}
                    </p>
                  </div>
                  <button
                    onClick={() => removeCustom(i)}
                    className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3 border-t border-border/50 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. No competitor mentions"
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Enforcement Prompt</Label>
              <Textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="e.g. Never mention or recommend competitor products..."
                className="text-sm min-h-[80px] resize-none"
              />
            </div>
            <Button
              size="sm"
              className="w-full text-xs h-8"
              onClick={addCustom}
              disabled={!newName.trim() || !newPrompt.trim()}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Guardrail
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
