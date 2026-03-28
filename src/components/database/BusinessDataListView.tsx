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
import logoGoogle from "@/assets/logo-google.png";
import logoSlack from "@/assets/logo-slack.png";
import logoFortknox from "@/assets/logo-fortknox.png";
import { IntegrationRequestDialog } from "@/components/database/IntegrationRequestDialog";
import { SyncPreferencesDialog } from "@/components/database/SyncPreferencesDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
let _cachedCacheKey: string | null = null;

export function BusinessDataListView({ activeBrandId }: { activeBrandId: string }) {
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
  const [showIntegrations, setShowIntegrations] = useState(false);
  const { plan, getDataLimit } = useSubscription();
  const [realUsageBytes, setRealUsageBytes] = useState<number>(0);

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

        const wsId = localStorage.getItem("preferred_workspace_id");
        const currentKey = `${session.user.id}:${wsId || "personal"}:${activeBrandId}`;

        // If cache matches current user+workspace+brand, skip fetch
        if (_cachedItems && _cachedCacheKey === currentKey) {
          setItems(_cachedItems);
          setIsLoading(false);
          return;
        }

        let query = (supabase as any)
          .from("user_business_data")
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at, metadata")
          .order("created_at", { ascending: false })
          .limit(200);

        if (wsId) {
          query = query.eq("workspace_id", wsId);
        } else {
          query = query.eq("user_id", session.user.id);
        }

        // Filter to items belonging to this brand
        query = query.eq("metadata->>brandId", activeBrandId);

        const { data, error } = await query;

        if (!error && data) {
          _cachedItems = data;
          _cachedCacheKey = currentKey;
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

    // Fetch real storage usage from subscription record
    const fetchUsage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await (supabase as any)
        .from("user_subscriptions")
        .select("data_used_bytes")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (data) setRealUsageBytes(data.data_used_bytes || 0);
    };
    fetchUsage();
  }, [checkConnection, activeBrandId]);

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

  const handleDisconnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      // Delete the connection record
      await (supabase as any).from("user_connections").delete().eq("user_id", session.user.id).eq("provider", "microsoft");
      // Delete OAuth tokens
      // (tokens table has RLS deny-all, but we try; the connect-provider function handles this server-side)
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: "microsoft", action: "disconnect" }),
        }
      );
      setIsConnected(false);
      setConnectedEmail(null);
      toast.success("Microsoft disconnected");
    } catch {
      toast.error("Failed to disconnect");
    }
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
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at, metadata")
          .eq("user_id", session.user.id)
          .eq("metadata->>brandId", activeBrandId)
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
      // Refresh real usage (trigger auto-recalculates)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: sub } = await (supabase as any).from("user_subscriptions").select("data_used_bytes").eq("user_id", session.user.id).maybeSingle();
        if (sub) setRealUsageBytes(sub.data_used_bytes || 0);
      }
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

      const dataLimit = getDataLimit();

      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`);
          continue;
        }

        // Check storage limit before uploading
        if (isFinite(dataLimit) && (realUsageBytes + file.size) > dataLimit) {
          toast.error("Storage limit reached. Upgrade your plan for more space.");
          break;
        }

        const isBinary = file.type === "application/pdf" || file.type.startsWith("image/") ||
          file.type.includes("spreadsheet") || file.type.includes("excel") ||
          file.type === "application/msword" || file.type.includes("wordprocessingml");

        let content: string | null = null;
        if (!isBinary) {
          content = await file.text().catch(() => null);
        }

        const dataType = file.type.startsWith("image/") ? "image" 
          : file.type === "application/pdf" ? "document"
          : file.type.includes("spreadsheet") || file.type.includes("csv") ? "spreadsheet"
          : "text";

        const { data, error } = await supabase
          .from("user_business_data")
          .insert({
            user_id: session.user.id,
            title: file.name,
            content: content || `[File: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes]`,
            data_type: dataType,
            source: "upload",
            is_analyzed: false,
            workspace_id: localStorage.getItem("preferred_workspace_id"),
            metadata: { brandId: activeBrandId, file_size: file.size },
          })
          .select("id, data_type, source, title, content, analyzed_content, is_analyzed, created_at, metadata")
          .single();

        if (!error && data) {
          setItems(prev => { const next = [data, ...prev]; _cachedItems = next; return next; });
          setRealUsageBytes(prev => prev + file.size);
        }
      }
      toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`);
    } catch {
      toast.error("Upload failed");
    }
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Use real tracked usage from DB
  const dataLimit = getDataLimit();
  const usagePercent = isFinite(dataLimit) ? Math.min((realUsageBytes / dataLimit) * 100, 100) : 0;
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
            {formatBytes(realUsageBytes)} used
          </span>
          <span className="text-xs text-muted-foreground">
            {isFinite(dataLimit) ? formatBytes(dataLimit) + " limit" : "Unlimited"}
          </span>
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
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowIntegrations(prev => !prev)}
          >
            <Plug className="h-3.5 w-3.5" />
            Integrations
          </Button>
        </div>
      </div>

      {/* Integrations Dialog */}
      <Dialog open={showIntegrations} onOpenChange={setShowIntegrations}>
        <DialogContent className="sm:max-w-[700px] sm:max-h-[700px] overflow-auto">
          <DialogHeader>
            <DialogTitle>Integrations</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
            {/* Microsoft - Active */}
            <div className={cn(
              "flex flex-col gap-3 p-5 rounded-xl border transition-all",
              isConnected ? "border-primary/40 bg-primary/5" : "border-border/50 hover:border-primary/30"
            )}>
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                  <img src={logoMicrosoft} alt="Microsoft" className="h-7 w-7 object-contain" />
                </div>
                {isConnected && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Enabled</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Microsoft</p>
                <p className="text-xs text-muted-foreground">Outlook, OneDrive, Calendar</p>
              </div>
              {isConnected ? (
                <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5 text-destructive hover:text-destructive" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              ) : (
                <Button variant="outline" size="sm" className="h-8 text-xs w-full gap-1.5" onClick={handleConnect} disabled={connectingProvider}>
                  {connectingProvider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                  Connect
                </Button>
              )}
            </div>

            {/* Google - Coming Soon */}
            <div className="flex flex-col gap-3 p-5 rounded-xl border border-border/50 opacity-60">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                  <img src={logoGoogle} alt="Google" className="h-7 w-7 object-contain" loading="lazy" />
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
              </div>
              <div>
                <p className="text-sm font-medium">Google</p>
                <p className="text-xs text-muted-foreground">Gmail, Drive, Calendar</p>
              </div>
            </div>

            {/* Slack - Coming Soon */}
            <div className="flex flex-col gap-3 p-5 rounded-xl border border-border/50 opacity-60">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                  <img src={logoSlack} alt="Slack" className="h-7 w-7 object-contain" loading="lazy" />
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
              </div>
              <div>
                <p className="text-sm font-medium">Slack</p>
                <p className="text-xs text-muted-foreground">Messages and workspace data</p>
              </div>
            </div>

            {/* FortKnox - Coming Soon */}
            <div className="flex flex-col gap-3 p-5 rounded-xl border border-border/50 opacity-60">
              <div className="flex items-center justify-between">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center p-1.5">
                  <img src={logoFortknox} alt="FortKnox" className="h-7 w-7 object-contain" loading="lazy" />
                </div>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Soon</span>
              </div>
              <div>
                <p className="text-sm font-medium">FortKnox</p>
                <p className="text-xs text-muted-foreground">Secure data vault integration</p>
              </div>
            </div>
          </div>
          <div className="text-center pt-2">
            <IntegrationRequestDialog />
          </div>
        </DialogContent>
      </Dialog>

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
        currentUsageBytes={realUsageBytes}
        dataLimitBytes={dataLimit}
        planLabel={planLabel}
      />
    </div>
  );
}
