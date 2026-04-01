import { useEffect, useRef, useState, ReactNode } from "react";

/**
 * Renders children with position:fixed, anchored to where this component
 * is placed in the layout. Always visible regardless of scroll position.
 */
export function FixedSidebar({ children, className = "" }: { children: ReactNode; className?: string }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      if (anchorRef.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setLeft(rect.left);
      }
    };

    measure();
    window.addEventListener("resize", measure);

    // Also observe layout shifts from sidebar collapse/expand
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
      {left !== null && (
        <div
          className="fixed top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
          style={{ left, width: anchorRef.current?.offsetWidth }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
