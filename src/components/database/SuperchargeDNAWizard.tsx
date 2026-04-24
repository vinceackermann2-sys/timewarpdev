import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, FileUp, Filter, Loader2, Link2, Plus, X, Upload, Sparkles, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import logoGmail from "@/assets/logo-gmail.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoGoogleCalendar from "@/assets/logo-google-calendar.svg";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsTeams from "@/assets/logo-ms-teams.svg";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoZoom from "@/assets/logo-zoom.svg";

interface ConnectedProvider {
  provider: string;
  email?: string;
}

type SuperchargeStep = 1 | 2 | 3;

type UploadArtifact = {
  name: string;
  text: string;
  size: number;
};

const INTEGRATIONS = [
  { id: "google_gmail", label: "Gmail", logo: logoGmail },
  { id: "google_drive", label: "Drive", logo: logoGoogleDrive },
  { id: "google_calendar", label: "Calendar", logo: logoGoogleCalendar },
  { id: "microsoft_outlook", label: "Outlook", logo: logoMsOutlook },
  { id: "microsoft_onedrive", label: "OneDrive", logo: logoMsOnedrive },
  { id: "microsoft_teams", label: "Teams", logo: logoMsTeams },
  { id: "hubspot", label: "HubSpot", logo: logoHubspot },
  { id: "slack", label: "Slack", logo: logoSlack },
  { id: "zoom", label: "Zoom", logo: logoZoom },
] as const;

function formatBytes(b: number) {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(b) / Math.log(1024)));
  return `${(b / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`;
}

