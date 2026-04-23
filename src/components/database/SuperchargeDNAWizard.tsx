import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, FileUp, Filter, Loader2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import logoGmail from "@/assets/logo-gmail.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoSlack from "@/assets/logo-slack.png";

interface ConnectedProvider {
  provider: string;
  email?: string;
}

type SuperchargeStep = 1 | 2 | 3;

type UploadArtifact = {
  name: string;
  text: string;
};

const INTEGRATIONS = [
  { id: "google_gmail", label: "Gmail", logo: logoGmail },
  { id: "google_drive", label: "Google Drive", logo: logoGoogleDrive },
  { id: "microsoft_outlook", label: "Outlook", logo: logoMsOutlook },
  { id: "microsoft_onedrive", label: "OneDrive", logo: logoMsOnedrive },
  { id: "hubspot", label: "HubSpot", logo: logoHubspot },
  { id: "slack", label: "Slack", logo: logoSlack },
] as const;

export function SuperchargeDNAWizard({
  brandId,
  brandName,
  logoUrl,
  onCompleted,
}: {
  brandId: string;
  brandName?: string;
  logoUrl?: string;
  onCompleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<SuperchargeStep>(1);
  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<UploadArtifact[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const reset = () => {
    setStep(1);
    setUrls([]);
    setUrlInput("");
    setArtifacts([]);
    setLogs([]);
    setRunning(false);
    setConnectingProvider(null);
  };

  const checkConnections = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ action: "check-status" }),
      });
      if (response.ok) {
        const data = await response.json();
        setConnected(data.connected || []);
      }
    } catch (e) {
      console.error("checkConnections error", e);
    }
  };

  useEffect(() => {
    if (open) void checkConnections();
  }, [open]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get("oauth_success");
    if (!oauthSuccess || !open) return;
    toast.success("Integration connected");
    window.history.replaceState({}, "", window.location.pathname);
    void checkConnections();
  }, [open]);

  const isConnected = (providerId: string) => connected.some((p) => p.provider === providerId);

  const connectProvider = async (provider: string) => {
    try {
      setConnectingProvider(provider);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          provider,
          action: "get-auth-url",
          returnPath: window.location.pathname,
          origin: window.location.origin,
          brandId,
        }),
      });
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error(data.error || "Could not start connection");
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not start connection");
    } finally {
      setConnectingProvider(null);
    }
  };

  const addUrl = () => {
    const value = urlInput.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) {
      toast.error("Use full URL starting with http:// or https://");
      return;
    }
    setUrls((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setUrlInput("");
  };

  const onFilesPicked = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const next: UploadArtifact[] = [];
    for (const f of Array.from(picked).slice(0, 8)) {
      try {
        const text = await f.text();
        next.push({ name: f.name, text: text.slice(0, 15000) });
      } catch {
        next.push({ name: f.name, text: "" });
      }
    }
    setArtifacts((prev) => [...prev, ...next].slice(0, 12));
  };

  const runSupercharge = async () => {
    setRunning(true);
    setLogs([
      "Initializing supercharge pipeline...",
      "Collecting connection signals...",
      "Preparing file and URL evidence...",
    ]);
    try {
      const { data, error } = await supabase.functions.invoke("supercharge-dna", {
        body: {
          brandId,
          workspaceId: null,
          urls,
          artifacts,
        },
      });
      if (error) throw error;
      const remoteLogs = Array.isArray(data?.logs) ? data.logs.map((x: unknown) => String(x)) : [];
      setLogs((prev) => [...prev, ...remoteLogs]);
      if (!data?.ok) throw new Error(data?.error || "Supercharge failed");
      setLogs((prev) => [...prev, "Done. DNA pillars updated."]);
      toast.success("Business DNA supercharged");
      onCompleted?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Supercharge failed";
      setLogs((prev) => [...prev, `Error: ${message}`]);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  const nodeLayout = useMemo(() => {
    const radius = 150;
    const center = 180;
    return INTEGRATIONS.map((integration, index) => {
      const angle = (Math.PI * 2 * index) / INTEGRATIONS.length - Math.PI / 2;
      const x = center + (Math.cos(angle) * radius);
      const y = center + (Math.sin(angle) * radius);
      return { ...integration, x, y };
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) reset();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Filter className="h-4 w-4" />
          Supercharge DNA
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Supercharge DNA</DialogTitle>
          <DialogDescription>
            Step {step} of 3 - verified enrichment only (no made-up data).
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Connect data sources around your business profile.</p>
            <div className="relative mx-auto h-[360px] w-[360px] rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 360 360">
                {nodeLayout.map((n) => (
                  <line
                    key={`line-${n.id}`}
                    x1={180}
                    y1={180}
                    x2={n.x}
                    y2={n.y}
                    stroke="currentColor"
                    className="text-border"
                    strokeWidth="1.5"
                  />
                ))}
              </svg>
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-24 w-24 rounded-full border bg-card shadow flex items-center justify-center overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt={brandName || "Business"} className="h-full w-full object-contain p-2" /> : <div className="text-xs font-semibold">{brandName || "Business"}</div>}
              </div>
              {nodeLayout.map((n) => (
                <button
                  key={n.id}
                  onClick={() => void connectProvider(n.id)}
                  disabled={connectingProvider === n.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card px-2 py-1 text-xs flex items-center gap-1 hover:bg-muted disabled:opacity-60"
                  style={{ left: n.x, top: n.y }}
                  title={n.label}
                >
                  <img src={n.logo} alt={n.label} className="h-4 w-4 object-contain" />
                  <span>{isConnected(n.id) ? "Connected" : n.label}</span>
                  {isConnected(n.id) && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                  {connectingProvider === n.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Add extra context from files and URLs.</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 rounded-lg border p-3">
                <label className="text-sm font-medium">Upload files</label>
                <Input type="file" multiple onChange={(e) => void onFilesPicked(e.target.files)} />
                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                  {artifacts.map((a, i) => <div key={`${a.name}-${i}`}>- {a.name}</div>)}
                  {artifacts.length === 0 && <div>No files yet</div>}
                </div>
              </div>
              <div className="space-y-2 rounded-lg border p-3">
                <label className="text-sm font-medium">Add URLs</label>
                <div className="flex gap-2">
                  <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/report" />
                  <Button variant="outline" onClick={addUrl}><Link2 className="h-4 w-4" /></Button>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs text-muted-foreground space-y-1">
                  {urls.map((u) => <div key={u} className="truncate">- {u}</div>)}
                  {urls.length === 0 && <div>No URLs yet</div>}
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)}>
                Continue
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Running verified enrichment with integrations, files, URLs, and web evidence for gap fields (e.g. TAM/SAM/SOM).</p>
            <div className="rounded-lg border bg-black text-green-400 font-mono text-xs p-3 max-h-64 overflow-y-auto space-y-1">
              {logs.map((line, i) => <div key={`${line}-${i}`}>{line}</div>)}
              {logs.length === 0 && <div>Ready to start...</div>}
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)} disabled={running}>Back</Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>Close</Button>
                <Button onClick={() => void runSupercharge()} disabled={running}>
                  {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileUp className="h-4 w-4 mr-2" />}
                  {running ? "Running..." : "Run Supercharge"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
