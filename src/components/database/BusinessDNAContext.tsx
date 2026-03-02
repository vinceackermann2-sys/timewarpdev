import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PRODUCT, ProductData } from "@/components/database/ProductDetailView";
import { DEFAULT_AUDIENCE, AudienceData } from "@/components/database/AudienceDetailView";

export interface BrandEntry {
  id: string;
  name: string;
  category: string;
  lastUpdated: string;
}

export interface ProductEntry extends ProductData {
  brandId?: string;
}

export interface AudienceEntry extends AudienceData {
  productIds?: string[];
}

interface BusinessDNAContextType {
  userName: string;
  brands: BrandEntry[];
  setBrands: React.Dispatch<React.SetStateAction<BrandEntry[]>>;
  products: ProductEntry[];
  setProducts: React.Dispatch<React.SetStateAction<ProductEntry[]>>;
  audiences: AudienceEntry[];
  setAudiences: React.Dispatch<React.SetStateAction<AudienceEntry[]>>;
}

const BusinessDNAContext = createContext<BusinessDNAContextType | null>(null);

export function useBusinessDNA() {
  const ctx = useContext(BusinessDNAContext);
  if (!ctx) throw new Error("useBusinessDNA must be used within BusinessDNAProvider");
  return ctx;
}

export function BusinessDNAProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState("Unknown");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Unknown");
      }
    });
  }, []);

  const [brands, setBrands] = useState<BrandEntry[]>([
    {
      id: "example-1",
      name: "FlawSkin Beauty",
      category: "Beauty & Wellness",
      lastUpdated: "Feb 28, 2026",
    },
  ]);

  const [products, setProducts] = useState<ProductEntry[]>([
    {
      ...DEFAULT_PRODUCT,
      id: "example-1",
      name: "FlawSkin Hairsaver Instant Dye Shampoo",
      category: "Consumer Product",
      lastUpdated: "Feb 28, 2026",
      brandId: "example-1",
    },
  ]);

  const [audiences, setAudiences] = useState<AudienceEntry[]>([
    {
      ...DEFAULT_AUDIENCE,
      id: "example-1",
      name: "Busy Women 28–42",
      lastUpdated: "Feb 28, 2026",
      productIds: ["example-1"],
    },
  ]);

  return (
    <BusinessDNAContext.Provider value={{ userName, brands, setBrands, products, setProducts, audiences, setAudiences }}>
      {children}
    </BusinessDNAContext.Provider>
  );
}