export function SuperchargeDNAWizard({
  brandId,
  brandName,
  logoUrl,
  onCompleted,
  embedded = false,
  triggerLabel = "Supercharge DNA",
}: {
  brandId: string;
  brandName?: string;
  logoUrl?: string;
  onCompleted?: () => void;
  embedded?: boolean;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(embedded);
  const [step, setStep] = useState<SuperchargeStep>(1);
  const [connected, setConnected] = useState<ConnectedProvider[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<UploadArtifact[]>([]);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [forgingTodos, setForgingTodos] = useState<{ label: string; done: boolean }[]>([
    { label: "Collecting connection signals", done: false },
    { label: "Indexing uploaded files", done: false },
    { label: "Fetching URL evidence", done: false },
    { label: "Validating against pillars", done: false },
    { label: "Saving supercharged DNA", done: false },
  ]);

  const reset = () => {
    setStep(1);
    setUrls([]);
    setUrlInput("");
    setArtifacts([]);
    setLogs([]);
    setRunning(false);
    setConnectingProvider(null);
    setForgingTodos((prev) => prev.map((t) => ({ ...t, done: false })));
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

  const removeUrl = (u: string) => setUrls((prev) => prev.filter((x) => x !== u));
  const removeArtifact = (i: number) => setArtifacts((prev) => prev.filter((_, idx) => idx !== i));

  const onFilesPicked = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const next: UploadArtifact[] = [];
    for (const f of Array.from(picked).slice(0, 8)) {
      try {
        const text = await f.text();
        next.push({ name: f.name, text: text.slice(0, 15000), size: f.size });
      } catch {
        next.push({ name: f.name, text: "", size: f.size });
      }
    }
    setArtifacts((prev) => [...prev, ...next].slice(0, 12));
  };

  const runSupercharge = async () => {
    setRunning(true);
    setLogs(["Initializing supercharge pipeline..."]);
    setForgingTodos((prev) => prev.map((t) => ({ ...t, done: false })));

    const markTodo = (idx: number) => {
      setForgingTodos((prev) => prev.map((t, i) => (i === idx ? { ...t, done: true } : t)));
    };

    try {
      // Animate the first three local stages while the function runs
      setTimeout(() => markTodo(0), 600);
      setTimeout(() => markTodo(1), 1400);
      setTimeout(() => markTodo(2), 2200);

      const { data, error } = await supabase.functions.invoke("supercharge-dna", {
        body: { brandId, workspaceId: null, urls, artifacts },
      });
      if (error) throw error;
      const remoteLogs = Array.isArray(data?.logs) ? data.logs.map((x: unknown) => String(x)) : [];
      setLogs((prev) => [...prev, ...remoteLogs]);
      if (!data?.ok) throw new Error(data?.error || "Supercharge failed");

      markTodo(3);
      setTimeout(() => markTodo(4), 400);
      setLogs((prev) => [...prev, "Done. DNA pillars updated."]);
      toast.success("Business DNA supercharged");
      setTimeout(() => onCompleted?.(), 700);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Supercharge failed";
      setLogs((prev) => [...prev, `Error: ${message}`]);
      toast.error(message);
    } finally {
      setRunning(false);
    }
  };

  // Radial layout for integrations around the center logo
  const nodeLayout = useMemo(() => {
    const radius = 175;
    const center = 230;
    return INTEGRATIONS.map((integration, index) => {
      const angle = (Math.PI * 2 * index) / INTEGRATIONS.length - Math.PI / 2;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      return { ...integration, x, y, angle };
    });
  }, []);

  const stepsContent = (
    <>
      {/* ───────────── STEP 1 — Integrations radial ───────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Connect your tools to feed real signals into your Business DNA.
            </p>
          </div>

          <div className="relative mx-auto h-[460px] w-[460px] max-w-full">
            {/* SVG branches */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 460 460">
              <defs>
                <linearGradient id="branchActive" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {nodeLayout.map((n) => {
                const active = isConnected(n.id);
                return (
                  <line
                    key={`line-${n.id}`}
                    x1={230}
                    y1={230}
                    x2={n.x}
                    y2={n.y}
                    stroke={active ? "url(#branchActive)" : "hsl(var(--border))"}
                    strokeWidth={active ? 2 : 1.25}
                    strokeDasharray={active ? "0" : "4 4"}
                    className={active ? "animate-pulse" : ""}
                  />
                );
              })}
            </svg>

            {/* Center business logo */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-28 w-28 rounded-2xl border bg-card shadow-lg flex items-center justify-center overflow-hidden"
            >
              {logoUrl ? (
                <img src={logoUrl} alt={brandName || "Business"} className="h-full w-full object-contain p-3" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-center px-2">
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                  <div className="text-[10px] font-semibold text-foreground line-clamp-2">{brandName || "Business"}</div>
                </div>
              )}
            </motion.div>

            {/* Integration nodes */}
            {nodeLayout.map((n, i) => {
              const connected_ = isConnected(n.id);
              const isLoading = connectingProvider === n.id;
              return (
                <motion.button
                  key={n.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 200 }}
                  onClick={() => !connected_ && void connectProvider(n.id)}
                  disabled={isLoading || connected_}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center gap-1.5 focus:outline-none",
                    !connected_ && "cursor-pointer"
                  )}
                  style={{ left: n.x, top: n.y }}
                  title={connected_ ? `${n.label} connected` : `Connect ${n.label}`}
                >
                  <div
                    className={cn(
                      "relative h-14 w-14 rounded-2xl border bg-card flex items-center justify-center transition-all shadow-sm",
                      connected_
                        ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30"
                        : "border-border group-hover:border-primary/50 group-hover:scale-105"
                    )}
                  >
                    <img src={n.logo} alt={n.label} className="h-7 w-7 object-contain" />
                    {connected_ && (
                      <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {isLoading && (
                      <div className="absolute inset-0 rounded-2xl bg-background/70 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                  <span className={cn("text-[11px] font-medium", connected_ ? "text-primary" : "text-muted-foreground")}>
                    {n.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              {connected.length === 0
                ? "Skip if you'd rather just upload files in the next step."
                : `${connected.length} integration${connected.length === 1 ? "" : "s"} connected`}
            </p>
            <Button onClick={() => setStep(2)}>
              Continue <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ───────────── STEP 2 — Files + URLs ───────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Add files and URLs that hold business context — pitch decks, reports, market research.
            </p>
          </div>

          {/* Centered file uploader */}
          <div>
            <label
              htmlFor="supercharge-files"
              className="mx-auto flex max-w-2xl cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop files or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">Up to 12 files · PDFs, docs, sheets, text</p>
              </div>
              <Input
                id="supercharge-files"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void onFilesPicked(e.target.files)}
              />
            </label>

            {/* File sorter list */}
            {artifacts.length > 0 && (
              <div className="mx-auto mt-4 max-w-2xl space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  {artifacts.length} file{artifacts.length === 1 ? "" : "s"} added
                </p>
                <div className="rounded-xl border bg-card divide-y max-h-48 overflow-y-auto">
                  {artifacts.map((a, i) => (
                    <div key={`${a.name}-${i}`} className="flex items-center gap-3 px-3 py-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileUp className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                      </div>
                      <button
                        onClick={() => removeArtifact(i)}
                        className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* URL adder */}
          <div className="mx-auto max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addUrl();
                    }
                  }}
                  placeholder="https://example.com/report"
                  className="pl-9"
                />
              </div>
              <Button variant="outline" onClick={addUrl} className="gap-1.5">
                <Plus className="h-4 w-4" /> Add URL
              </Button>
            </div>

            {urls.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground px-1">
                  {urls.length} URL{urls.length === 1 ? "" : "s"} added
                </p>
                <div className="rounded-xl border bg-card divide-y max-h-40 overflow-y-auto">
                  {urls.map((u) => (
                    <div key={u} className="flex items-center gap-3 px-3 py-2">
                      <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground truncate flex-1">{u}</span>
                      <button
                        onClick={() => removeUrl(u)}
                        className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)}>
              Continue <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      )}

      {/* ───────────── STEP 3 — Forging timeline ───────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Verified enrichment — integrations, files, URLs, and web evidence for gap fields.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <div className="rounded-2xl border border-black/5 bg-[#eef2f7] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-[#4a86ff]" />
                <p className="text-[14px] font-semibold text-[#1a1f36]">Supercharging your Business DNA</p>
              </div>
              <ul className="space-y-2.5">
                {forgingTodos.map((t, idx) => {
                  const previousDone = idx === 0 || forgingTodos[idx - 1].done;
                  const isActive = running && !t.done && previousDone;
                  return (
                    <li key={t.label} className="flex items-center gap-2.5 text-[13.5px]">
                      {t.done ? (
                        <CheckCircle2 className="w-4 h-4 text-[#4a86ff] shrink-0" />
                      ) : isActive ? (
                        <Loader2 className="w-4 h-4 text-[#4a86ff] shrink-0 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-[#cbd5e1] shrink-0" />
                      )}
                      <span className={cn(t.done ? "text-[#1a1f36] font-medium" : "text-[#697386]")}>
                        {t.label}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {logs.length > 0 && (
                <div className="mt-4 pt-4 border-t border-black/5">
                  <div className="font-mono text-[11px] text-[#697386] space-y-0.5 max-h-32 overflow-y-auto">
                    {logs.slice(-6).map((line, i) => (
                      <div key={`${line}-${i}`} className="truncate">› {line}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={running}>Back</Button>
            <div className="flex items-center gap-2">
              {!embedded && (
                <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>Close</Button>
              )}
              <Button onClick={() => void runSupercharge()} disabled={running} className="gap-2">
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {running ? "Supercharging..." : "Run Supercharge"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Supercharge Business DNA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step {step} of 3 — verified enrichment only (no made-up data).
          </p>
        </div>
        {stepsContent}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) reset();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Filter className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl w-[95vw]">
        <DialogHeader>
          <DialogTitle>Supercharge Business DNA</DialogTitle>
          <DialogDescription>
            Step {step} of 3 — verified enrichment only (no made-up data).
          </DialogDescription>
        </DialogHeader>
        {stepsContent}
      </DialogContent>
    </Dialog>
  );
}
