import { useState } from "react";
import { Users, Building2, ShoppingCart, ArrowRight, Loader2, Download, Search, ChevronRight, Globe, BarChart3, Target, UserCog } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CanvasNode, PendingConnection } from "./types";

interface LeadsNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
}

interface LeadResult {
  companyName: string;
  website: string;
  ceoName: string;
  phoneNumber: string;
  country: string;
  market: string;
}

type Step = "select-type" | "criteria" | "searching" | "results";

const DEFAULT_CRITERIA = [
  { id: "country", label: "Country", value: "", editable: true },
  { id: "market", label: "Market", value: "", editable: true },
  { id: "audience", label: "Audience", value: "", editable: true },
  { id: "role", label: "Role", value: "CEO", editable: true },
];

export function LeadsNode({
  node,
  isSelected,
  onMouseDown,
  onUpdate,
}: LeadsNodeProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<Step>("select-type");
  const [selectedType, setSelectedType] = useState<"b2b" | "b2c" | null>(
    (node.textContent as "b2b" | "b2c") || null
  );
  const [criteria, setCriteria] = useState(DEFAULT_CRITERIA.map(c => ({ ...c })));
  const CRITERIA_ICONS: Record<string, React.ReactNode> = {
    country: <Globe className="h-4 w-4 text-primary" />,
    market: <BarChart3 className="h-4 w-4 text-primary" />,
    audience: <Target className="h-4 w-4 text-primary" />,
    role: <UserCog className="h-4 w-4 text-primary" />,
  };
  const [leads, setLeads] = useState<LeadResult[]>([]);
  const [searchProgress, setSearchProgress] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSelectType = (type: "b2b" | "b2c") => {
    setSelectedType(type);
    if (type === "b2b") {
      setStep("criteria");
    }
  };


  const handleCriteriaChange = (id: string, value: string) => {
    setCriteria(prev => prev.map(c => c.id === id ? { ...c, value } : c));
  };

  const handleStartSearch = async () => {
    const filledCriteria = criteria.filter(c => c.value.trim());
    if (filledCriteria.length === 0) {
      toast.error("Please fill in at least one criteria");
      return;
    }

    setStep("searching");
    setIsSearching(true);
    setSearchProgress("Initializing lead search...");

    try {
      const criteriaObj: Record<string, string> = {};
      filledCriteria.forEach(c => {
        criteriaObj[c.label.toLowerCase()] = c.value;
      });

      setSearchProgress("Searching the web for matching companies...");

      const { data, error } = await supabase.functions.invoke("lead-capture", {
        body: { criteria: criteriaObj, type: selectedType },
      });

      if (error) throw error;

      if (data?.leads && data.leads.length > 0) {
        setLeads(data.leads);
        setStep("results");
        onUpdate(node.id, { textContent: selectedType || "b2b", isAnalyzed: true });
        toast.success(`Found ${data.leads.length} leads!`);
      } else {
        setLeads([]);
        setStep("results");
        toast.info("No leads found matching your criteria. Try adjusting your search.");
      }
    } catch (err) {
      console.error("Lead capture error:", err);
      toast.error("Failed to capture leads. Please try again.");
      setStep("criteria");
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadCSV = () => {
    if (leads.length === 0) return;
    const headers = ["Company Name", "Website", "CEO Name", "Phone Number", "Country", "Market"];
    const rows = leads.map(l => [l.companyName, l.website, l.ceoName, l.phoneNumber, l.country, l.market]);
    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${selectedType}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenDialog = () => {
    if (!selectedType) {
      setStep("select-type");
    } else if (leads.length > 0) {
      setStep("results");
    } else {
      setStep("criteria");
    }
    setDialogOpen(true);
  };

  const storedType = node.textContent as "b2b" | "b2c" | undefined;

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg select-none overflow-visible",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 240,
        height: storedType ? 160 : 130,
      }}
      onMouseDown={onMouseDown}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Leads</span>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col items-center justify-center gap-2">
        {!storedType ? (
          <>
            <p className="text-xs text-muted-foreground text-center">Configure your lead generation pipeline</p>
            <Button
              size="sm"
              className="mt-1"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog();
              }}
            >
              Get Started
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <div className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border w-full",
              storedType === "b2b" ? "border-primary/50 bg-primary/5" : "border-accent/50 bg-accent/5"
            )}>
              {storedType === "b2b" ? (
                <Building2 className="h-4 w-4 text-primary" />
              ) : (
                <ShoppingCart className="h-4 w-4 text-accent-foreground" />
              )}
              <div>
                <p className="text-sm font-semibold">{storedType === "b2b" ? "B2B" : "B2C"}</p>
                <p className="text-[10px] text-muted-foreground">
                  {leads.length > 0 ? `${leads.length} leads found` : storedType === "b2b" ? "Business-to-Business" : "Business-to-Consumer"}
                </p>
              </div>
            </div>
            <button
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDialog();
              }}
            >
              {leads.length > 0 ? "View leads" : "Configure"}
            </button>
          </div>
        )}
      </div>

      {/* No ports - Leads node is standalone */}

      {/* Fullscreen Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-none w-screen h-screen m-0 p-0 rounded-none border-none flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Step: Select Type */}
          {step === "select-type" && (
            <div className="flex flex-col items-center justify-center flex-1 gap-8 p-8">
              <div className="text-center max-w-lg">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h1 className="text-3xl font-extrabold mb-2">Lead Generation</h1>
                <p className="text-muted-foreground text-lg">Choose your target audience type to get started</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
                <button
                  onClick={() => handleSelectType("b2b")}
                  className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all hover:scale-[1.02]",
                    "hover:border-primary hover:bg-primary/5",
                    selectedType === "b2b" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-xl">B2B</p>
                    <p className="text-sm text-muted-foreground mt-1">Business-to-Business</p>
                    <p className="text-xs text-muted-foreground mt-2">Target companies, decision makers & organizations</p>
                  </div>
                </button>
                <button
                  onClick={() => handleSelectType("b2c")}
                  className={cn(
                    "flex flex-col items-center gap-4 p-8 rounded-2xl border-2 transition-all hover:scale-[1.02]",
                    "hover:border-primary hover:bg-primary/5",
                    selectedType === "b2c" ? "border-primary bg-primary/5" : "border-border"
                  )}
                >
                  <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <ShoppingCart className="h-8 w-8 text-accent-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="font-extrabold text-xl">B2C</p>
                    <p className="text-sm text-muted-foreground mt-1">Business-to-Consumer</p>
                    <p className="text-xs text-muted-foreground mt-2">Target individual customers & end consumers</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step: B2B Criteria */}
          {step === "criteria" && (
            <div className="flex flex-col flex-1 p-8 max-w-3xl mx-auto w-full">
              <div className="mb-8">
                <button
                  onClick={() => setStep("select-type")}
                  className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
                >
                  ← Back
                </button>
                <h1 className="text-3xl font-extrabold mb-2">Define Your Criteria</h1>
                <p className="text-muted-foreground">
                  Set the criteria for your B2B lead search. The AI will find matching companies, identify the key person via allabolag.se, and get phone numbers from hitta.se.
                </p>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap gap-4">
                  {criteria.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 min-w-[200px] max-w-[240px] flex-1"
                    >
                      <div className="flex items-center gap-2">
                        {CRITERIA_ICONS[c.id] || <Search className="h-4 w-4 text-primary" />}
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {c.label}
                        </span>
                      </div>
                      <Input
                        placeholder={c.id === "role" ? "e.g. CEO, CTO, CFO..." : `Enter ${c.label.toLowerCase()}...`}
                        value={c.value}
                        onChange={(e) => handleCriteriaChange(c.id, e.target.value)}
                        className="h-9 text-sm bg-background border-border"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <Button size="lg" onClick={handleStartSearch} className="px-8">
                  <Search className="h-4 w-4 mr-2" />
                  Find Leads
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step: Searching */}
          {step === "searching" && (
            <div className="flex flex-col items-center justify-center flex-1 gap-6 p-8">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-extrabold mb-2">Capturing Leads</h2>
                <p className="text-muted-foreground">{searchProgress}</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {criteria.filter(c => c.value.trim()).map(c => (
                  <span key={c.id} className="text-xs border border-border rounded-full px-3 py-1 text-muted-foreground">
                    {c.label}: {c.value}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Step: Results */}
          {step === "results" && (
            <div className="flex flex-col flex-1 p-8 overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-extrabold mb-1">Lead Results</h1>
                  <p className="text-muted-foreground">{leads.length} leads found</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("criteria")}>
                    New Search
                  </Button>
                  <Button onClick={handleDownloadCSV} disabled={leads.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </div>

              {leads.length > 0 ? (
                <div className="flex-1 overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-extrabold">#</TableHead>
                        <TableHead className="font-extrabold">Company</TableHead>
                        <TableHead className="font-extrabold">Website</TableHead>
                        <TableHead className="font-extrabold">Contact</TableHead>
                        <TableHead className="font-extrabold">Phone</TableHead>
                        <TableHead className="font-extrabold">Country</TableHead>
                        <TableHead className="font-extrabold">Market</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{i + 1}</TableCell>
                          <TableCell className="font-semibold">{lead.companyName}</TableCell>
                          <TableCell>
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm">
                              {lead.website}
                            </a>
                          </TableCell>
                          <TableCell>{lead.ceoName}</TableCell>
                          <TableCell className="font-mono text-sm">{lead.phoneNumber}</TableCell>
                          <TableCell>{lead.country}</TableCell>
                          <TableCell>{lead.market}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <p>No leads found. Try adjusting your criteria.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
