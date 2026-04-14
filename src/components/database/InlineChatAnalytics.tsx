import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Download, Save, Check, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GraphicEditorDialog } from "./GraphicEditorDialog";

const COLORS = [
  "#4a86ff", "#10b981", "#f59e0b", "#6366f1", "#ec4899", "#14b8a6", "#f97316", "#8b5cf6",
];

interface Metric {
  label: string;
  value: string;
  change?: number;
  unit?: string;
}

interface ChartConfig {
  type?: "bar" | "line" | "area" | "pie";
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  data: Record<string, any>[];
}

interface AnalyticsConfig {
  title: string;
  metrics?: Metric[];
  chart?: ChartConfig;
  // Support flat chart data (from old chart component)
  type?: "bar" | "line" | "area" | "pie";
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  data?: Record<string, any>[];
  insights?: string[];
}

function normalizeConfig(raw: any): AnalyticsConfig | null {
  if (!raw) return null;
  // If it has a `data` array at root + `type`, it's an old chart-only config
  if (raw.data && Array.isArray(raw.data) && raw.type && !raw.metrics && !raw.chart) {
    return {
      title: raw.title || "Chart",
      chart: {
        type: raw.type,
        xKey: raw.xKey,
        yKeys: raw.yKeys,
        nameKey: raw.nameKey,
        valueKey: raw.valueKey,
        data: raw.data,
      },
    };
  }
  // If it has chart as nested object, use as-is
  if (raw.chart?.data) {
    return raw as AnalyticsConfig;
  }
  // If it has metrics but no chart, that's fine
  if (raw.metrics) {
    return raw as AnalyticsConfig;
  }
  // Fallback: try treating root data as chart data
  if (raw.data && Array.isArray(raw.data)) {
    return {
      title: raw.title || "Analytics",
      chart: { data: raw.data, type: raw.type, xKey: raw.xKey, yKeys: raw.yKeys },
      metrics: raw.metrics,
      insights: raw.insights,
    };
  }
  return raw as AnalyticsConfig;
}

function ChartRenderer({ chart }: { chart: ChartConfig }) {
  const { data, type = "bar" } = chart;
  if (!data || data.length === 0) return null;

  const margin = { top: 5, right: 15, left: -10, bottom: 5 };

  if (type === "pie") {
    const nk = chart.nameKey || "name";
    const vk = chart.valueKey || "value";
    return (
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey={vk} nameKey={nk} cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const xk = chart.xKey || Object.keys(data[0])[0];
  const yks = chart.yKeys || Object.keys(data[0]).filter(k => k !== xk);

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
      <XAxis dataKey={xk} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} />
    </>
  );

  const ChartComponent = type === "line" ? LineChart : type === "area" ? AreaChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ChartComponent data={data} margin={margin}>
        {axes}
        {yks.map((k, i) => {
          if (type === "line") return <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2.5} dot={false} />;
          if (type === "area") return <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.1} strokeWidth={2} />;
          return <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />;
        })}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

