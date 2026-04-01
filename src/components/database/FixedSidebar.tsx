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
        const rect = anchorRef.current.getBoundingClientRect();
        setPos({ left: rect.left, width: rect.width });
      }
    };

    measure();
    window.addEventListener("resize", measure);

    // Observe layout shifts from sidebar collapse/expand
    const observer = new ResizeObserver(measure);
    if (anchorRef.current?.parentElement) {
      observer.observe(anchorRef.current.parentElement);
    }

    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={anchorRef} className={className}>
      {pos !== null && (
        <div
          className="fixed top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pl-4"
          style={{ left: pos.left, width: pos.width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
