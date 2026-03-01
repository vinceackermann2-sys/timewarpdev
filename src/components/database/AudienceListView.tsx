import { useState, useEffect } from "react";
import { Users, Plus, Trash2, ChevronRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AudienceData, DEFAULT_AUDIENCE } from "@/components/database/AudienceDetailView";
import { AudienceDetailView } from "@/components/database/AudienceDetailView";
import { motion, AnimatePresence } from "framer-motion";

export function AudienceListView() {
  const [userName, setUserName] = useState("Unknown");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Unknown");
      }
    });
  }, []);

  const [audiences, setAudiences] = useState<AudienceData[]>([
    {
      ...DEFAULT_AUDIENCE,
      id: "example-1",
      name: "Busy Women 28–42",
      lastUpdated: "Feb 28, 2026",
    },
  ]);
  const [selectedAudienceId, setSelectedAudienceId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const selectedAudience = audiences.find(a => a.id === selectedAudienceId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const newAudience: AudienceData = {
      ...DEFAULT_AUDIENCE,
      id: `audience-${Date.now()}`,
      name: newName.trim(),
      lastUpdated: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
    };
    setAudiences(prev => [...prev, newAudience]);
    setNewName("");
    setIsCreating(false);
  };

  const handleDelete = (id: string) => {
    setAudiences(prev => prev.filter(a => a.id !== id));
    if (selectedAudienceId === id) setSelectedAudienceId(null);
  };

  const handleSave = (updated: AudienceData) => {
    setAudiences(prev => prev.map(a => a.id === updated.id ? updated : a));
  };

  if (selectedAudience) {
    return (
      <div className="-mx-6 pt-0">
        <AudienceDetailView
          audience={selectedAudience}
          onBack={() => setSelectedAudienceId(null)}
          onSave={handleSave}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">My Audiences</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {audiences.length} audience{audiences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? <span>Cancel</span> : <><Plus className="h-3.5 w-3.5" /> New Audience</>}
        </Button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
              <label className="text-xs font-medium text-muted-foreground">Audience Name</label>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Young Professionals 25-35"
                  className="h-9 text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <Button size="sm" className="h-9" onClick={handleCreate} disabled={!newName.trim()}>
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {audiences.length > 0 ? (
        <div className="space-y-2">
          {audiences.map((audience) => (
            <div
              key={audience.id}
              className="group rounded-xl border border-border/40 bg-card/50 hover:bg-card transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 px-4 py-3.5" onClick={() => setSelectedAudienceId(audience.id)}>
                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{audience.name}</p>
                  <p className="text-xs text-muted-foreground">Audience Segment · Updated {audience.lastUpdated}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70"><Lock className="h-2.5 w-2.5" />Private</span>
                    <span className="text-[10px] text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground/70">Last updated: {audience.lastUpdated}</span>
                    <span className="text-[10px] text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground/70">Added by: {userName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(audience.id); }}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No audiences yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create your first audience segment to get started</p>
        </div>
      )}
    </div>
  );
}
