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
    <div className="h-screen flex flex-col overflow-hidden bg-[#FAFBFF]">
      <div className="shrink-0 px-6 pt-4 pb-2 max-w-6xl mx-auto w-full">
        <Button
          variant="ghost"
          onClick={handleClose}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Business DNA
        </Button>
      </div>

      <div className="flex-1 min-h-0 mx-auto max-w-6xl w-full px-6 pb-2 flex flex-col">
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
