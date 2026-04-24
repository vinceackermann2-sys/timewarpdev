import { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
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
  integrityEnabled: boolean;
  moderationCategories: Record<string, { enabled: boolean; level: "Low" | "Medium" | "High" }>;
  customGuardrails: { name: string; prompt: string }[];
}

export const DEFAULT_SAFETY_SETTINGS: SafetySettings = {
  focusEnabled: false,
  promptInjectionEnabled: false,
  integrityEnabled: true,
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
  businessType?: string;
  /** Per-pillar manual edits: pillarOverrides[pillarId][fieldId] = "user text" */
  pillarOverrides?: Record<string, Record<string, string>>;
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
  businessLimitReached: boolean;
  businessLimit: number;
}

const BusinessDNAContext = createContext<BusinessDNAContextType | null>(null);

export function useBusinessDNA() {
  const ctx = useContext(BusinessDNAContext);
  if (!ctx) throw new Error("useBusinessDNA must be used within BusinessDNAProvider");
  return ctx;
}

async function loadEntities<T>(dataType: string, workspaceId?: string | null, session?: { user: { id: string } } | null): Promise<T[]> {
  if (!session) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }
  if (!session?.user) return [];

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

/**
 * PERFORMANCE: Lightweight brand list loader.
 * Fetches only id, title, metadata (no `content`) — enough to render the breadcrumb
 * dropdown and decide onboarding-vs-DNA. Avoids downloading multi-MB content blobs.
 * Dedupes by logical brand id (metadata.brandId), keeping the most recent row per brand.
 * The full content for the active brand is hydrated lazily via `refreshBrand`.
 */
async function loadBrandsLight(workspaceId?: string | null, session?: { user: { id: string } } | null): Promise<BrandEntry[]> {
  if (!session) {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  }
  if (!session?.user) return [];

  let query = supabase
    .from("user_business_data")
    .select("id, title, metadata, created_at")
    .eq("data_type", "brand")
    .eq("source", "business-dna")
    .order("created_at", { ascending: false });

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  } else {
    query = query.eq("user_id", session.user.id);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Dedupe by logical brandId (metadata.brandId), keep most recent
  const seen = new Set<string>();
  const out: BrandEntry[] = [];
  for (const row of data) {
    const meta = (row.metadata as any) || {};
    const logicalId: string = meta.brandId || row.id;
    if (seen.has(logicalId)) continue;
    seen.add(logicalId);
    out.push({
      id: logicalId,
      name: row.title || "Untitled",
      category: "",
      lastUpdated: (row as any).created_at || new Date().toISOString(),
      _rowId: row.id,
      _light: true,
    } as BrandEntry & { _rowId: string; _light: boolean });
  }
  return out;
}


async function saveEntity(dataType: string, entity: any, existingRowId?: string, workspaceId?: string | null) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  // Always ensure we have a workspace_id — fall back to localStorage
  const resolvedWorkspaceId = workspaceId || localStorage.getItem("preferred_workspace_id");

  // Determine brandId for metadata so items appear in the Database tab
  let brandId: string | undefined;
  if (dataType === "brand") {
    brandId = entity.id;
  } else if (entity.brandId) {
    brandId = entity.brandId;
  }

  const payload: any = {
    user_id: session.user.id,
    data_type: dataType,
    source: "business-dna",
    title: entity.name || "Untitled",
    content: JSON.stringify(entity),
    is_analyzed: true,
    metadata: brandId ? { brandId } : undefined,
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

async function deleteEntities(rowIds: string[]) {
  const uniqueRowIds = Array.from(new Set(rowIds.filter(Boolean)));
  if (uniqueRowIds.length === 0) return;

  const { error } = await supabase.from("user_business_data").delete().in("id", uniqueRowIds);
  if (error) {
    console.error("deleteEntities failed for", uniqueRowIds.join(", "), error.message);
    throw error;
  }
}

async function deleteEntity(rowId: string) {
  await deleteEntities([rowId]);
}

/** Dispatch a custom event so dashboard and other views know DNA changed */
function dispatchDnaMutation(brandId?: string) {
  if (!brandId) return;
  // Clear dashboard cache for this brand
  try { localStorage.removeItem(`dash_cards_${brandId}`); } catch {}
  window.dispatchEvent(new CustomEvent("dna_mutated", { detail: { brandId } }));
}

async function findRowIdsByLogicalIds(dataType: string, logicalIds: string[], workspaceId?: string | null): Promise<string[]> {
  if (logicalIds.length === 0) return [];

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return [];

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

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error(`findRowIdsByLogicalIds failed for ${dataType}:`, error.message);
    return [];
  }

  const wanted = new Set(logicalIds);
  const rowIds: string[] = [];

  for (const row of data) {
    try {
      const parsed = JSON.parse(row.content || "{}");
      if (wanted.has(parsed.id)) {
        rowIds.push(row.id);
      }
    } catch {}
  }

  return rowIds;
}

