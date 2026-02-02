import { useState, useCallback, useRef, useEffect } from "react";
import { FileText, Upload, X, File, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CanvasNode, PendingConnection } from "./types";

interface DocumentNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  pendingConnection: PendingConnection | null;
  onMouseDown: (e: React.MouseEvent) => void;
  onInputPortMouseUp: (e: React.MouseEvent) => void;
  onOutputPortMouseDown: (e: React.MouseEvent) => void;
  onUpdate: (nodeId: string, updates: Partial<CanvasNode>) => void;
}

const SUPPORTED_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

const FILE_EXTENSIONS: Record<string, string> = {
  "application/pdf": "PDF",
  "text/csv": "CSV",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "text/plain": "TXT",
};

export function DocumentNode({
  node,
  isSelected,
  pendingConnection,
  onMouseDown,
  onInputPortMouseUp,
  onOutputPortMouseDown,
  onUpdate,
}: DocumentNodeProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [fileType, setFileType] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate analysis when document is uploaded
  useEffect(() => {
    if (node.documentUrl && !isAnalyzed && !isAnalyzing) {
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAnalyzing(false);
            setIsAnalyzed(true);
            return 100;
          }
          return prev + Math.random() * 12 + 4;
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [node.documentUrl, isAnalyzed, isAnalyzing]);

  // Reset analysis state when document is cleared
  useEffect(() => {
    if (!node.documentUrl) {
      setIsAnalyzed(false);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
  }, [node.documentUrl]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      console.error("Unsupported file type:", file.type);
      return;
    }

    setIsUploading(true);
    setIsAnalyzed(false);
    setFileType(FILE_EXTENSIONS[file.type] || "DOC");
    try {
      const url = URL.createObjectURL(file);
      onUpdate(node.id, {
        documentUrl: url,
        documentName: file.name,
      });
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

  const clearDocument = useCallback(() => {
    if (node.documentUrl) URL.revokeObjectURL(node.documentUrl);
    onUpdate(node.id, { documentUrl: undefined, documentName: undefined });
  }, [node.id, node.documentUrl, onUpdate]);

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 260,
        height: 200,
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
          "absolute -left-2 top-10 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          pendingConnection ? "border-primary scale-125 bg-primary/20" : "border-muted-foreground/50 hover:border-primary hover:scale-110"
        )}
        onMouseUp={onInputPortMouseUp}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Document</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnalyzing && (
            <span className="text-xs text-primary flex items-center gap-1">
              Analyzing... ({Math.min(Math.round(analysisProgress), 100)}%)
              <Loader2 className="h-3 w-3 animate-spin" />
            </span>
          )}
          {isAnalyzed && !isAnalyzing && (
            <span className="text-xs text-green-500 flex items-center gap-1">
              Ready
              <CheckCircle2 className="h-3.5 w-3.5" />
            </span>
          )}
          {node.documentUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => {
                e.stopPropagation();
                clearDocument();
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 h-[calc(100%-44px)]">
        {node.documentUrl ? (
          <div className="h-full rounded-lg bg-muted/30 flex flex-col items-center justify-center p-4 relative">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Extracting content...</p>
                </div>
              </div>
            )}
            <div className="relative">
              <File className="h-12 w-12 text-primary/60" />
              {fileType && (
                <span className="absolute -bottom-1 -right-1 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  {fileType}
                </span>
              )}
            </div>
            <p className="text-sm font-medium truncate w-full text-center mt-3">
              {node.documentName}
            </p>
            {isAnalyzed && (
              <p className="text-xs text-muted-foreground mt-1">Content extracted</p>
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
                <p className="text-sm text-muted-foreground">Drop document here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, CSV, DOCX, TXT</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Output port */}
      <div
        className={cn(
          "absolute -right-2 top-10 w-4 h-4 rounded-full border-2 bg-background cursor-crosshair transition-all",
          "border-primary bg-primary/20 hover:scale-110"
        )}
        onMouseDown={onOutputPortMouseDown}
      />
    </div>
  );
}
