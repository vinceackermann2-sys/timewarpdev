import { useState } from "react";

export function DataConversionView() {
  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-2 bg-card/50">
        <span className="text-sm font-medium">Data Conversion Whiteboard</span>
        <span className="text-xs text-muted-foreground ml-2">• Interactive node canvas</span>
      </div>
      
      {/* Canvas Area - Placeholder for whiteboard */}
      <div className="flex-1 relative overflow-hidden bg-muted/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Whiteboard Canvas</p>
            <p className="text-sm">Share your vision for the node-based interface</p>
          </div>
        </div>
        
        {/* Grid pattern background */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-border" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    </div>
  );
}
