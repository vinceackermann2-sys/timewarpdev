import { useState, useRef, useCallback, useEffect } from "react";
import { Palette, Package, Users, Link2, X, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBusinessDNA, BrandEntry, ProductEntry, AudienceEntry } from "./BusinessDNAContext";

/* ── Types ── */
type EntityType = "brand" | "product" | "audience";

interface EntityItem {
  id: string;
  name: string;
  type: EntityType;
}

interface DragLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Connection {
  fromId: string;
  fromType: EntityType;
  toId: string;
  toType: EntityType;
}

const ICONS: Record<EntityType, React.ElementType> = {
  brand: Palette,
  product: Package,
  audience: Users,
};

const COLORS: Record<EntityType, string> = {
  brand: "text-violet-400",
  product: "text-blue-400",
  audience: "text-emerald-400",
};

const BG_COLORS: Record<EntityType, string> = {
  brand: "bg-violet-500/10 border-violet-500/30",
  product: "bg-blue-500/10 border-blue-500/30",
  audience: "bg-emerald-500/10 border-emerald-500/30",
};

const PORT_COLORS: Record<EntityType, string> = {
  brand: "border-violet-400/60 hover:border-violet-400 hover:bg-violet-400/20",
  product: "border-blue-400/60 hover:border-blue-400 hover:bg-blue-400/20",
  audience: "border-emerald-400/60 hover:border-emerald-400 hover:bg-emerald-400/20",
};

const LINE_COLORS: Record<string, string> = {
  "brand-product": "hsl(263, 70%, 60%)",
  "product-audience": "hsl(160, 60%, 45%)",
};

/* Which ports each entity type shows */
const PORTS: Record<EntityType, ("left" | "right")[]> = {
  brand: ["right"],
  product: ["left", "right"],
  audience: ["left"],
};

/* ── Helpers ── */
function getConnections(
  brands: BrandEntry[],
  products: ProductEntry[],
  audiences: AudienceEntry[]
): Connection[] {
  const conns: Connection[] = [];
  products.forEach((p) => {
    if (p.brandId) {
      conns.push({ fromId: p.brandId, fromType: "brand", toId: p.id, toType: "product" });
    }
  });
  audiences.forEach((a) => {
    a.productIds?.forEach((pid) => {
      conns.push({ fromId: pid, fromType: "product", toId: a.id, toType: "audience" });
    });
  });
  return conns;
}

/* ── Port component ── */
function DragPort({
  entityId,
  entityType,
  side,
  onDragStart,
  onDragEnd,
  portRef,
}: {
  entityId: string;
  entityType: EntityType;
  side: "left" | "right";
  onDragStart: (id: string, type: EntityType, e: React.MouseEvent) => void;
  onDragEnd: (id: string, type: EntityType) => void;
  portRef: (el: HTMLDivElement | null, id: string) => void;
}) {
  return (
    <div
      ref={(el) => portRef(el, `${entityId}-${side}`)}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full border-2 cursor-crosshair z-10 transition-all hover:scale-150",
        side === "left" ? "-left-[8px]" : "-right-[8px]",
        "bg-muted/80",
        PORT_COLORS[entityType]
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragStart(entityId, entityType, e);
      }}
      onMouseUp={() => onDragEnd(entityId, entityType)}
    />
  );
}

