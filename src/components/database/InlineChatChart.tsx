import { useEffect, useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { GraphicEditorDialog } from "./GraphicEditorDialog";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f59e0b",
  "#10b981",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

interface ChartConfig {
  type: "bar" | "line" | "area" | "pie";
  title?: string;
  xKey?: string;
  yKeys?: string[];
  nameKey?: string;
  valueKey?: string;
  data: Record<string, any>[];
}

export function InlineChatChart({ jsonString, editorEnabled = true }: { jsonString: string; editorEnabled?: boolean }) {
  const [draftJson, setDraftJson] = useState(jsonString);
  useEffect(() => setDraftJson(jsonString), [jsonString]);

  const config = useMemo<ChartConfig | null>(() => {
    try {
      return JSON.parse(draftJson);
    } catch {
      return null;
    }
  }, [draftJson]);

  if (!config || !config.data || config.data.length === 0) return null;

  const { type, title, data } = config;

  const commonProps = {
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  const renderChart = () => {
    if (type === "pie") {
      const nk = config.nameKey || "name";
      const vk = config.valueKey || "value";
      return (
        <PieChart>
          <Pie data={data} dataKey={vk} nameKey={nk} cx="50%" cy="50%" outerRadius={80} label>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      );
    }

    const xk = config.xKey || Object.keys(data[0])[0];
    const yks = config.yKeys || Object.keys(data[0]).filter(k => k !== xk);

    const axes = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={xk} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
        <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }} />
        <Legend />
      </>
    );

    if (type === "line") {
      return (
        <LineChart data={data} {...commonProps}>
          {axes}
          {yks.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      );
    }

    if (type === "area") {
      return (
        <AreaChart data={data} {...commonProps}>
          {axes}
          {yks.map((k, i) => (
            <Area key={k} type="monotone" dataKey={k} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length]} fillOpacity={0.15} />
          ))}
        </AreaChart>
      );
    }

    return (
      <BarChart data={data} {...commonProps}>
        {axes}
        {yks.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    );
  };

  return (
    <div className="my-4 rounded-xl border border-border/50 bg-card p-4 overflow-hidden">
      <div className="mb-3 flex items-center gap-2">
        {title && <h4 className="text-sm font-semibold text-foreground">{title}</h4>}
        <div className="ml-auto">
          {editorEnabled ? <GraphicEditorDialog title="Edit chart" value={draftJson} onApply={setDraftJson} renderPreview={(value) => <InlineChatChart jsonString={value} editorEnabled={false} />} /> : null}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
