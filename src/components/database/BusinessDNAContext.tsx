import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
  illustrationSvgs?: string[];
  illustrationIconNames?: string[];
  patternSvg?: string;
  iconConcepts?: string[];
  websiteScreenshot?: string;
  mobileScreenshot?: string;
  guidelineImageUrls?: string[];
  socialMediaUrls?: string[];
}

export interface SafetySettings {
  focusEnabled: boolean;
  promptInjectionEnabled: boolean;
  moderationCategories: Record<string, { enabled: boolean; level: "Low" | "Medium" | "High" }>;
  customGuardrails: { name: string; prompt: string }[];
}

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  focusEnabled: false,
  promptInjectionEnabled: false,
  moderationCategories: {
    "Sexual": { enabled: false, level: "High" },
    "Violence": { enabled: false, level: "High" },
    "Violence Graphic": { enabled: false, level: "High" },
    "Harassment": { enabled: false, level: "High" },
    "Harassment Threatening": { enabled: false, level: "High" },
    "Hate": { enabled: false, level: "High" },
    "Hate Threatening": { enabled: false, level: "High" },
    "Self Harm": { enabled: false, level: "High" },
    "Self Harm Intent": { enabled: false, level: "High" },
    "Self Harm Instructions": { enabled: false, level: "High" },
  },
  customGuardrails: [],
};

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
  agentName?: string;
  safetySettings?: SafetySettings;
}

export interface ProductEntry extends ProductData {
  brandId?: string;
}

export interface AudienceEntry extends AudienceData {
  productIds?: string[];
  avatarUrl?: string;
  brandId?: string;
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
  deleteBrand: (brandId: string) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  deleteAudience: (audienceId: string) => Promise<void>;
  reloadData: () => Promise<{ brands: BrandEntry[]; products: ProductEntry[]; audiences: AudienceEntry[] }>;
  refreshBrand: (brandId: string) => Promise<void>;
}

const BusinessDNAContext = createContext<BusinessDNAContextType | null>(null);

export function useBusinessDNA() {
  const ctx = useContext(BusinessDNAContext);
  if (!ctx) throw new Error("useBusinessDNA must be used within BusinessDNAProvider");
  return ctx;
}

async function loadEntities<T>(dataType: string, workspaceId?: string | null): Promise<T[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

  let query = supabase
    .from("user_business_data")
    .select("*")
    .eq("data_type", dataType)
    .eq("source", "business-dna");

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", session.user.id);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
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

  // Always ensure we have a workspace_id — fall back to localStorage
  const resolvedWorkspaceId = workspaceId || localStorage.getItem("preferred_workspace_id");

  const payload: any = {
    user_id: session.user.id,
    data_type: dataType,
    source: "business-dna",
    title: entity.name || "Untitled",
    content: JSON.stringify(entity),
    is_analyzed: true,
  };

  if (resolvedWorkspaceId) {
    payload.workspace_id = resolvedWorkspaceId;
  }

  if (existingRowId) {
    const { error } = await supabase.from("user_business_data").update(payload).eq("id", existingRowId);
    if (error) console.error(`Failed to update ${dataType}:`, error.message);
  } else {
    const { error } = await supabase.from("user_business_data").insert(payload);
    if (error) console.error(`Failed to insert ${dataType}:`, error.message);
  }
}

async function deleteEntity(rowId: string) {
  const { error } = await supabase.from("user_business_data").delete().eq("id", rowId);
  if (error) console.error("deleteEntity failed for", rowId, error.message);
}