/* ── Entity card ── */
function EntityCard({
  entity,
  highlighted,
  connectedCount,
  onDragStart,
  onDragEnd,
  portRef,
  onUnset,
}: {
  entity: EntityItem;
  highlighted: boolean;
  connectedCount: number;
  onDragStart: (id: string, type: EntityType, e: React.MouseEvent) => void;
  onDragEnd: (id: string, type: EntityType) => void;
  portRef: (el: HTMLDivElement | null, id: string) => void;
  onUnset?: () => void;
}) {
  const Icon = ICONS[entity.type];
  const ports = PORTS[entity.type];
  return (
    <div
      className={cn(
        "group/card relative flex items-center gap-2 px-3 py-2 rounded-lg border transition-all select-none",
        highlighted
          ? BG_COLORS[entity.type]
          : "bg-card/60 border-border/30 hover:border-border/50"
      )}
    >
      {ports.includes("left") && (
        <DragPort
          entityId={entity.id}
          entityType={entity.type}
          side="left"
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          portRef={portRef}
        />
      )}
      <div
        className={cn(
          "h-7 w-7 rounded-md flex items-center justify-center shrink-0",
          BG_COLORS[entity.type]
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", COLORS[entity.type])} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-foreground truncate block">
          {entity.name}
        </span>
        {connectedCount > 0 && (
          <span className={cn("text-[10px]", COLORS[entity.type])}>
            Connected
          </span>
        )}
      </div>
      {connectedCount > 0 && onUnset && (
        <button
          onClick={(e) => { e.stopPropagation(); onUnset(); }}
          className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive shrink-0"
          title="Unset connections"
        >
          <Unlink className="h-3 w-3" />
        </button>
      )}
      {ports.includes("right") && (
        <DragPort
          entityId={entity.id}
          entityType={entity.type}
          side="right"
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          portRef={portRef}
        />
      )}
    </div>
  );
}

/* ── Main dialog ── */
export function ConnectionDialog({
  open,
  onOpenChange,
  focusEntityId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusEntityId?: string | null;
}) {
  const { brands, products, audiences, setProducts, setAudiences } = useBusinessDNA();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const portRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [dragLine, setDragLine] = useState<DragLine | null>(null);
  const [dragFrom, setDragFrom] = useState<{ id: string; type: EntityType } | null>(null);
  const [, forceUpdate] = useState(0);

  const connections = getConnections(brands, products, audiences);

  const setPortRef = useCallback((el: HTMLDivElement | null, id: string) => {
    if (el) portRefs.current.set(id, el);
    else portRefs.current.delete(id);
  }, []);

  // Force re-render after mount to get port positions
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => forceUpdate((n) => n + 1), 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  const getPortCenter = (entityId: string, side: "left" | "right") => {
    const el = portRefs.current.get(`${entityId}-${side}`);
    const container = containerRef.current;
    if (!el || !container) return null;
    const r = el.getBoundingClientRect();
    const cr = container.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - cr.left,
      y: r.top + r.height / 2 - cr.top,
    };
  };

  const isValidConnection = (fromType: EntityType, toType: EntityType) => {
    // brand <-> product, product <-> audience
    if (fromType === toType) return false;
    if (fromType === "brand" && toType === "audience") return false;
    if (fromType === "audience" && toType === "brand") return false;
    return true;
  };

  const handleDragStart = (id: string, type: EntityType, e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const cr = container.getBoundingClientRect();
    const x = e.clientX - cr.left;
    const y = e.clientY - cr.top;
    setDragFrom({ id, type });
    setDragLine({ x1: x, y1: y, x2: x, y2: y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragLine || !containerRef.current) return;
      const cr = containerRef.current.getBoundingClientRect();
      setDragLine((prev) =>
        prev ? { ...prev, x2: e.clientX - cr.left, y2: e.clientY - cr.top } : null
      );
    },
    [dragLine]
  );

  const handleDragEnd = (id: string, type: EntityType) => {
    if (!dragFrom || dragFrom.id === id) {
      setDragLine(null);
      setDragFrom(null);
      return;
    }

    if (isValidConnection(dragFrom.type, type)) {
      // Determine the connection direction
      let brandId: string | undefined;
      let productId: string | undefined;
      let audienceId: string | undefined;

      if (dragFrom.type === "brand") brandId = dragFrom.id;
      if (dragFrom.type === "product") productId = dragFrom.id;
      if (dragFrom.type === "audience") audienceId = dragFrom.id;
      if (type === "brand") brandId = id;
      if (type === "product") productId = id;
      if (type === "audience") audienceId = id;

      if (brandId && productId) {
        // Toggle brand-product connection
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id !== productId) return p;
            return { ...p, brandId: p.brandId === brandId ? undefined : brandId };
          })
        );
      }

      if (productId && audienceId) {
        // Toggle product-audience connection
        setAudiences((prev) =>
          prev.map((a) => {
            if (a.id !== audienceId) return a;
            const current = a.productIds || [];
            const has = current.includes(productId!);
            return {
              ...a,
              productIds: has
                ? current.filter((pid) => pid !== productId)
                : [...current, productId!],
            };
          })
        );
      }
    }

    setDragLine(null);
    setDragFrom(null);
  };

  const handleGlobalMouseUp = useCallback(() => {
    setDragLine(null);
    setDragFrom(null);
  }, []);

  useEffect(() => {
    if (dragLine) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [dragLine, handleMouseMove, handleGlobalMouseUp]);

  const removeConnection = (conn: Connection) => {
    if (conn.fromType === "brand" && conn.toType === "product") {
      setProducts((prev) =>
        prev.map((p) => (p.id === conn.toId ? { ...p, brandId: undefined } : p))
      );
    } else if (conn.fromType === "product" && conn.toType === "audience") {
      setAudiences((prev) =>
        prev.map((a) => {
          if (a.id !== conn.toId) return a;
          return {
            ...a,
            productIds: (a.productIds || []).filter((pid) => pid !== conn.fromId),
          };
        })
      );
    }
  };

  const removeAllConnectionsForEntity = (entityId: string) => {
    const entityConns = connections.filter(c => c.fromId === entityId || c.toId === entityId);
    entityConns.forEach(conn => removeConnection(conn));
  };

  // Build entity lists
  const brandEntities: EntityItem[] = brands.map((b) => ({
    id: b.id,
    name: b.name,
    type: "brand" as EntityType,
  }));
  const productEntities: EntityItem[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    type: "product" as EntityType,
  }));
  const audienceEntities: EntityItem[] = audiences.map((a) => ({
    id: a.id,
    name: a.name,
    type: "audience" as EntityType,
  }));

  const focusConnected = new Set<string>();
  if (focusEntityId) {
    focusConnected.add(focusEntityId);
    connections.forEach((c) => {
      if (c.fromId === focusEntityId) focusConnected.add(c.toId);
      if (c.toId === focusEntityId) focusConnected.add(c.fromId);
    });
  }

  // Render SVG lines for existing connections
  const renderConnections = () => {
    return connections.map((conn, i) => {
      // Figure out which column is left/right
      const fromCol =
        conn.fromType === "brand" ? "right" : conn.fromType === "product" ? (conn.toType === "audience" ? "right" : "left") : "left";
      const toCol =
        conn.toType === "audience" ? "left" : conn.toType === "product" ? (conn.fromType === "brand" ? "left" : "right") : "right";

      const from = getPortCenter(conn.fromId, fromCol as "left" | "right");
      const to = getPortCenter(conn.toId, toCol as "left" | "right");
      if (!from || !to) return null;

      const isFocused =
        !focusEntityId ||
        focusConnected.has(conn.fromId) ||
        focusConnected.has(conn.toId);

      const midX = (from.x + to.x) / 2;
      const lineColorKey = [conn.fromType, conn.toType].sort().join("-");
      const lineColor = LINE_COLORS[lineColorKey] || "hsl(var(--primary))";

      return (
        <g key={i}>
          <path
            d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
            stroke={lineColor}
            strokeWidth={2.5}
            fill="none"
            opacity={isFocused ? 0.7 : 0.15}
            className="transition-opacity"
          />
        </g>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-primary" />
            Entity Connections
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Drag from a port on one entity to another to connect them. Brand → Product → Audience.
          </p>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative min-h-[400px] pt-4"
          style={{ userSelect: "none" }}
        >
          {/* SVG overlay for lines */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ overflow: "visible" }}
          >
            <g>{renderConnections()}</g>
            {dragLine && (
              <line
                x1={dragLine.x1}
                y1={dragLine.y1}
                x2={dragLine.x2}
                y2={dragLine.y2}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.7}
              />
            )}
          </svg>

          {/* 3-column layout */}
          <div className="grid grid-cols-3 gap-6 relative z-10">
            {/* Brands */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-3">
                <Palette className="h-3.5 w-3.5 text-violet-400" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Brands
                </span>
              </div>
              {brandEntities.map((e) => (
                <EntityCard
                  key={e.id}
                  entity={e}
                  highlighted={focusConnected.size > 0 ? focusConnected.has(e.id) : false}
                  connectedCount={connections.filter(c => c.fromId === e.id || c.toId === e.id).length}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  portRef={setPortRef}
                />
              ))}
              {brandEntities.length === 0 && (
                <p className="text-xs text-muted-foreground/50 py-4 text-center">No brands</p>
              )}
            </div>

            {/* Products */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-3">
                <Package className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Products
                </span>
              </div>
              {productEntities.map((e) => (
                <EntityCard
                  key={e.id}
                  entity={e}
                  highlighted={focusConnected.size > 0 ? focusConnected.has(e.id) : false}
                  connectedCount={connections.filter(c => c.fromId === e.id || c.toId === e.id).length}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  portRef={setPortRef}
                />
              ))}
              {productEntities.length === 0 && (
                <p className="text-xs text-muted-foreground/50 py-4 text-center">No products</p>
              )}
            </div>

            {/* Audiences */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 mb-3">
                <Users className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Audiences
                </span>
              </div>
              {audienceEntities.map((e) => (
                <EntityCard
                  key={e.id}
                  entity={e}
                  highlighted={focusConnected.size > 0 ? focusConnected.has(e.id) : false}
                  connectedCount={connections.filter(c => c.fromId === e.id || c.toId === e.id).length}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  portRef={setPortRef}
                />
              ))}
              {audienceEntities.length === 0 && (
                <p className="text-xs text-muted-foreground/50 py-4 text-center">No audiences</p>
              )}
            </div>
          </div>

          {/* Active connections list with hover unset buttons */}
          {connections.length > 0 ? (
            <div className="mt-6 pt-4 border-t border-border/30 space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Connections</span>
              {connections.map((conn, i) => {
                const allEntities = [...brandEntities, ...productEntities, ...audienceEntities];
                const fromEntity = allEntities.find(e => e.id === conn.fromId);
                const toEntity = allEntities.find(e => e.id === conn.toId);
                if (!fromEntity || !toEntity) return null;
                const FromIcon = ICONS[fromEntity.type];
                const ToIcon = ICONS[toEntity.type];
                return (
                  <div key={i} className="group flex items-center justify-between gap-2 rounded-lg border border-border/30 bg-muted/30 px-3 py-2.5 hover:border-border/50 transition-colors">
                    <div className="flex items-center gap-2 text-xs text-foreground min-w-0">
                      <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", BG_COLORS[fromEntity.type])}>
                        <FromIcon className={cn("h-3 w-3", COLORS[fromEntity.type])} />
                      </div>
                      <span className="truncate font-medium">{fromEntity.name}</span>
                      <span className="text-muted-foreground/50">→</span>
                      <div className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", BG_COLORS[toEntity.type])}>
                        <ToIcon className={cn("h-3 w-3", COLORS[toEntity.type])} />
                      </div>
                      <span className="truncate font-medium">{toEntity.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeConnection(conn)}
                    >
                      <Unlink className="h-3 w-3" />
                      Unset
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t border-border/30">
              <span className="text-xs text-muted-foreground">No connections yet. Drag between ports to connect entities.</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
