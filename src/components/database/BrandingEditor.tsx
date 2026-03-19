import { useState, useEffect } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Globe, ImageIcon, Palette, Type, Upload, X, Check, RefreshCw, Save, Pencil,
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
import { BrandColors, BrandTypography } from "@/components/database/BusinessDNAContext";

export interface BrandingData {
  logos: string[];
  selectedLogo: number;
  colors: BrandColors;
  typography: BrandTypography;
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
  isEditing = false,
  onEditToggle,
  initialColors,
  initialTypography,
  initialLogos,
  initialSelectedLogo,
  onVisualIdentityExtracted,
}: {
  onCancel: () => void;
  onSave?: (data: BrandingData) => void;
  isEditing?: boolean;
  onEditToggle?: () => void;
  initialColors?: BrandColors;
  initialTypography?: BrandTypography;
  initialLogos?: string[];
  initialSelectedLogo?: number;
  onVisualIdentityExtracted?: (vi: any) => void;
}) {
  const [branding, setBranding] = useState<BrandingData>(() => ({
    ...DEFAULT_BRANDING,
    colors: initialColors || DEFAULT_BRANDING.colors,
    typography: initialTypography || DEFAULT_BRANDING.typography,
    logos: initialLogos || DEFAULT_BRANDING.logos,
    selectedLogo: initialSelectedLogo ?? DEFAULT_BRANDING.selectedLogo,
  }));
  const [extractUrl, setExtractUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);

  const { toast } = useToast();
  const { checkCanUseAction } = useActionGate();

  const handleExtract = async () => {
    if (!extractUrl.trim()) return;
    // Allow free users' first business without action check
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { count } = await supabase
        .from("user_business_data")
        .select("id", { count: "exact", head: true })
        .eq("user_id", session.user.id);
      const isFirstBusiness = !count || count === 0;
      if (!isFirstBusiness && !checkCanUseAction()) return;
    }
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-product", {
        body: { url: extractUrl.trim() },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Extraction failed");

      const b = data.extracted?.brand;
      if (b) {
        setBranding((prev) => ({
          ...prev,
          colors: b.colors ? { ...prev.colors, ...b.colors } : prev.colors,
          typography: b.typography ? { ...prev.typography, ...b.typography } : prev.typography,
          logos: Array.isArray(b.logoUrls) && b.logoUrls.length > 0 ? b.logoUrls : prev.logos,
          confidence: 85,
          source: extractUrl.trim(),
        }));
        toast({ title: "Branding extracted", description: `Found colors, typography and logos from ${b.name || "the URL"}.` });

        // Also pass visual identity data if extracted
        const vi = b.visualIdentity;
        if (vi && onVisualIdentityExtracted) {
          onVisualIdentityExtracted(vi);
        }
      } else {
        toast({ title: "No branding found", description: "Could not extract brand data from that URL.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Brand extraction error:", err);
      toast({ title: "Extraction failed", description: err.message || "Could not extract branding.", variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
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
    <div className="flex flex-col h-full" id="branding">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <Palette className="h-5 w-5 text-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Branding</h2>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onEditToggle || onCancel}
                className="gap-1.5 text-muted-foreground"
              >
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { onSave?.(branding); onEditToggle?.(); }}
                className="gap-1.5"
              >
                <Save className="h-4 w-4" /> Save
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditToggle}
              className="gap-1.5"
            >
              <Pencil className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-6 py-6 space-y-8 max-w-3xl">
          {/* ── Extract from URL (edit mode only) ── */}
          {isEditing && (
            <section className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-foregroundundundund" />
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
          )}

          {/* ── Primary Logo ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 foregroundgroundgroundary" />
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
                    isEditing && setBranding((p) => ({ ...p, selectedLogo: i }))
                  }
                  className={cn(
                    "relative h-32 w-40 rounded-xl border-2 overflow-hidden transition-all bg-card",
                    i === branding.selectedLogo
                      ? "border-primary shadow-glow"
                      : "border-border/40 hover:border-border",
                    !isEditing && "cursor-default"
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

              {/* Upload slot (edit mode only) */}
              {isEditing && (
                <button className="h-32 w-40 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary">
                  <Upload className="h-5 w-5" />
                  <span className="text-xs font-medium">Upload</span>
                </button>
              )}

              {/* No logo placeholder (both modes, no logos) */}
              {!isEditing && branding.logos.length === 0 && (
                <div className="h-32 w-40 rounded-xl border-2 border-dashed border-border/60 flex flex-col items-center justify-center gap-1">
                  <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground/60">No logo yet</span>
                </div>
              )}
            </div>

            {isEditing && (
              <p className="text-xs text-muted-foreground/70">
                Click a logo to select it as your primary brand logo
              </p>
            )}
          </section>

          {/* ── Brand Colors ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="hforegroundoregroundrimary" />
              <span className="text-sm font-semibold text-foreground">
                Brand colors
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Core color palette used for brand consistency in generated ads
            </p>

            {isEditing ? (
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
            ) : (
              <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                {(Object.entries(branding.colors) as [string, string][]).map(([key, value]) => (
                  <div key={key} className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{key}</span>
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg border border-border/60 shrink-0" style={{ backgroundColor: value }} />
                      <span className="text-xs font-mono text-muted-foreground">{value.toUpperCase()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Typography ── */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Type className="h-4 foregroundt-primary" />
              <span className="text-sm font-semibold text-foreground">
                Typography
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Font settings for maintaining brand voice in text-based ads
            </p>

            {isEditing ? (
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
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Font family</label>
                  <p className="text-sm text-foreground/90 h-9 flex items-center">{branding.typography.fontFamily}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Font style description</label>
                  <p className="text-sm text-foreground/90 h-9 flex items-center">{branding.typography.fontStyle}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Font weight</label>
                  <p className="text-sm text-foreground/90 h-9 flex items-center">{FONT_WEIGHTS.find(fw => fw.value === branding.typography.fontWeight)?.label || branding.typography.fontWeight}</p>
                </div>
              </div>
            )}
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