async function deleteEntityByLogicalId(logicalId: string, dataType: string, workspaceId?: string | null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  let query = supabase
    .from("user_business_data")
    .select("id, content")
    .eq("data_type", dataType)
    .eq("source", "business-dna");

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", session.user.id);
  }

  const { data } = await query;
  if (!data) return;

  for (const row of data) {
    try {
      const parsed = JSON.parse(row.content || "{}");
      if (parsed.id === logicalId) {
        await deleteEntity(row.id);
        return;
      }
    } catch {}
  }
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
  const loadedWorkspaceRef = useRef<string | null>(null);

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
    // Skip reload if we already have data for this workspace
    if (loadedWorkspaceRef.current === activeWorkspaceId && !isLoading) return;

    async function load() {
      // Only show loading skeleton on first load or workspace switch
      const isWorkspaceSwitch = loadedWorkspaceRef.current !== activeWorkspaceId;
      if (isWorkspaceSwitch) {
        setIsLoading(true);
      }
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
      loadedWorkspaceRef.current = activeWorkspaceId;
      setIsLoading(false);
    }
    load();
  }, [activeWorkspaceId]);

  const reloadData = async () => {
    setIsLoading(true);
    const wsId = localStorage.getItem("preferred_workspace_id") || activeWorkspaceId;
    const [b, p, a] = await Promise.all([
      loadEntities<BrandEntry>("brand", wsId),
      loadEntities<ProductEntry>("product", wsId),
      loadEntities<AudienceEntry>("audience", wsId),
    ]);
    setBrandsState(b);
    setProductsState(p);
    setAudiencesState(a);
    setPrevBrands(b);
    setPrevProducts(p);
    setPrevAudiences(a);
    setActiveWorkspaceId(wsId);
    loadedWorkspaceRef.current = wsId;
    setIsLoading(false);
    return { brands: b, products: p, audiences: a };
  };

  // Direct delete functions that await DB deletion before updating state
  const deleteBrand = async (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    const brandProductIds = products.filter(p => p.brandId === brandId).map(p => p.id);
    const affectedAudiences = audiences.filter(a => a.brandId === brandId || a.productIds?.some(pid => brandProductIds.includes(pid)));
    const affectedProducts = products.filter(p => p.brandId === brandId);

    // Delete from DB first (await all)
    const deletePromises: Promise<any>[] = [];
    if ((brand as any)?._rowId) deletePromises.push(deleteEntity((brand as any)._rowId));
    affectedProducts.forEach(p => { if ((p as any)._rowId) deletePromises.push(deleteEntity((p as any)._rowId)); });
    affectedAudiences.forEach(a => { if ((a as any)._rowId) deletePromises.push(deleteEntity((a as any)._rowId)); });
    await Promise.all(deletePromises);

    // Then update local state
    const newAudiences = audiences.filter(a => a.brandId !== brandId && !a.productIds?.some(pid => brandProductIds.includes(pid)));
    const newProducts = products.filter(p => p.brandId !== brandId);
    const newBrands = brands.filter(b => b.id !== brandId);
    
    setAudiencesState(newAudiences);
    setPrevAudiences(newAudiences);
    setProductsState(newProducts);
    setPrevProducts(newProducts);
    setBrandsState(newBrands);
    setPrevBrands(newBrands);
  };

  const deleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if ((product as any)?._rowId) await deleteEntity((product as any)._rowId);
    
    const newProducts = products.filter(p => p.id !== productId);
    setProductsState(newProducts);
    setPrevProducts(newProducts);
  };

  const deleteAudience = async (audienceId: string) => {
    const audience = audiences.find(a => a.id === audienceId);
    if ((audience as any)?._rowId) await deleteEntity((audience as any)._rowId);
    
    const newAudiences = audiences.filter(a => a.id !== audienceId);
    setAudiencesState(newAudiences);
    setPrevAudiences(newAudiences);
  };

  const refreshBrand = async (brandId: string) => {
    const wsId = localStorage.getItem("preferred_workspace_id") || activeWorkspaceId;
    const freshBrands = await loadEntities<BrandEntry>("brand", wsId);
    const updated = freshBrands.find(b => b.id === brandId);
    if (updated) {
      setBrandsState(prev => prev.map(b => b.id === brandId ? updated : b));
      setPrevBrands(prev => prev.map(b => b.id === brandId ? updated : b));
      console.log("Brand refreshed with enriched data:", brandId);
    }
  };

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
      deleteBrand,
      deleteProduct,
      deleteAudience,
      reloadData,
      refreshBrand,
    }}>
      {children}
    </BusinessDNAContext.Provider>
  );
}
