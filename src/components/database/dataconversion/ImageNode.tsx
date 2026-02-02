import { useState, useCallback, useRef } from "react";
import { Image as ImageIcon, Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CanvasNode, PendingConnection } from "./types";

interface ImageNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
}

const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

export function ImageNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onUpdate,
}: ImageNodeProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      console.error("Unsupported file type:", file.type);
      return;
    }

    setIsUploading(true);
    try {
      const url = URL.createObjectURL(file);
      onUpdate(node.id, { imageUrl: url });
    } finally {
      setIsUploading(false);
    }
  }, [node.id, onUpdate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [handleFileSelect]);

  const clearImage = useCallback(() => {
    if (node.imageUrl) URL.revokeObjectURL(node.imageUrl);
    onUpdate(node.id, { imageUrl: undefined });
  }, [node.id, node.imageUrl, onUpdate]);

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-lg shadow-lg overflow-hidden",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 180,
        height: 160,
      }}
      onMouseDown={onMouseDown}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_TYPES.join(",")}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Input port */}
      <div
        className={cn(
          "absolute -left-2 top-8 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all z-10",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
            <ImageIcon className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-xs font-medium">Image</span>
        </div>
        {node.imageUrl && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              clearImage();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="p-2 h-[calc(100%-40px)]">
        {node.imageUrl ? (
          <div className="h-full rounded-md overflow-hidden bg-muted/30">
            <img
              src={node.imageUrl}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div
            className={cn(
              "h-full rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/10" : "border-border hover:border-primary/50",
              isUploading && "pointer-events-none opacity-50"
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Drop image</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Output port */}
      <div
        className={cn(
          "absolute -right-2 top-8 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all z-10",
          "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
