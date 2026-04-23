import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBusinessDNA } from "@/components/database/BusinessDNAContext";
import { SuperchargeDNAWizard } from "@/components/database/SuperchargeDNAWizard";

export default function SuperchargeDna() {
  const navigate = useNavigate();
  const { brands, activeBrandId, refreshBrand, isLoading } = useBusinessDNA();
  const activeBrand = brands.find((b) => b.id === activeBrandId) || brands[0] || null;
  const brandId = activeBrand?.id || "";

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
        ) : !brandId ? (
          <div className="text-sm text-muted-foreground">
            No business selected. Go back and pick one.
          </div>
        ) : (
          <SuperchargeDNAWizard
            embedded
            brandId={brandId}
            brandName={activeBrand?.name}
            logoUrl={activeBrand?.logoUrls?.[activeBrand?.selectedLogo ?? 0]}
            onCompleted={() => {
              localStorage.setItem(`tw_supercharge_completed_${brandId}`, "1");
              refreshBrand(brandId);
              navigate("/app");
            }}
          />
        )}
      </div>
    </div>
  );
}