export function InlineChatAnalytics({ jsonString, editorEnabled = true }: { jsonString: string; editorEnabled?: boolean }) {
  const [draftJson, setDraftJson] = useState(jsonString);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraftJson(jsonString), [jsonString]);

  const config = useMemo<AnalyticsConfig | null>(() => {
    try { return normalizeConfig(JSON.parse(draftJson)); } catch { return null; }
  }, [draftJson]);

  if (!config) return null;

  const hasMetrics = config.metrics && config.metrics.length > 0;
  const hasChart = config.chart?.data && config.chart.data.length > 0;
  const hasInsights = config.insights && config.insights.length > 0;

  if (!hasMetrics && !hasChart) return null;

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { toast.error("Sign in to save"); return; }
    const wsId = localStorage.getItem("preferred_workspace_id");
    const { error } = await supabase.from("user_business_data").insert({
      user_id: session.user.id,
      workspace_id: wsId || null,
      title: config.title,
      data_type: "analytics",
      content: draftJson,
      source: "ai-graphic",
    });
    if (error) toast.error("Failed to save");
    else { toast.success("Saved"); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const handleDownloadPptx = async () => {
    const pptxgenjs = await import("pptxgenjs");
    const pptx = new pptxgenjs.default();
    const slide = pptx.addSlide();
    slide.background = { fill: "0F172A" };

    // Title
    slide.addText(config.title, { x: 0.5, y: 0.3, w: 9, fontSize: 24, bold: true, color: "FFFFFF", fontFace: "Arial" });

    // Metrics row
    if (hasMetrics && config.metrics) {
      const count = Math.min(config.metrics.length, 4);
      const mW = 9 / count;
      config.metrics.forEach((m, i) => {
        const xPos = 0.5 + i * mW;
        slide.addShape(pptx.ShapeType.roundRect, { x: xPos, y: 1.0, w: mW - 0.15, h: 1.1, fill: { color: "1E293B" }, rectRadius: 0.1 });
        slide.addText(m.label.toUpperCase(), { x: xPos + 0.15, y: 1.1, w: mW - 0.4, fontSize: 8, color: "94A3B8", fontFace: "Arial" });
        const valText = `${m.value}${m.unit || ""}`;
        slide.addText(valText, { x: xPos + 0.15, y: 1.4, w: mW - 0.4, fontSize: 22, bold: true, color: "FFFFFF", fontFace: "Arial" });
        if (m.change !== undefined) {
          const changeColor = m.change > 0 ? "10B981" : m.change < 0 ? "EF4444" : "94A3B8";
          slide.addText(`${m.change > 0 ? "▲" : m.change < 0 ? "▼" : "–"} ${Math.abs(m.change)}%`, { x: xPos + 0.15, y: 1.75, w: mW - 0.4, fontSize: 9, color: changeColor, fontFace: "Arial" });
        }
      });
    }

    // Chart as image placeholder text
    if (hasChart) {
      slide.addText("📊 Chart data included — view in app for interactive chart", { x: 0.5, y: 2.4, w: 9, fontSize: 11, color: "64748B", italic: true, fontFace: "Arial" });
    }

    // Insights
    if (hasInsights && config.insights) {
      const startY = hasChart ? 3.0 : 2.5;
      slide.addText("Key Insights", { x: 0.5, y: startY, w: 9, fontSize: 14, bold: true, color: "3399FF", fontFace: "Arial" });
      config.insights.forEach((insight, i) => {
        slide.addText(`• ${insight}`, { x: 0.7, y: startY + 0.4 + i * 0.35, w: 8.5, fontSize: 11, color: "CBD5E1", fontFace: "Arial" });
      });
    }

    pptx.writeFile({ fileName: `${config.title}.pptx` });
  };

  const editor = editorEnabled ? (
    <GraphicEditorDialog
      title="Edit analytics"
      value={draftJson}
      onApply={setDraftJson}
      renderPreview={(value) => <InlineChatAnalytics jsonString={value} editorEnabled={false} />}
    />
  ) : null;

  return (
    <div className="my-4 rounded-xl border border-border/40 bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3 flex items-center gap-2 border-b border-border/30">
        <BarChart3 className="w-4 h-4 text-[#4a86ff]" />
        <span className="text-sm font-semibold text-foreground">{config.title}</span>
        <div className="ml-auto flex items-center gap-1">
          {editor}
          <button onClick={handleSave} className="p-1 rounded hover:bg-[#4a86ff]/20 transition-colors" title="Save">
            {saved ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Save className="w-3.5 h-3.5 text-[#4a86ff]" />}
          </button>
          <button onClick={handleDownloadPptx} className="p-1 rounded hover:bg-[#4a86ff]/20 transition-colors" title="Download as PPTX">
            <Download className="w-3.5 h-3.5 text-[#4a86ff]" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Metrics */}
        {hasMetrics && config.metrics && (
          <div className={cn(
            "grid gap-3",
            config.metrics.length <= 2 ? "grid-cols-2" : config.metrics.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
          )}>
            {config.metrics.map((m, i) => (
              <div key={i} className="rounded-xl bg-muted/40 p-3.5 border border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1.5">{m.label}</p>
                <p className="text-xl font-bold text-foreground tabular-nums">
                  {m.value}
                  {m.unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{m.unit}</span>}
                </p>
                {m.change !== undefined && (
                  <div className={cn(
                    "flex items-center gap-1 mt-1.5 text-xs font-medium",
                    m.change > 0 ? "text-emerald-500" : m.change < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {m.change > 0 ? <TrendingUp className="w-3 h-3" /> : m.change < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    {m.change > 0 ? "+" : ""}{m.change}%
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        {hasChart && config.chart && (
          <div className="rounded-xl bg-muted/20 border border-border/20 p-3">
            <ChartRenderer chart={config.chart} />
          </div>
        )}

        {/* Insights */}
        {hasInsights && config.insights && (
          <div className="space-y-2 pt-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Key Insights</p>
            {config.insights.map((insight, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-foreground/85 leading-relaxed">
                <span className="text-[#4a86ff] mt-0.5 text-xs">●</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
