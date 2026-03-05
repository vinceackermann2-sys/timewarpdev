import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_PRODUCT, ProductData } from "@/components/database/ProductDetailView";
import { DEFAULT_AUDIENCE, AudienceData } from "@/components/database/AudienceDetailView";

export interface BrandColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
}

export interface BrandTypography {
  fontFamily: string;
  fontStyle: string;
  fontWeight: string;
}

export interface VisualIdentityData {
  imageGuidelines?: { rule: string; example?: string }[];
  websiteRules?: string[];
  buttonRules?: string[];
  socialMediaRules?: string[];
  moodboardUrls?: string[];
  illustrationUrls?: string[];
  websiteScreenshot?: string;
  mobileScreenshot?: string;
  guidelineImageUrls?: string[];
}

export interface BrandEntry {
  id: string;
  name: string;
  category: string;
  lastUpdated: string;
  colors?: BrandColors;
  typography?: BrandTypography;
  logoUrls?: string[];
  selectedLogo?: number;
  visualIdentity?: VisualIdentityData;
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
  isLoading: boolean;
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
}

const BusinessDNAContext = createContext<BusinessDNAContextType | null>(null);

export function useBusinessDNA() {
  const ctx = useContext(BusinessDNAContext);
  if (!ctx) throw new Error("useBusinessDNA must be used within BusinessDNAProvider");
  return ctx;
}

async function loadEntities<T>(dataType: string, workspaceId?: string | null): Promise<T[]> {
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000));
  const sessionResult = await Promise.race([
    supabase.auth.getSession().then(({ data: { session } }) => session),
    timeout,
  ]);
  if (!sessionResult?.user) return [];

  let query = supabase
    .from("user_business_data")
    .select("*")
    .eq("data_type", dataType)
    .eq("source", "business-dna");

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", sessionResult.user.id);
  }

  const queryResult = await Promise.race([
    query,
    new Promise<{ data: null; error: true }>((resolve) => setTimeout(() => resolve({ data: null, error: true }), 8000)),
  ]);
  const { data, error } = queryResult;
  if (error || !data) return [];

  return data.map((row: any) => {
    try {
      return { ...JSON.parse(row.content || "{}"), _rowId: row.id } as T;
    } catch {
      return null;
    }
  }).filter(Boolean) as T[];
}

async function saveEntity(dataType: string, entity: any, existingRowId?: string, workspaceId?: string | null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const payload: any = {
    user_id: session.user.id,
    data_type: dataType,
    source: "business-dna",
    title: entity.name || "Untitled",
    content: JSON.stringify(entity),
    is_analyzed: true,
  };

  if (workspaceId) {
    payload.workspace_id = workspaceId;
  }

  if (existingRowId) {
    await supabase.from("user_business_data").update(payload).eq("id", existingRowId);
  } else {
    await supabase.from("user_business_data").insert(payload);
  }
}

async function deleteEntity(rowId: string) {
  await supabase.from("user_business_data").delete().eq("id", rowId);
}

