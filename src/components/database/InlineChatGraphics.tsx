import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FileText, PieChart, Table2, Presentation, TrendingUp, TrendingDown, Minus, Download, Save, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraphicEditorDialog } from "./GraphicEditorDialog";

const COLORS = [
  "#3399ff", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
];

function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(2.55 * percent)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent)));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + Math.round(2.55 * percent)));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, "0")}`;
}

function GraphicActions({ onSave, onDownload, editor }: { onSave: () => void; onDownload: () => void; editor?: ReactNode }) {
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await onSave();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="ml-auto flex items-center gap-1">
      {editor}
      <button onClick={handleSave} className="p-1 rounded hover:bg-[#3399ff]/20 transition-colors" title="Save to database">
        {saved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5 text-[#3399ff]" />}
      </button>
      <button onClick={onDownload} className="p-1 rounded hover:bg-[#3399ff]/20 transition-colors" title="Download">
        <Download className="w-3.5 h-3.5 text-[#3399ff]" />
      </button>
    </div>
  );
}

async function saveToDatabase(title: string, dataType: string, content: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) { toast.error("Sign in to save"); return; }
  const wsId = localStorage.getItem("preferred_workspace_id");
  const { error } = await supabase.from("user_business_data").insert({
    user_id: session.user.id,
    workspace_id: wsId || null,
    title,
    data_type: dataType,
    content,
    source: "ai-graphic",
  });
  if (error) toast.error("Failed to save");
  else toast.success("Saved to database");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

interface DocSection { heading?: string; content: string }
interface DocConfig { title: string; sections: DocSection[]; author?: string; date?: string }

export function InlineDocument({ jsonString, editorEnabled = true }: { jsonString: string; editorEnabled?: boolean }) {
  const [draftJson, setDraftJson] = useState(jsonString);
  useEffect(() => setDraftJson(jsonString), [jsonString]);
  const config = useMemo<DocConfig | null>(() => {
    try { return JSON.parse(draftJson); } catch { return null; }
  }, [draftJson]);
  if (!config) return null;

  const handleSave = () => saveToDatabase(config.title, "document", draftJson);
  const handleDownload = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(config.title, 20, 20);
    let y = 35;
    doc.setFontSize(11);
    config.sections.forEach(sec => {
      if (sec.heading) {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text(sec.heading, 20, y);
        y += 7;
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
      }
      const lines = doc.splitTextToSize(sec.content, 170);
      lines.forEach((line: string) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 6;
      });
      y += 4;
    });
    doc.save(`${config.title}.pdf`);
  };

  const editor = editorEnabled ? <GraphicEditorDialog title="Edit document" value={draftJson} onApply={setDraftJson} renderPreview={(value) => <InlineDocument jsonString={value} editorEnabled={false} />} /> : null;

  return (
    <div className="my-4 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <div className="bg-[#3399ff]/10 border-b border-[#3399ff]/20 px-5 py-3 flex items-center gap-2">
        <FileText className="w-4 h-4 text-[#3399ff]" />
        <span className="text-sm font-semibold text-foreground">{config.title}</span>
        {config.date && <span className="text-xs text-muted-foreground">{config.date}</span>}
        <GraphicActions onSave={handleSave} onDownload={handleDownload} editor={editor} />
      </div>
      <div className="px-5 py-4 space-y-4 max-h-[400px] overflow-y-auto">
        {config.sections.map((sec, i) => (
          <div key={i}>
            {sec.heading && <h4 className="text-sm font-semibold text-foreground mb-1.5">{sec.heading}</h4>}
            <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AnalyticsMetric { label: string; value: string; change?: number; unit?: string }
interface AnalyticsConfig { title: string; metrics: AnalyticsMetric[]; chart?: any; insights?: string[] }

export function InlineAnalytics({ jsonString, editorEnabled = true }: { jsonString: string; editorEnabled?: boolean }) {
  const [draftJson, setDraftJson] = useState(jsonString);
  useEffect(() => setDraftJson(jsonString), [jsonString]);
  const config = useMemo<AnalyticsConfig | null>(() => {
    try { return JSON.parse(draftJson); } catch { return null; }
  }, [draftJson]);
  if (!config) return null;

  const handleSave = () => saveToDatabase(config.title, "analytics", draftJson);
  const handleDownload = () => {
    const lines = config.metrics.map(m => `${m.label}: ${m.value}${m.unit || ""}${m.change !== undefined ? ` (${m.change > 0 ? "+" : ""}${m.change}%)` : ""}`);
    if (config.insights) lines.push("", "Insights:", ...config.insights.map(i => `- ${i}`));
    downloadFile(`${config.title}.txt`, lines.join("\n"), "text/plain");
  };

  const editor = editorEnabled ? <GraphicEditorDialog title="Edit analytics" value={draftJson} onApply={setDraftJson} renderPreview={(value) => <InlineAnalytics jsonString={value} editorEnabled={false} />} /> : null;

  return (
    <div className="my-4 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <div className="bg-[#3399ff]/10 border-b border-[#3399ff]/20 px-5 py-3 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-[#3399ff]" />
        <span className="text-sm font-semibold text-foreground">{config.title}</span>
        <GraphicActions onSave={handleSave} onDownload={handleDownload} editor={editor} />
      </div>
      <div className="p-4">
        <div className={cn("grid gap-3 mb-4", config.metrics.length <= 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
          {config.metrics.map((m, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
              <p className="text-lg font-bold text-foreground">{m.value}{m.unit ? <span className="text-xs font-normal text-muted-foreground ml-0.5">{m.unit}</span> : null}</p>
              {m.change !== undefined && (
                <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", m.change > 0 ? "text-emerald-500" : m.change < 0 ? "text-red-500" : "text-muted-foreground")}>
                  {m.change > 0 ? <TrendingUp className="w-3 h-3" /> : m.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {m.change > 0 ? "+" : ""}{m.change}%
                </div>
              )}
            </div>
          ))}
        </div>
        {config.chart?.data && config.chart.data.length > 0 && (
          <div className="rounded-lg border border-border/30 p-3">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={config.chart.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey={config.chart.xKey || Object.keys(config.chart.data[0])[0]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                {(config.chart.yKeys || Object.keys(config.chart.data[0]).slice(1)).map((k: string, i: number) => (
                  <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        {config.insights && config.insights.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {config.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                <span className="text-[#3399ff] mt-0.5">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SpreadsheetConfig { title: string; headers: string[]; rows: (string | number)[][]; footer?: string[] }

export function InlineSpreadsheet({ jsonString, editorEnabled = true }: { jsonString: string; editorEnabled?: boolean }) {
  const [draftJson, setDraftJson] = useState(jsonString);
  useEffect(() => setDraftJson(jsonString), [jsonString]);
  const config = useMemo<SpreadsheetConfig | null>(() => {
    try { return JSON.parse(draftJson); } catch { return null; }
  }, [draftJson]);
  if (!config) return null;

  const handleSave = () => saveToDatabase(config.title, "spreadsheet", draftJson);
  const handleDownload = () => {
    const csvRows = [config.headers.join(","), ...config.rows.map(r => r.join(","))];
    if (config.footer) csvRows.push(config.footer.join(","));
    downloadFile(`${config.title}.csv`, csvRows.join("\n"), "text/csv");
  };

  const editor = editorEnabled ? <GraphicEditorDialog title="Edit spreadsheet" value={draftJson} onApply={setDraftJson} renderPreview={(value) => <InlineSpreadsheet jsonString={value} editorEnabled={false} />} /> : null;

  return (
    <div className="my-4 rounded-xl border border-border/50 bg-card overflow-hidden shadow-sm">
      <div className="bg-[#3399ff]/10 border-b border-[#3399ff]/20 px-5 py-3 flex items-center gap-2">
        <Table2 className="w-4 h-4 text-[#3399ff]" />
        <span className="text-sm font-semibold text-foreground">{config.title}</span>
        <GraphicActions onSave={handleSave} onDownload={handleDownload} editor={editor} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border/50">
              {config.headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 text-left font-semibold text-foreground text-[13px] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.rows.map((row, ri) => (
              <tr key={ri} className={cn("border-b border-border/20", ri % 2 === 1 && "bg-muted/20")}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-4 py-2 text-foreground/80 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
          {config.footer && (
            <tfoot>
              <tr className="bg-muted/40 border-t border-border/50 font-semibold">
                {config.footer.map((cell, i) => (
                  <td key={i} className="px-4 py-2.5 text-foreground text-[13px]">{cell}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

interface SlideStat { value: string; label: string }
interface SlideConfig {
  title: string; subtitle?: string; bullets?: string[]; takeaway?: string; image?: string;
  layout?: "bullets" | "stat-callout" | "two-column" | "title-only";
  stats?: SlideStat[]; icon?: string; accent_color?: string; bg_color?: string; brand_name?: string;
  left_column?: string[]; right_column?: string[];
}

export function InlineSlide({ jsonString, editorEnabled = true }: { jsonString: string; editorEnabled?: boolean }) {
  const [draftJson, setDraftJson] = useState(jsonString);
  useEffect(() => setDraftJson(jsonString), [jsonString]);
  const config = useMemo<SlideConfig | null>(() => {
    try { return JSON.parse(draftJson); } catch { return null; }
  }, [draftJson]);
  if (!config) return null;

  const layout = config.layout || (config.stats && config.stats.length > 0 ? "stat-callout" : "bullets");
  const accent = config.accent_color || "#3399ff";
  const bgColor = config.bg_color || "#1a1a2e";
  const bgGradientEnd = adjustColorBrightness(bgColor, 15);

  const handleSave = () => saveToDatabase(config.title, "slide", draftJson);
  const handleDownload = async () => {
    const pptxgenjs = await import("pptxgenjs");
    const pptx = new pptxgenjs.default();
    const slide = pptx.addSlide();
    slide.background = { fill: "1a1a2e" };

    if (config.icon) slide.addText(config.icon, { x: 0.5, y: 0.3, w: 1, fontSize: 36 });
    const titleY = config.icon ? 0.9 : 0.5;
    slide.addText(config.title, { x: 0.5, y: titleY, w: 9, fontSize: 28, bold: true, color: "FFFFFF" });
    if (config.subtitle) slide.addText(config.subtitle, { x: 0.5, y: titleY + 0.7, w: 9, fontSize: 14, color: "999999" });

    if (layout === "stat-callout" && config.stats) {
      const statW = 9 / Math.min(config.stats.length, 4);
      config.stats.forEach((s, i) => {
        slide.addText(s.value, { x: 0.5 + i * statW, y: 2.2, w: statW, fontSize: 36, bold: true, color: accent.replace("#", ""), align: "center" });
        slide.addText(s.label, { x: 0.5 + i * statW, y: 3.0, w: statW, fontSize: 12, color: "AAAAAA", align: "center" });
      });
    }
    if (config.bullets && config.bullets.length > 0) {
      const bulletText = config.bullets.map(b => ({ text: b, options: { bullet: true, color: "DDDDDD", fontSize: 14 } }));
      slide.addText(bulletText, { x: 0.5, y: layout === "stat-callout" ? 3.6 : 2, w: 9, h: 2.5 });
    }
    if (config.takeaway) {
      slide.addText([
        { text: "Key Takeaway: ", options: { bold: true, color: accent.replace("#", ""), fontSize: 12 } },
        { text: config.takeaway, options: { color: "EEEEEE", fontSize: 12 } },
      ], { x: 0.5, y: 4.5, w: 9 });
    }
    pptx.writeFile({ fileName: `${config.title}.pptx` });
  };

  const editor = editorEnabled ? <GraphicEditorDialog title="Edit slide" value={draftJson} onApply={setDraftJson} renderPreview={(value) => <InlineSlide jsonString={value} editorEnabled={false} />} /> : null;

  return (
    <div className="my-4 rounded-xl border border-border/50 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white p-6 min-h-[220px] flex flex-col">
        <div className="flex-1">
          {config.icon && <span className="text-3xl mb-2 block">{config.icon}</span>}
          <h3 className="text-xl font-bold mb-1 tracking-tight">{config.title}</h3>
          {config.subtitle && <p className="text-sm text-white/60 mb-4">{config.subtitle}</p>}

          {layout === "stat-callout" && config.stats && config.stats.length > 0 && (
            <div className={cn("grid gap-4 mt-4", config.stats.length <= 2 ? "grid-cols-2" : config.stats.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
              {config.stats.map((s, i) => (
                <div key={i} className="text-center rounded-lg p-3" style={{ backgroundColor: `${accent}15` }}>
                  <p className="text-2xl font-bold" style={{ color: accent }}>{s.value}</p>
                  <p className="text-xs text-white/60 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {layout === "two-column" && (
            <div className="grid grid-cols-2 gap-6 mt-4">
              <ul className="space-y-2">
                {(config.left_column || config.bullets || []).map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-white/85">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} />
                    {b}
                  </li>
                ))}
              </ul>
              {config.right_column && (
                <ul className="space-y-2">
                  {config.right_column.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/85">
                      <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {(layout === "bullets" || (!config.stats?.length && layout !== "two-column" && layout !== "title-only")) && config.bullets && config.bullets.length > 0 && (
            <ul className="space-y-2 mt-4">
              {config.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-white/85">
                  <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: accent }} />
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
        {config.takeaway && (
          <div className="mt-4 pt-3 border-t border-white/10">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accent }}>Key Takeaway</p>
            <p className="text-sm text-white/90 font-medium">{config.takeaway}</p>
          </div>
        )}
      </div>
      <div className="bg-[#3399ff]/10 px-5 py-2 flex items-center gap-2">
        <Presentation className="w-3.5 h-3.5 text-[#3399ff]" />
        <span className="text-xs text-muted-foreground">Slide</span>
        <GraphicActions onSave={handleSave} onDownload={handleDownload} editor={editor} />
      </div>
    </div>
  );
}
