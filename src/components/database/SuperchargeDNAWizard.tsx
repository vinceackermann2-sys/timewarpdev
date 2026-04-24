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

  // Radial layout — fixed canvas so SVG and absolutely-positioned nodes share the same center
  const CANVAS = 520;
  const CENTER = CANVAS / 2;
  const RADIUS = 195;
  const ICON_SIZE = 60;
  const CENTER_NODE_SIZE = 128;

  const nodeLayout = useMemo(() => {
    return INTEGRATIONS.map((integration, index) => {
      const angle = (Math.PI * 2 * index) / INTEGRATIONS.length - Math.PI / 2;
      const x = CENTER + Math.cos(angle) * RADIUS;
      const y = CENTER + Math.sin(angle) * RADIUS;
      return { ...integration, x, y, angle };
    });
  }, []);

  const STEP_LABELS = ["Connect", "Add context", "Supercharge"];

  const TopProgressBar = (
    <div className="w-full">
      <div className="flex items-center gap-3">
        {STEP_LABELS.map((label, idx) => {
          const stepNum = (idx + 1) as SuperchargeStep;
          const isActive = step === stepNum;
          const isComplete = step > stepNum;
          return (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-all",
                  isComplete && "bg-primary text-primary-foreground",
                  isActive && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                  !isActive && !isComplete && "bg-muted text-muted-foreground"
                )}
              >
                {isComplete ? <CheckCircle2 className="h-3.5 w-3.5" /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden sm:inline",
                  (isActive || isComplete) ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              {idx < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden mx-1">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: isComplete ? "100%" : isActive ? "50%" : "0%" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const FooterActions = (
    <>
      {step === 1 && (
        <>
          <p className="text-xs text-muted-foreground hidden sm:block">
            {connected.length === 0
              ? "Skip if you'd rather just upload files in the next step."
              : `${connected.length} integration${connected.length === 1 ? "" : "s"} connected`}
          </p>
          <div className="flex-1" />
          <Button onClick={() => setStep(2)} size="lg">
            Continue <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </>
      )}
      {step === 2 && (
        <>
          <Button variant="outline" onClick={() => setStep(1)} size="lg">Back</Button>
          <div className="flex-1" />
          <Button onClick={() => setStep(3)} size="lg">
            Continue <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        </>
      )}
      {step === 3 && (
        <>
          <Button variant="outline" onClick={() => setStep(2)} disabled={running} size="lg">
            Back
          </Button>
          <div className="flex-1" />
          {!embedded && (
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running} size="lg">
              Close
            </Button>
          )}
          <Button
            onClick={() => void runSupercharge()}
            disabled={running}
            size="lg"
            className="gap-2"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {running ? "Supercharging..." : "Run Supercharge"}
          </Button>
        </>
      )}
    </>
  );

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

          <div
            className="relative mx-auto"
            style={{ height: CANVAS, width: CANVAS }}
          >
            {/* Soft radial backdrop */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                width: RADIUS * 2 + ICON_SIZE,
                height: RADIUS * 2 + ICON_SIZE,
                background:
                  "radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, hsl(var(--primary) / 0.02) 50%, transparent 75%)",
              }}
            />
            <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-visible" viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="hsl(var(--border))"
                strokeWidth="1"
                strokeDasharray="2 6"
                opacity="0.5"
              />
              {nodeLayout.map((n) => {
                const active = isConnected(n.id);
                const dx = n.x - CENTER;
                const dy = n.y - CENTER;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const endTrim = ICON_SIZE / 2 + 8;
                const startTrim = CENTER_NODE_SIZE / 2;
                const startX = CENTER + (dx / len) * startTrim;
                const startY = CENTER + (dy / len) * startTrim;
                const endX = n.x - (dx / len) * endTrim;
                const endY = n.y - (dy / len) * endTrim;
                return (
                  <line
                    key={`line-${n.id}`}
                    x1={startX}
                    y1={startY}
                    x2={endX}
                    y2={endY}
                    stroke="hsl(var(--primary))"
                    strokeOpacity={active ? 0.7 : 0.18}
                    strokeWidth={active ? 3 : 2}
                    strokeDasharray={active ? undefined : "7 7"}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute rounded-full border bg-card shadow-xl flex items-center justify-center overflow-hidden ring-4 ring-primary/10"
              style={{
                left: CENTER - CENTER_NODE_SIZE / 2,
                top: CENTER - CENTER_NODE_SIZE / 2,
                width: CENTER_NODE_SIZE,
                height: CENTER_NODE_SIZE,
              }}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={brandName || "Business"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-center px-3">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                  <div className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">
                    {brandName || "Business"}
                  </div>
                </div>
              )}
            </motion.div>

            {nodeLayout.map((n, i) => {
              const connected_ = isConnected(n.id);
              const isLoading = connectingProvider === n.id;
              return (
                <div
                  key={n.id}
                  className="absolute"
                  style={{ left: n.x, top: n.y, transform: "translate(-50%, -50%)" }}
                >
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 200 }}
                    onClick={() => !connected_ && void connectProvider(n.id)}
                    disabled={isLoading || connected_}
                    title={connected_ ? `${n.label} connected` : `Connect ${n.label}`}
                    className={cn(
                      "relative flex items-center justify-center rounded-2xl border bg-card shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-primary/40",
                      connected_
                        ? "border-primary/60 bg-primary/5 ring-2 ring-primary/30 cursor-default"
                        : "border-border hover:border-primary/50 hover:scale-110 hover:shadow-lg cursor-pointer"
                    )}
                    style={{ height: ICON_SIZE, width: ICON_SIZE }}
                  >
                    <img src={n.logo} alt={n.label} className="h-9 w-9 object-contain" />
                    {connected_ && (
                      <div className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {isLoading && (
                      <div className="absolute inset-0 rounded-2xl bg-background/70 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    )}
                  </motion.button>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                    style={{ top: ICON_SIZE / 2 + 8 }}
                  >
                    <span
                      className={cn(
                        "text-xs font-medium",
                        connected_ ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {n.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────── STEP 2 — Files + URLs ───────────── */}
      {step === 2 && (
        <div className="space-y-10 max-w-4xl mx-auto w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Add business context</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              Add files and URLs that hold business context — pitch decks, reports, market research.
            </p>
          </div>

          {/* Files section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileUp className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">Files</h3>
              </div>
              {artifacts.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {artifacts.length} of 12
                </span>
              )}
            </div>

            <label
              htmlFor="supercharge-files"
              className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-gradient-to-b from-muted/20 to-muted/40 px-6 py-16 text-center transition-all hover:border-primary/60 hover:from-primary/5 hover:to-primary/10"
            >
              <div className="h-16 w-16 rounded-2xl bg-card border shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:border-primary/40 transition-transform">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Drop files or click to upload</p>
                <p className="text-xs text-muted-foreground mt-1">PDFs, docs, sheets, text · Up to 12 files</p>
              </div>
              <Input
                id="supercharge-files"
                type="file"
                multiple
                className="hidden"
                onChange={(e) => void onFilesPicked(e.target.files)}
              />
            </label>

            {artifacts.length > 0 && (
              <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <div className="divide-y divide-border max-h-56 overflow-y-auto">
                  {artifacts.map((a, i) => (
                    <div
                      key={`${a.name}-${i}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FileUp className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{formatBytes(a.size)}</p>
                      </div>
                      <button
                        onClick={() => removeArtifact(i)}
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* URLs section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-base font-semibold text-foreground">URLs</h3>
              </div>
              {urls.length > 0 && (
                <span className="text-xs text-muted-foreground">{urls.length} added</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  className="pl-10 h-12 rounded-xl text-base"
                />
              </div>
              <Button onClick={addUrl} className="gap-1.5 h-12 rounded-xl">
                <Plus className="h-4 w-4" /> Add
              </Button>
            </div>

            {urls.length > 0 && (
              <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {urls.map((u) => (
                    <div
                      key={u}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Link2 className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground truncate flex-1">{u}</span>
                      <button
                        onClick={() => removeUrl(u)}
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground transition-colors"
                        aria-label="Remove URL"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* ───────────── STEP 3 — Forging timeline ───────────── */}
      {step === 3 && (
        <div className="space-y-6 max-w-3xl mx-auto w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Supercharge your DNA</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
              Verified enrichment — integrations, files, URLs, and web evidence for gap fields.
            </p>
          </div>

          <div className="rounded-3xl border border-black/5 bg-gradient-to-b from-[#f1f5fc] to-[#e8eef9] p-9 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-[#4a86ff]/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#4a86ff]" />
              </div>
              <div>
                <p className="text-base font-semibold text-[#1a1f36] leading-tight">
                  Supercharging your Business DNA
                </p>
                <p className="text-[12px] text-[#697386]">
                  Verified enrichment in progress
                </p>
              </div>
            </div>
            <ul className="space-y-3">
              {forgingTodos.map((t, idx) => {
                const previousDone = idx === 0 || forgingTodos[idx - 1].done;
                const isActive = running && !t.done && previousDone;
                return (
                  <li
                    key={t.label}
                    className={cn(
                      "flex items-center gap-3 text-[15px] rounded-xl px-4 py-3 transition-all",
                      isActive && "bg-white/60",
                      t.done && "opacity-90"
                    )}
                  >
                    {t.done ? (
                      <div className="h-7 w-7 rounded-full bg-[#4a86ff] flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    ) : isActive ? (
                      <div className="h-7 w-7 rounded-full bg-[#4a86ff]/15 flex items-center justify-center shrink-0">
                        <Loader2 className="w-4 h-4 text-[#4a86ff] animate-spin" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border-2 border-[#cbd5e1] shrink-0" />
                    )}
                    <span
                      className={cn(
                        t.done
                          ? "text-[#1a1f36] font-medium"
                          : isActive
                          ? "text-[#1a1f36] font-medium"
                          : "text-[#697386]"
                      )}
                    >
                      {t.label}
                    </span>
                  </li>
                );
              })}
            </ul>

            {logs.length > 0 && (
              <div className="mt-6 pt-5 border-t border-black/5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#697386] mb-2">
                  Activity
                </p>
                <div className="font-mono text-[11px] text-[#697386] space-y-0.5 max-h-32 overflow-y-auto">
                  {logs.slice(-6).map((line, i) => (
                    <div key={`${line}-${i}`} className="truncate">
                      › {line}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="flex flex-col min-h-[calc(100vh-3rem)] w-full">
        {/* Top progress bar */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <div className="max-w-5xl mx-auto w-full px-6 py-4">
            {TopProgressBar}
          </div>
        </div>

        {/* Main content area — bigger and centered */}
        <div className="flex-1 w-full px-6 py-10">
          <div className="max-w-5xl mx-auto w-full">
            {stepsContent}
          </div>
        </div>

        {/* Sticky bottom continue bar */}
        <div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur border-t border-border">
          <div className="max-w-5xl mx-auto w-full px-6 py-4 flex items-center gap-3">
            {FooterActions}
          </div>
        </div>
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
      <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="sr-only">Supercharge Business DNA</DialogTitle>
          <DialogDescription className="sr-only">
            Verified enrichment only (no made-up data).
          </DialogDescription>
          {TopProgressBar}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {stepsContent}
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center gap-3">
          {FooterActions}
        </div>
      </DialogContent>
    </Dialog>
  );
}
