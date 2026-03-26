import { useState, useEffect, useCallback, useRef } from "react";
import {
  Database, Loader2, CheckCircle2, FileText, Image, Globe, Type,
  Mail, Video, Music, Table2, ChevronDown, ChevronUp, Plug, RefreshCw, HardDrive,
  Trash2, Upload, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import { IntegrationRequestDialog } from "@/components/database/IntegrationRequestDialog";
import { SyncPreferencesDialog } from "@/components/database/SyncPreferencesDialog";

interface DataItem {
  id: string;
  data_type: string;
  source: string;
  title: string;
  content: string | null;
  analyzed_content: string | null;
  is_analyzed: boolean | null;
  created_at: string | null;
}

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4 text-primary" />,
  image: <Image className="h-4 w-4 text-primary" />,
  text: <Type className="h-4 w-4 text-primary" />,
  website: <Globe className="h-4 w-4 text-primary" />,
  email: <Mail className="h-4 w-4 text-primary" />,
  video: <Video className="h-4 w-4 text-primary" />,
  audio: <Music className="h-4 w-4 text-primary" />,
  spreadsheet: <Table2 className="h-4 w-4 text-primary" />,
};

const sourceLabels: Record<string, string> = {
  canvas: "Canvas",
  google: "Google",
  microsoft: "Microsoft",
  slack: "Slack",
  wordpress: "WordPress",
  upload: "Upload",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (!isFinite(bytes)) return "Unlimited";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

// Module-level in-memory cache so the Database tab loads instantly on re-visit
let _cachedItems: DataItem[] | null = null;
let _cachedUserId: string | null = null;

export function BusinessDataListView() {
  const [items, setItems] = useState<DataItem[]>(_cachedItems ?? []);
  const [isLoading, setIsLoading] = useState(!_cachedItems);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState(false);
  const [showSyncPrefs, setShowSyncPrefs] = useState(false);
  const { plan, getDataLimit } = useSubscription();

  const checkConnection = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "check-status" }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const ms = (data.connected || []).find((p: any) => p.provider === "microsoft");
        if (ms) {
          setIsConnected(true);
          setConnectedEmail(ms.email || null);
        }
      }
    } catch (err) {
      console.error("Check connection error:", err);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) { setIsLoading(false); return; }

        // If cache is for the same user, skip fetch
        if (_cachedItems && _cachedUserId === session.user.id) {
          setItems(_cachedItems);
          setIsLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from("user_business_data")
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (!error && data) {
          _cachedItems = data;
          _cachedUserId = session.user.id;
          setItems(data);
        }
      } catch (err) {
        console.error("Failed to fetch business data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    checkConnection();
  }, [checkConnection]);

  const handleConnect = async () => {
    setConnectingProvider(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Please log in first"); setConnectingProvider(false); return; }
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: "microsoft", action: "get-auth-url", returnPath: window.location.pathname }),
        }
      );
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Failed to get authorization URL");
      }
    } catch (err) {
      toast.error("Failed to start connection");
    }
    setConnectingProvider(false);
  };

  const handleSync = async (categories?: { emails: boolean; events: boolean; files: boolean }, limits?: { emails: number; events: number; files: number }) => {
    setSyncingProvider(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-provider-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            provider: "microsoft",
            categories: categories || { emails: true, events: true, files: true },
            limits: limits || { emails: 50, events: 50, files: 50 },
          }),
        }
      );
      const data = await response.json();
      if (data.success) {
        const s = data.summary;
        toast.success(`Synced ${s.emails || 0} emails, ${s.events || 0} events, ${s.files || 0} files`);
        // Refresh data list
        const { data: refreshed } = await (supabase as any)
          .from("user_business_data")
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(200);
        if (refreshed) { _cachedItems = refreshed; setItems(refreshed); }
      } else {
        toast.error(data.error || "Sync failed");
      }
    } catch (err) {
      toast.error("Failed to sync data");
    }
    setSyncingProvider(false);
    setShowSyncPrefs(false);
  };

  const handleDeleteItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    setDeletingId(itemId);
    try {
      await supabase.from("user_business_data").delete().eq("id", itemId);
      setItems(prev => { const next = prev.filter(i => i.id !== itemId); _cachedItems = next; return next; });
      if (expandedId === itemId) setExpandedId(null);
      toast.success("Data item deleted");
    } catch {
      toast.error("Failed to delete item");
    }
    setDeletingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error("Please log in first"); setIsUploading(false); return; }

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        const content = await file.text().catch(() => null);
        const dataType = file.type.startsWith("image/") ? "image" 
          : file.type === "application/pdf" ? "document"
          : file.type.includes("spreadsheet") || file.type.includes("csv") ? "spreadsheet"
          : "text";

        const { data, error } = await supabase
          .from("user_business_data")
          .insert({
            user_id: session.user.id,
            title: file.name,
            content: content || `[File: ${file.name}, Size: ${file.size} bytes]`,
            data_type: dataType,
            source: "upload",
            is_analyzed: false,
            workspace_id: localStorage.getItem("preferred_workspace_id"),
          })
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at")
          .single();

        if (!error && data) {
          setItems(prev => { const next = [data, ...prev]; _cachedItems = next; return next; });
        }
      }
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Upload failed");
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Calculate data usage
  const totalBytes = items.reduce((sum, item) => {
    return sum + (item.content?.length || 0) + (item.analyzed_content?.length || 0) + (item.title?.length || 0);
  }, 0);
  const dataLimit = getDataLimit();
  const usagePercent = isFinite(dataLimit) ? Math.min((totalBytes / dataLimit) * 100, 100) : 0;
  const planLabel = plan === "timewarp_og" ? "TimeWarp OG" : plan === "aristotle" ? "Aristotle" : plan === "co_founder" ? "Co-Founder" : "Free";

  const groupedBySource = items.reduce<Record<string, DataItem[]>>((acc, item) => {
    const src = item.source || "unknown";
    if (!acc[src]) acc[src] = [];
    acc[src].push(item);
    return acc;
  }, {});

  const getPreview = (item: DataItem) => {
    const text = item.analyzed_content || item.content;
    if (!text) return "No content extracted";
    return text.slice(0, 200) + (text.length > 200 ? "…" : "");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted-foreground">Loading business data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Data Usage Card */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Data Storage</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {planLabel} Plan
          </span>
        </div>
        <Progress value={usagePercent} className="h-2 mb-2" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatBytes(totalBytes)} used
          </span>
          <span className="text-xs text-muted-foreground">
            {isFinite(dataLimit) ? formatBytes(dataLimit) + " limit" : "Unlimited"}
          </span>
        </div>
      </div>

      {/* Microsoft Connection Card */}
      <div className="rounded-xl border border-border/50 bg-card/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Integrations</span>
        </div>
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border transition-all",
          isConnected ? "border-green-500/40 bg-green-500/5" : "border-border/50 hover:border-primary/30"
        )}>
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center p-1.5 flex-shrink-0">
            <img src={logoMicrosoft} alt="Microsoft" className="h-6 w-6 object-contain" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">Microsoft</p>
            {isConnected && connectedEmail ? (
              <p className="text-xs text-green-600 dark:text-green-400 truncate">{connectedEmail}</p>
            ) : (
              <p className="text-xs text-muted-foreground">Outlook, OneDrive, Calendar</p>
            )}
          </div>
          {isConnected ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSyncPrefs(true)} disabled={syncingProvider}>
                {syncingProvider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />}
              </Button>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </div>
          ) : (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 flex-shrink-0" onClick={handleConnect} disabled={connectingProvider}>
              {connectingProvider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
              Connect
            </Button>
          )}
        </div>
        <div className="mt-3 text-center">
          <IntegrationRequestDialog />
        </div>
      </div>

      {/* Data Items Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          All your connected business data in one place.
        </p>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.csv,.json,.md,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Upload
          </Button>
          <span className="text-xs text-primary flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {items.length} items
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">No business data yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Connect integrations or add data via the Data Conversion canvas
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(groupedBySource).map(([source, sourceItems]) => (
            <div key={source}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {sourceLabels[source] || source}
                </span>
                <span className="text-xs text-muted-foreground/50">({sourceItems.length})</span>
              </div>
              <div className="space-y-1.5">
                {sourceItems.map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "group rounded-lg border border-border/40 transition-all cursor-pointer hover:border-primary/30",
                        isExpanded && "border-primary/40 bg-muted/30"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {typeIcons[item.data_type] || <FileText className="h-4 w-4 text-muted-foreground" />}
                        <span className="text-sm font-medium text-foreground truncate flex-1">
                          {item.title}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.is_analyzed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Analyzed" />
                          )}
                           <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {item.data_type}
                          </span>
                          <button
                            onClick={(e) => handleDeleteItem(e, item.id)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                            title="Delete"
                          >
                            {deletingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-border/30">
                          <div className="flex items-center gap-2 mt-2 mb-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
                              {item.data_type}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Source: {sourceLabels[item.source] || item.source}
                            </span>
                            {item.created_at && (
                              <>
                                <span className="text-[10px] text-muted-foreground/40">•</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">
                            {getPreview(item)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <SyncPreferencesDialog
        open={showSyncPrefs}
        onOpenChange={setShowSyncPrefs}
        onConfirm={(cats, lims) => handleSync(cats, lims)}
        isSyncing={syncingProvider}
        currentUsageBytes={totalBytes}
        dataLimitBytes={dataLimit}
        planLabel={planLabel}
      />
    </div>
  );
}
