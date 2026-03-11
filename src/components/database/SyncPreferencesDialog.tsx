import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Calendar, FileText, HardDrive } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SyncPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (categories: { emails: boolean; events: boolean; files: boolean }, limits: { emails: number; events: number; files: number }) => void;
  isSyncing: boolean;
  currentUsageBytes: number;
  dataLimitBytes: number;
  planLabel: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (!isFinite(bytes)) return "Unlimited";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

export function SyncPreferencesDialog({
  open, onOpenChange, onConfirm, isSyncing,
  currentUsageBytes, dataLimitBytes, planLabel,
}: SyncPreferencesDialogProps) {
  const [categories, setCategories] = useState({ emails: true, events: true, files: true });
  const [limits, setLimits] = useState({ emails: 50, events: 50, files: 30 });

  const usagePercent = isFinite(dataLimitBytes) ? Math.min((currentUsageBytes / dataLimitBytes) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Sync Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Storage usage */}
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Storage — {planLabel} Plan</span>
            </div>
            <Progress value={usagePercent} className="h-1.5 mb-1.5" />
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">{formatBytes(currentUsageBytes)} used</span>
              <span className="text-[10px] text-muted-foreground">{isFinite(dataLimitBytes) ? formatBytes(dataLimitBytes) : "Unlimited"}</span>
            </div>
          </div>

          {/* Category toggles */}
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Choose what data to sync and how many items per category.</p>

            {/* Emails */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sync-emails"
                  checked={categories.emails}
                  onCheckedChange={(v) => setCategories(p => ({ ...p, emails: !!v }))}
                />
                <Label htmlFor="sync-emails" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <Mail className="h-3.5 w-3.5 text-primary" /> Emails
                </Label>
              </div>
              {categories.emails && (
                <div className="flex items-center gap-3 pl-6">
                  <Slider
                    value={[limits.emails]}
                    onValueChange={([v]) => setLimits(p => ({ ...p, emails: v }))}
                    min={5} max={200} step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">{limits.emails}</span>
                </div>
              )}
            </div>

            {/* Events */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sync-events"
                  checked={categories.events}
                  onCheckedChange={(v) => setCategories(p => ({ ...p, events: !!v }))}
                />
                <Label htmlFor="sync-events" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> Calendar Events
                </Label>
              </div>
              {categories.events && (
                <div className="flex items-center gap-3 pl-6">
                  <Slider
                    value={[limits.events]}
                    onValueChange={([v]) => setLimits(p => ({ ...p, events: v }))}
                    min={5} max={200} step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">{limits.events}</span>
                </div>
              )}
            </div>

            {/* Files */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sync-files"
                  checked={categories.files}
                  onCheckedChange={(v) => setCategories(p => ({ ...p, files: !!v }))}
                />
                <Label htmlFor="sync-files" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <FileText className="h-3.5 w-3.5 text-primary" /> Files (OneDrive)
                </Label>
              </div>
              {categories.files && (
                <div className="flex items-center gap-3 pl-6">
                  <Slider
                    value={[limits.files]}
                    onValueChange={([v]) => setLimits(p => ({ ...p, files: v }))}
                    min={5} max={200} step={5}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">{limits.files}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSyncing}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onConfirm(categories, limits)}
            disabled={isSyncing || (!categories.emails && !categories.events && !categories.files)}
          >
            {isSyncing ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Syncing...</> : "Start Sync"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
