import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

let cachedPathLength = 0;
let stylesInjected = false;

const LOADER_KEYFRAMES = `
  @keyframes drawStroke {
    0% {
      stroke-dashoffset: var(--path-length);
    }
    3% {
      stroke-dashoffset: calc(var(--path-length) * 0.2);
    }
    50% {
      stroke-dashoffset: 0;
    }
    100% {
      stroke-dashoffset: calc(var(--path-length) * -1);
    }
  }
`;

interface SvgPathLoaderProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  state?: 'thinking' | 'streaming' | 'done' | 'idle';
}

const SvgPathLoader = React.forwardRef<SVGSVGElement, SvgPathLoaderProps>(
  ({ className, size = 40, strokeWidth = 2, state = 'idle', ...props }, ref) => {
    const pathRef = useRef<SVGPathElement>(null);
    const [pathLength, setPathLength] = useState<number>(cachedPathLength);

    useEffect(() => {
      if (typeof window !== 'undefined' && !stylesInjected) {
        stylesInjected = true;
        const style = document.createElement('style');
        style.innerHTML = LOADER_KEYFRAMES;
        document.head.appendChild(style);
      }

      if (!cachedPathLength && pathRef.current) {
        cachedPathLength = pathRef.current.getTotalLength();
        setPathLength(cachedPathLength);
      }
    }, []);

    const isReady = pathLength > 0;
    const isAnimating = state === 'thinking' || state === 'streaming';

    return (
      <svg
        ref={ref}
        role="status"
        aria-label="Loading..."
        viewBox="0 0 19 19"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        className={cn(
          "absolute inset-0 m-auto pointer-events-none",
          state === 'done' || state === 'idle' ? 'opacity-0' : 'opacity-100',
          "transition-opacity duration-300",
          className
        )}
        {...props}
      >
        <path
          ref={pathRef}
          d="M4.43431 2.42415C-0.789139 6.90104 1.21472 15.2022 8.434 15.9242C15.5762 16.6384 18.8649 9.23035 15.9332 4.5183C14.1316 1.62255 8.43695 0.0528911 7.51841 3.33733C6.48107 7.04659 15.2699 15.0195 17.4343 16.9241"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={isReady ? {
            strokeDasharray: pathLength,
            '--path-length': pathLength,
          } as React.CSSProperties : undefined}
          className={cn(
            "transition-opacity duration-300",
            isReady && isAnimating ? "opacity-100 animate-[drawStroke_2.5s_ease-in-out_infinite]" : "opacity-0"
          )}
        />
      </svg>
    );
  }
);

SvgPathLoader.displayName = "SvgPathLoader";

export { SvgPathLoader };
