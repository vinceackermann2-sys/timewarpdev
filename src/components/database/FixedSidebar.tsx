import { useEffect, useRef, useState, ReactNode } from "react";

/**
 * Renders children with position:fixed, anchored to where this component
 * is placed in the layout. Always visible regardless of scroll position.
 */
export function FixedSidebar({ children, className = "" }: { children: ReactNode; className?: string }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (anchorRef.current) {
        const parent = anchorRef.current.closest("[data-sidebar-anchor]") || anchorRef.current;
        const rect = parent.getBoundingClientRect();
        setPos({ left: rect.left, width: rect.width });
      }
    };

    measure();
    window.addEventListener("resize", measure);

    // Observe layout shifts from sidebar collapse/expand
    const observer = new ResizeObserver(measure);
    const root = anchorRef.current?.closest("[data-radix-scroll-area-viewport]")
      || anchorRef.current?.closest("main")
      || document.body;
    observer.observe(root);

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={anchorRef} data-sidebar-anchor className={className}>
      {pos !== null && (
        <div
          className="fixed top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
          style={{ left: pos.left, width: pos.width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
