import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessDNA, BusinessDNAProvider } from "@/components/database/BusinessDNAContext";
import { SuperchargeDNAWizard } from "@/components/database/SuperchargeDNAWizard";


function SuperchargeDnaInner() {
  const navigate = useNavigate();
  const { brands, refreshBrand, isLoading } = useBusinessDNA();

  const [brandId, setBrandId] = useState<string>("");

  useEffect(() => {
    const stored = localStorage.getItem("tw_active_brand_id") || "";
    if (stored) {
      setBrandId(stored);
    } else if (brands.length > 0) {
      setBrandId(brands[0].id);
    }
  }, [brands]);

  const activeBrand = brands.find((b) => b.id === brandId) || brands[0] || null;
  const resolvedBrandId = activeBrand?.id || "";

  const handleClose = () => navigate("/app");

  return (
    <div className="min-h-screen bg-[#FAFAFD]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Business DNA
          </Button>
        </div>

        {isLoading && !activeBrand ? (
          <div className="text-sm text-muted-foreground">Loading business...</div>
        ) : !resolvedBrandId ? (
          <div className="text-sm text-muted-foreground">
            No business selected. Go back and pick one.
          </div>
        ) : (
          <SuperchargeDNAWizard
            embedded
            brandId={resolvedBrandId}
            brandName={activeBrand?.name}
            logoUrl={activeBrand?.logoUrls?.[activeBrand?.selectedLogo ?? 0]}
            onCompleted={() => {
              localStorage.setItem(`tw_supercharge_completed_${resolvedBrandId}`, "1");
              refreshBrand(resolvedBrandId);
              navigate("/app");
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function SuperchargeDna() {
  return (
    <BusinessDNAProvider>
      <SuperchargeDnaInner />
    </BusinessDNAProvider>
  );
}