async function deleteEntityByLogicalId(logicalId: string, dataType: string, workspaceId?: string | null) {
  const rowIds = await findRowIdsByLogicalIds(dataType, [logicalId], workspaceId);
  if (rowIds.length > 0) {
    await deleteEntities(rowIds);
  }
}

/** Per-workspace cache key. Falls back to "user" scope when no workspace is set. */
function brandCacheKey(workspaceId: string | null) {
  return `cached_brands_v2:${workspaceId || "user"}`;
}

/** Trim brand payload to the lightweight fields needed for breadcrumb / auto-open decision.
 *  Visual identity & pillar overrides are large; we omit them from cache to keep it tiny. */
function compactBrandForCache(b: BrandEntry): BrandEntry {
  return {
    id: b.id,
    name: b.name,
    category: b.category,
    lastUpdated: b.lastUpdated,
    colors: b.colors,
    typography: b.typography,
    logoUrls: b.logoUrls,
    selectedLogo: b.selectedLogo,
    agentName: b.agentName,
    businessType: b.businessType,
  } as BrandEntry;
}

export function BusinessDNAProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [userName, setUserName] = useState("Unknown");

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    localStorage.getItem("preferred_workspace_id")
  );

  // Hydrate brands from per-workspace localStorage cache for instant breadcrumb rendering
  const [brands, setBrandsState] = useState<BrandEntry[]>(() => {
    try {
      const cached = localStorage.getItem(brandCacheKey(activeWorkspaceId));
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });
  const [products, setProductsState] = useState<ProductEntry[]>([]);
  const [audiences, setAudiencesState] = useState<AudienceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(() => {
    // If we have cached brands for THIS workspace, skip showing skeleton initially
    try { return !localStorage.getItem(brandCacheKey(activeWorkspaceId)); } catch { return true; }
  });
  const [prevBrands, setPrevBrands] = useState<BrandEntry[]>([]);
  const { getBusinessLimit } = useSubscription();
  const businessLimit = getBusinessLimit();
  const businessLimitReached = useMemo(() => businessLimit !== Infinity && brands.length >= businessLimit, [brands.length, businessLimit]);
  const [prevProducts, setPrevProducts] = useState<ProductEntry[]>([]);
  const [prevAudiences, setPrevAudiences] = useState<AudienceEntry[]>([]);
  const loadedWorkspaceRef = useRef<string | null | undefined>(undefined);

  // Keep in sync with workspace changes (event-driven, no polling)
  useEffect(() => {
    // storage event fires for cross-tab; custom event for same-tab
    const sync = () => {
      const stored = localStorage.getItem("preferred_workspace_id");
      if (stored !== activeWorkspaceId) setActiveWorkspaceId(stored);
    };
    const onStorage = (e: StorageEvent) => { if (e.key === "preferred_workspace_id") sync(); };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("workspace_changed", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("workspace_changed", onCustom);
    };
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
    if (authLoading || !user) return;
    if (loadedWorkspaceRef.current !== undefined && loadedWorkspaceRef.current === activeWorkspaceId) return;

    async function load() {
      const isWorkspaceSwitch = loadedWorkspaceRef.current !== activeWorkspaceId;
      // Hydrate from this-workspace cache if we just switched (avoids stale brands from prior workspace)
      let hasCached = false;
      try {
        const cached = localStorage.getItem(brandCacheKey(activeWorkspaceId));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setBrandsState(parsed);
            hasCached = true;
          }
        }
      } catch {}

      if (isWorkspaceSwitch && !hasCached) {
        setIsLoading(true);
        // Clear any stale brands from the previous workspace so we don't flash them
        setBrandsState([]);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      // PHASE 1: Lightweight brand list — no `content`, just enough for breadcrumb
      // and onboarding-vs-DNA decision. This avoids downloading MB-sized blobs.
      const brandsLight = await loadBrandsLight(activeWorkspaceId, session);
      setBrandsState(brandsLight);
      try {
        localStorage.setItem(brandCacheKey(activeWorkspaceId), JSON.stringify(brandsLight.map(compactBrandForCache)));
      } catch {}
      setPrevBrands(brandsLight);
      loadedWorkspaceRef.current = activeWorkspaceId;
      setIsLoading(false);

      // PHASE 2: Load products + audiences in the background
      const [p, a] = await Promise.all([
        loadEntities<ProductEntry>("product", activeWorkspaceId, session),
        loadEntities<AudienceEntry>("audience", activeWorkspaceId, session),
      ]);
      setProductsState(p);
      setAudiencesState(a);
      setPrevProducts(p);
      setPrevAudiences(a);

      // Orphan validation — log warnings for dangling references
      const brandIds = new Set(brandsLight.map(br => br.id));
      const productIds = new Set(p.map(pr => pr.id));
      const orphanProducts = p.filter(pr => pr.brandId && !brandIds.has(pr.brandId));
      const orphanAudiences = a.filter(au => au.productIds?.some(pid => !productIds.has(pid)));
      if (orphanProducts.length) console.warn(`[DNA Integrity] ${orphanProducts.length} product(s) reference missing brand:`, orphanProducts.map(x => x.id));
      if (orphanAudiences.length) console.warn(`[DNA Integrity] ${orphanAudiences.length} audience(s) reference missing product:`, orphanAudiences.map(x => x.id));
    }
    load();
  }, [activeWorkspaceId, authLoading, user]);

  const reloadData = async () => {
    setIsLoading(true);
    const wsId = localStorage.getItem("preferred_workspace_id") || activeWorkspaceId;
    const [b, p, a] = await Promise.all([
      loadBrandsLight(wsId),
      loadEntities<ProductEntry>("product", wsId),
      loadEntities<AudienceEntry>("audience", wsId),
    ]);
    setBrandsState(b);
    try {
      localStorage.setItem(brandCacheKey(wsId), JSON.stringify(b.map(compactBrandForCache)));
    } catch {}
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

    // Resolve all row ids first, then delete in a single DB statement to avoid timeout spikes
    const deletionTargets: { dataType: "brand" | "product" | "audience"; logicalId: string; rowId?: string }[] = [
      ...(brand ? [{ dataType: "brand" as const, logicalId: brandId, rowId: (brand as any)?._rowId as string | undefined }] : []),
      ...affectedProducts.map((p) => ({ dataType: "product" as const, logicalId: p.id, rowId: (p as any)?._rowId as string | undefined })),
      ...affectedAudiences.map((a) => ({ dataType: "audience" as const, logicalId: a.id, rowId: (a as any)?._rowId as string | undefined })),
    ];

    const directRowIds = deletionTargets
      .map((target) => target.rowId)
      .filter((id): id is string => Boolean(id));

    const missingByType = deletionTargets.reduce<Record<string, string[]>>((acc, target) => {
      if (!target.rowId) {
        if (!acc[target.dataType]) acc[target.dataType] = [];
        acc[target.dataType].push(target.logicalId);
      }
      return acc;
    }, {});

    const resolvedMissing = await Promise.all(
      Object.entries(missingByType).map(([dataType, logicalIds]) =>
        findRowIdsByLogicalIds(dataType, logicalIds, activeWorkspaceId)
      )
    );

    const rowIdsToDelete = Array.from(new Set([...directRowIds, ...resolvedMissing.flat()]));
    if (rowIdsToDelete.length > 0) {
      await deleteEntities(rowIdsToDelete);

      // Unlink any AI employees that referenced these deleted rows
      try {
        const { data: orphanedEmployees } = await supabase
          .from("ai_employees")
          .select("id")
          .in("linked_business_id", rowIdsToDelete);
        if (orphanedEmployees && orphanedEmployees.length > 0) {
          const empIds = orphanedEmployees.map(e => e.id);
          await supabase
            .from("ai_employees")
            .update({ linked_business_id: null })
            .in("id", empIds);
          toast.info(`${orphanedEmployees.length} employee(s) were unlinked from deleted business`);
        }
      } catch (e) {
        console.error("Failed to unlink employees:", e);
      }
    }

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

    // Dispatch mutation event for dashboard invalidation
    dispatchDnaMutation(brandId);
  };

  const deleteProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if ((product as any)?._rowId) {
      await deleteEntity((product as any)._rowId);
    } else {
      const rowIds = await findRowIdsByLogicalIds("product", [productId], activeWorkspaceId);
      if (rowIds.length > 0) {
        await deleteEntities(rowIds);
      }
    }
    
    const newProducts = products.filter(p => p.id !== productId);
    setProductsState(newProducts);
    setPrevProducts(newProducts);
  };

  const deleteAudience = async (audienceId: string) => {
    const audience = audiences.find(a => a.id === audienceId);
    if ((audience as any)?._rowId) {
      await deleteEntity((audience as any)._rowId);
    } else {
      const rowIds = await findRowIdsByLogicalIds("audience", [audienceId], activeWorkspaceId);
      if (rowIds.length > 0) {
        await deleteEntities(rowIds);
      }
    }
    
    const newAudiences = audiences.filter(a => a.id !== audienceId);
    setAudiencesState(newAudiences);
    setPrevAudiences(newAudiences);
  };

  const refreshBrand = async (brandId: string) => {
    // Try to refresh using the existing _rowId first (single row fetch)
    const existing = brands.find(b => b.id === brandId);
    const rowId = (existing as any)?._rowId;

    if (rowId) {
      const { data, error } = await supabase
        .from("user_business_data")
        .select("id, content")
        .eq("id", rowId)
        .maybeSingle();
      if (!error && data) {
        try {
          const parsed = JSON.parse(data.content || "{}");
          const updated = { ...parsed, _rowId: data.id } as BrandEntry;
          setBrandsState(prev => prev.map(b => b.id === brandId ? updated : b));
          setPrevBrands(prev => prev.map(b => b.id === brandId ? updated : b));
          return;
        } catch {}
      }
    }

    // Fallback: scan brands for this workspace (only if _rowId is missing)
    const wsId = localStorage.getItem("preferred_workspace_id") || activeWorkspaceId;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    let query = supabase
      .from("user_business_data")
      .select("id, content")
      .eq("data_type", "brand")
      .eq("source", "business-dna");

    if (wsId) {
      query = query.eq("workspace_id", wsId);
    } else {
      query = query.eq("user_id", session.user.id);
    }

    const { data, error } = await query;
    if (error || !data) return;

    for (const row of data) {
      try {
        const parsed = JSON.parse(row.content || "{}");
        if (parsed.id === brandId) {
          const updated = { ...parsed, _rowId: row.id } as BrandEntry;
          setBrandsState(prev => prev.map(b => b.id === brandId ? updated : b));
          setPrevBrands(prev => prev.map(b => b.id === brandId ? updated : b));
          return;
        }
      } catch {}
    }
  };

  // Sync brands to DB.
  // PERF: Use Map lookups (O(1)) instead of nested .find/.some (O(N²)).
  // Skip stringify diff when object reference is identical (no real change).
  useEffect(() => {
    if (isLoading) return;
    const prevById = new Map(prevBrands.map(pb => [pb.id, pb] as const));
    const currById = new Map(brands.map(b => [b.id, b] as const));

    const added = brands.filter(b => !prevById.has(b.id));
    const removed = prevBrands.filter(pb => !currById.has(pb.id));
    const updated = brands.filter(b => {
      const prev = prevById.get(b.id);
      if (!prev) return false;
      if (prev === b) return false; // identical reference → no diff
      // SAFETY: never resave brands that are still lightweight stubs.
      // The full `content` hasn't been hydrated, so writing back would wipe
      // visualIdentity / pillarOverrides / safetySettings etc.
      if ((b as any)._light || (prev as any)._light) return false;
      return JSON.stringify(prev) !== JSON.stringify(b);
    });

    added.forEach(b => { saveEntity("brand", b, undefined, activeWorkspaceId); dispatchDnaMutation(b.id); });
    removed.forEach(b => { if ((b as any)._rowId) deleteEntity((b as any)._rowId); dispatchDnaMutation(b.id); });
    updated.forEach(b => { if ((b as any)._rowId) saveEntity("brand", b, (b as any)._rowId, activeWorkspaceId); dispatchDnaMutation(b.id); });

    setPrevBrands(brands);
  }, [brands]);

  // Sync products to DB
  useEffect(() => {
    if (isLoading) return;
    const prevById = new Map(prevProducts.map(pp => [pp.id, pp] as const));
    const currById = new Map(products.map(p => [p.id, p] as const));

    const added = products.filter(p => !prevById.has(p.id));
    const removed = prevProducts.filter(pp => !currById.has(pp.id));
    const updated = products.filter(p => {
      const prev = prevById.get(p.id);
      if (!prev || prev === p) return false;
      return JSON.stringify(prev) !== JSON.stringify(p);
    });

    added.forEach(p => { saveEntity("product", p, undefined, activeWorkspaceId); dispatchDnaMutation(p.brandId); });
    removed.forEach(p => { if ((p as any)._rowId) deleteEntity((p as any)._rowId); dispatchDnaMutation(p.brandId); });
    updated.forEach(p => { if ((p as any)._rowId) saveEntity("product", p, (p as any)._rowId, activeWorkspaceId); dispatchDnaMutation(p.brandId); });

    setPrevProducts(products);
  }, [products]);

  // Sync audiences to DB
  useEffect(() => {
    if (isLoading) return;
    const prevById = new Map(prevAudiences.map(pa => [pa.id, pa] as const));
    const currById = new Map(audiences.map(a => [a.id, a] as const));

    const added = audiences.filter(a => !prevById.has(a.id));
    const removed = prevAudiences.filter(pa => !currById.has(pa.id));
    const updated = audiences.filter(a => {
      const prev = prevById.get(a.id);
      if (!prev || prev === a) return false;
      return JSON.stringify(prev) !== JSON.stringify(a);
    });

    added.forEach(a => { saveEntity("audience", a, undefined, activeWorkspaceId); dispatchDnaMutation(a.brandId); });
    removed.forEach(a => { if ((a as any)._rowId) deleteEntity((a as any)._rowId); dispatchDnaMutation(a.brandId); });
    updated.forEach(a => { if ((a as any)._rowId) saveEntity("audience", a, (a as any)._rowId, activeWorkspaceId); dispatchDnaMutation(a.brandId); });

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
      businessLimitReached,
      businessLimit,
    }}>
      {children}
    </BusinessDNAContext.Provider>
  );
}
