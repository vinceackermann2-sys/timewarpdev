import { useState, useCallback, useRef, useEffect } from "react";
import { Image as ImageIcon, Upload, X, Loader2, CheckCircle2 } from "lucide-react";
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeImage = useCallback(async (file: File, imageUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Progress animation
    const interval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 8 + 3, 90));
    }, 400);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            type: "image",
            content: {
              imageBase64,
              imageMimeType: file.type
            }
          }),
        }
      );

      const data = await response.json();
      
      if (data.success && data.analysis) {
        onUpdate(node.id, { 
          imageUrl,
          analyzedContent: data.analysis,
          isAnalyzed: true
        });
      } else {
        onUpdate(node.id, { imageUrl, isAnalyzed: false });
      }
    } catch (error) {
      console.error("Failed to analyze image:", error);
      onUpdate(node.id, { imageUrl, isAnalyzed: false });
    } finally {
      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 300);
    }
  }, [node.id, onUpdate]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      console.error("Unsupported file type:", file.type);
      return;
    }

    setIsUploading(true);
    try {
      const url = URL.createObjectURL(file);
      onUpdate(node.id, { imageUrl: url, isAnalyzed: false, analyzedContent: undefined });
      // Analyze after upload
      await analyzeImage(file, url);
    } finally {
      setIsUploading(false);
    }
  }, [node.id, onUpdate, analyzeImage]);

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
    onUpdate(node.id, { imageUrl: undefined, analyzedContent: undefined, isAnalyzed: false });
  }, [node.id, node.imageUrl, onUpdate]);

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg overflow-hidden",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 260,
        height: 220,
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
          "absolute -left-2 top-10 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all z-10",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-card relative z-10">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Image</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-xs text-primary flex items-center gap-1">
              Analyzing... ({Math.min(Math.round(analysisProgress), 100)}%)
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {node.isAnalyzed && !isAnalyzing && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              Ready
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
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
      </div>

      {/* Content */}
      <div className="p-3 h-[calc(100%-44px)]">
        {node.imageUrl ? (
          <div className="h-full rounded-lg overflow-hidden bg-muted/30 relative">
            <img
              src={node.imageUrl}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Analyzing image with AI...</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              "h-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors",
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
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Drop image here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WEBP, GIF</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Output port */}
      <div
        className={cn(
          "absolute -right-2 top-10 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all z-10",
          "border-primary bg-primary/20 hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