export function BusinessDNAProvider({ children }: { children: ReactNode }) {
  const [userName, setUserName] = useState("Unknown");
  const [brands, setBrandsState] = useState<BrandEntry[]>([]);
  const [products, setProductsState] = useState<ProductEntry[]>([]);
  const [audiences, setAudiencesState] = useState<AudienceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [prevBrands, setPrevBrands] = useState<BrandEntry[]>([]);
  const [prevProducts, setPrevProducts] = useState<ProductEntry[]>([]);
  const [prevAudiences, setPrevAudiences] = useState<AudienceEntry[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    localStorage.getItem("preferred_workspace_id")
  );

  // Keep in sync with localStorage changes from useWorkspace hook
  useEffect(() => {
    const interval = setInterval(() => {
      const stored = localStorage.getItem("preferred_workspace_id");
      if (stored !== activeWorkspaceId) {
        setActiveWorkspaceId(stored);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [activeWorkspaceId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserName(session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Unknown");
      }
    });
  }, []);

  // Load from DB on mount or when workspace changes
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [b, p, a] = await Promise.all([
        loadEntities<BrandEntry>("brand", activeWorkspaceId),
        loadEntities<ProductEntry>("product", activeWorkspaceId),
        loadEntities<AudienceEntry>("audience", activeWorkspaceId),
      ]);
      setBrandsState(b);
      setProductsState(p);
      setAudiencesState(a);
      setPrevBrands(b);
      setPrevProducts(p);
      setPrevAudiences(a);
      setIsLoading(false);
    }
    load();
  }, [activeWorkspaceId]);

  // Realtime: subscribe to changes from other workspace members
  useEffect(() => {
    if (!activeWorkspaceId) return;

    const channel = supabase
      .channel(`business-dna-${activeWorkspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_business_data",
          filter: `workspace_id=eq.${activeWorkspaceId}`,
        },
        async () => {
          // Reload all entities when any change happens from another member
          const [b, p, a] = await Promise.all([
            loadEntities<BrandEntry>("brand", activeWorkspaceId),
            loadEntities<ProductEntry>("product", activeWorkspaceId),
            loadEntities<AudienceEntry>("audience", activeWorkspaceId),
          ]);
          setBrandsState(b);
          setProductsState(p);
          setAudiencesState(a);
          setPrevBrands(b);
          setPrevProducts(p);
          setPrevAudiences(a);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeWorkspaceId]);

  // Sync brands to DB
  useEffect(() => {
    if (isLoading) return;
    const added = brands.filter(b => !prevBrands.some(pb => pb.id === b.id));
    const removed = prevBrands.filter(pb => !brands.some(b => b.id === pb.id));
    const updated = brands.filter(b => {
      const prev = prevBrands.find(pb => pb.id === b.id);
      return prev && JSON.stringify(prev) !== JSON.stringify(b);
    });

    added.forEach(b => saveEntity("brand", b, undefined, activeWorkspaceId));
    removed.forEach(b => { if ((b as any)._rowId) deleteEntity((b as any)._rowId); });
    updated.forEach(b => { if ((b as any)._rowId) saveEntity("brand", b, (b as any)._rowId, activeWorkspaceId); });

    setPrevBrands(brands);
  }, [brands]);

  // Sync products to DB
  useEffect(() => {
    if (isLoading) return;
    const added = products.filter(p => !prevProducts.some(pp => pp.id === p.id));
    const removed = prevProducts.filter(pp => !products.some(p => p.id === pp.id));
    const updated = products.filter(p => {
      const prev = prevProducts.find(pp => pp.id === p.id);
      return prev && JSON.stringify(prev) !== JSON.stringify(p);
    });

    added.forEach(p => saveEntity("product", p, undefined, activeWorkspaceId));
    removed.forEach(p => { if ((p as any)._rowId) deleteEntity((p as any)._rowId); });
    updated.forEach(p => { if ((p as any)._rowId) saveEntity("product", p, (p as any)._rowId, activeWorkspaceId); });

    setPrevProducts(products);
  }, [products]);

  // Sync audiences to DB
  useEffect(() => {
    if (isLoading) return;
    const added = audiences.filter(a => !prevAudiences.some(pa => pa.id === a.id));
    const removed = prevAudiences.filter(pa => !audiences.some(a => a.id === pa.id));
    const updated = audiences.filter(a => {
      const prev = prevAudiences.find(pa => pa.id === a.id);
      return prev && JSON.stringify(prev) !== JSON.stringify(a);
    });

    added.forEach(a => saveEntity("audience", a, undefined, activeWorkspaceId));
    removed.forEach(a => { if ((a as any)._rowId) deleteEntity((a as any)._rowId); });
    updated.forEach(a => { if ((a as any)._rowId) saveEntity("audience", a, (a as any)._rowId, activeWorkspaceId); });

    setPrevAudiences(audiences);
  }, [audiences]);

  return (
    <BusinessDNAContext.Provider value={{
      userName,
      brands, setBrands: setBrandsState,
      products, setProducts: setProductsState,
      audiences, setAudiences: setAudiencesState,
      isLoading,
      activeWorkspaceId,
      setActiveWorkspaceId,
    }}>
      {children}
    </BusinessDNAContext.Provider>
  );
}
