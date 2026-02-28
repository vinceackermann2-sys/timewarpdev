import { useState } from "react";
import {
  Globe, ImageIcon, Palette, Type, Upload, X, Check, RefreshCw, Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrandingData {
  logos: string[];
  selectedLogo: number;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontStyle: string;
    fontWeight: string;
  };
  confidence: number;
  source: string;
}

const DEFAULT_BRANDING: BrandingData = {
  logos: [],
  selectedLogo: 0,
  colors: {
    primary: "#4A86FF",
    secondary: "#6B7280",
    background: "#FFFFFF",
    text: "#000000",
  },
  typography: {
    fontFamily: "IBM Plex Sans",
    fontStyle: "Clean sans-serif with professional proportions",
    fontWeight: "600",
  },
  confidence: 0,
  source: "",
};

const FONT_WEIGHTS = [
  { value: "300", label: "Light (300)" },
  { value: "400", label: "Regular (400)" },
  { value: "500", label: "Medium (500)" },
  { value: "600", label: "Semi-Bold (600)" },
  { value: "700", label: "Bold (700)" },
];

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2.5">
        <label
          className="h-9 w-9 rounded-lg border border-border/60 cursor-pointer shrink-0 overflow-hidden"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
        <Input
          value={value.toUpperCase()}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs font-mono w-[100px]"
        />
      </div>
    </div>
  );
}

export function BrandingEditor({
  onCancel,
  onSave,
}: {
  onCancel: () => void;
  onSave?: (data: BrandingData) => void;
}) {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [extractUrl, setExtractUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    if (!extractUrl.trim()) return;
    setIsExtracting(true);
    // TODO: integrate with Firecrawl branding extraction
    setTimeout(() => setIsExtracting(false), 1500);
  };

  const updateColor = (key: keyof BrandingData["colors"], value: string) => {
    setBranding((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const updateTypography = (
    key: keyof BrandingData["typography"],
    value: string
  ) => {
    setBranding((prev) => ({
      ...prev,
      typography: { ...prev.typography, [key]: value },
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Branding</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSave?.(branding)}
            className="gap-1.5"
          >
            <Save className="h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-8 max-w-3xl">
          {/* ── Extract from URL ── */}
          <section className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Extract branding from URL
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste a product URL to extract fresh branding (uses 7-day cache
              for faster results)
            </p>
            <div className="flex gap-2">
              <Input
                value={extractUrl}
                onChange={(e) => setExtractUrl(e.target.value)}
                placeholder="https://example.com/product"
                className="flex-1 h-9 text-sm"
              />
              <Button
                size="sm"
                onClick={handleExtract}
                disabled={isExtracting || !extractUrl.trim()}
                className="gap-1.5 h-9 px-4"
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    isExtracting && "animate-spin"
                  )}
                />
                Extract
              </Button>
            </div>
          </section>

          {/* ── Primary Logo ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Primary logo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Logo used for brand consistency across all generated ads
            </p>

            <div className="flex gap-4">
              {/* Existing logos */}
              {branding.logos.map((logo, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setBranding((p) => ({ ...p, selectedLogo: i }))
                  }
                  className={cn(
                    "relative h-44 w-56 rounded-xl border-2 overflow-hidden transition-all bg-card",
                    i === branding.selectedLogo
                      ? "border-primary shadow-glow"
                      : "border-border/40 hover:border-border"
                  )}
                >
                  <img
                    src={logo}
                    alt="Brand logo"
                    className="h-full w-full object-contain p-4"
                  />
                  {i === branding.selectedLogo && (
                    <div className="absolute top-2.5 left-2.5 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}

              {/* Upload slot */}
              <button className="h-44 w-56 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                <Upload className="h-5 w-5" />
                <span className="text-xs font-medium">Upload</span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground/70">
              Click a logo to select it as your primary brand logo
            </p>
          </section>

          {/* ── Brand Colors ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Brand colors
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Core color palette used for brand consistency in generated ads
            </p>

            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <ColorField
                label="Primary"
                value={branding.colors.primary}
                onChange={(v) => updateColor("primary", v)}
              />
              <ColorField
                label="Secondary"
                value={branding.colors.secondary}
                onChange={(v) => updateColor("secondary", v)}
              />
              <ColorField
                label="Background"
                value={branding.colors.background}
                onChange={(v) => updateColor("background", v)}
              />
              <ColorField
                label="Text"
                value={branding.colors.text}
                onChange={(v) => updateColor("text", v)}
              />
            </div>
          </section>

          {/* ── Typography ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                Typography
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Font settings for maintaining brand voice in text-based ads
            </p>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Font family
                </label>
                <Input
                  value={branding.typography.fontFamily}
                  onChange={(e) =>
                    updateTypography("fontFamily", e.target.value)
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Font style description
                </label>
                <Input
                  value={branding.typography.fontStyle}
                  onChange={(e) =>
                    updateTypography("fontStyle", e.target.value)
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Font weight
                </label>
                <Select
                  value={branding.typography.fontWeight}
                  onValueChange={(v) => updateTypography("fontWeight", v)}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_WEIGHTS.map((fw) => (
                      <SelectItem key={fw.value} value={fw.value}>
                        {fw.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* ── Confidence footer ── */}
          {branding.confidence > 0 && (
            <p className="text-xs text-muted-foreground/60 pb-4">
              Extracted from {branding.source} • Confidence:{" "}
              {branding.confidence}%
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
