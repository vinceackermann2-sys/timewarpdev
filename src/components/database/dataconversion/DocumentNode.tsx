import { useState, useCallback, useRef } from "react";
import { FileText, Upload, X, Loader2, CheckCircle2, FileSpreadsheet, FileType, File, Music, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  // Audio
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/aac", "audio/ogg", "audio/webm",
  // Video
  "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
  // Images
  "image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif",
];

const FILE_EXTENSIONS = ".pdf,.csv,.docx,.xlsx,.txt,.mp3,.wav,.m4a,.aac,.ogg,.mp4,.mov,.webm,.avi,.png,.jpg,.jpeg,.webp,.gif";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "pdf":
        return <FileText className="h-10 w-10 text-red-500" />;
      case "csv":
      case "xlsx":
        return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
      case "docx":
        return <FileType className="h-10 w-10 text-blue-500" />;
      case "txt":
        return <File className="h-10 w-10 text-muted-foreground" />;
      case "mp3":
      case "wav":
      case "m4a":
      case "aac":
      case "ogg":
        return <Music className="h-10 w-10 text-purple-500" />;
      case "mp4":
      case "mov":
      case "webm":
      case "avi":
        return <Video className="h-10 w-10 text-orange-500" />;
      case "png":
      case "jpg":
      case "jpeg":
      case "webp":
      case "gif":
        return <FileText className="h-10 w-10 text-teal-500" />;
      default:
        return <FileText className="h-10 w-10 text-muted-foreground" />;
    }
  };

  const analyzeDocument = useCallback(async (file: File, documentUrl: string) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    // Progress animation
    const interval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + Math.random() * 8 + 3, 90));
    }, 400);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let documentText = "";
      let fileBase64 = "";
      let fileMimeType = file.type;
      
      // Determine content type for the API
      const audioExts = ["mp3", "wav", "m4a", "aac", "ogg"];
      const videoExts = ["mp4", "mov", "webm", "avi"];
      const imageExts = ["png", "jpg", "jpeg", "webp", "gif"];
      
      let analyzeType = "document";
      if (audioExts.includes(ext || "")) analyzeType = "audio";
      else if (videoExts.includes(ext || "")) analyzeType = "video";
      else if (imageExts.includes(ext || "")) analyzeType = "image";

      // Text-based formats: read as text
      if (ext === "txt" || ext === "csv") {
        documentText = await file.text();
      } else {
        // Binary formats: convert to base64 for multimodal AI analysis
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve(base64);
          };
        });
        reader.readAsDataURL(file);
        fileBase64 = await base64Promise;
      }

      // Build request body based on content type
      let requestBody: any;
      if (analyzeType === "audio" || analyzeType === "video") {
        requestBody = {
          type: analyzeType,
          content: {
            fileName: file.name,
            fileBase64,
            fileMimeType,
          }
        };
      } else if (analyzeType === "image") {
        requestBody = {
          type: "image",
          content: {
            imageName: file.name,
            imageBase64: fileBase64,
            imageMimeType: fileMimeType,
          }
        };
      } else {
        requestBody = {
          type: "document",
          content: {
            documentText,
            documentName: file.name,
            fileBase64,
            fileMimeType,
          }
        };
      }

      // Analyze the content
      const analyzeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      const analyzeData = await analyzeResponse.json();
      
      if (analyzeData.success && analyzeData.analysis) {
        onUpdate(node.id, { 
          documentUrl, 
          documentName: file.name,
          documentContent: analyzeData.extractedText || documentText,
          analyzedContent: analyzeData.analysis,
          isAnalyzed: true
        });

        // Persist to user_business_data
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            // Upload file to storage
            const storagePath = `${session.user.id}/canvas/${Date.now()}_${file.name}`;
            await supabase.storage.from('business-data').upload(storagePath, file);

            await (supabase as any).from('user_business_data').insert({
              user_id: session.user.id,
              data_type: 'document',
              source: 'canvas',
              title: file.name,
              content: analyzeData.extractedText || documentText || null,
              analyzed_content: analyzeData.analysis,
              is_analyzed: true,
              file_path: storagePath,
              metadata: { mime_type: file.type, size: file.size },
            });
          }
        } catch (dbErr) {
          console.error("Failed to persist document data:", dbErr);
        }
      } else {
        onUpdate(node.id, { 
          documentUrl, 
          documentName: file.name,
          documentContent: documentText,
          isAnalyzed: false 
        });
      }
    } catch (error) {
      console.error("Failed to analyze document:", error);
      onUpdate(node.id, { 
        documentUrl, 
        documentName: file.name,
        isAnalyzed: false 
      });
    } finally {
      clearInterval(interval);
      setAnalysisProgress(100);
      setTimeout(() => {
        setIsAnalyzing(false);
      }, 300);
    }
  }, [node.id, onUpdate]);

  const handleFileSelect = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const url = URL.createObjectURL(file);
      onUpdate(node.id, { 
        documentUrl: url, 
        documentName: file.name,
        isAnalyzed: false,
        analyzedContent: undefined,
        documentContent: undefined
      });
      // Analyze after upload
      await analyzeDocument(file, url);
    } finally {
      setIsUploading(false);
    }
  }, [node.id, onUpdate, analyzeDocument]);

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
    onUpdate(node.id, { 
      documentUrl: undefined, 
      documentName: undefined,
      documentContent: undefined,
      analyzedContent: undefined,
      isAnalyzed: false
    });
  }, [node.id, node.documentUrl, onUpdate]);

  return (
    <div
      className={cn(
        "absolute bg-card border rounded-xl shadow-lg select-none",
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-xl" : "border-border hover:border-primary/50"
      )}
      style={{
        left: node.x,
        top: node.y,
        width: 260,
        height: 200,
        overflow: "visible",
      }}
      onMouseDown={onMouseDown}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={FILE_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
      />


      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-card relative z-10">
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
          {node.isAnalyzed && !isAnalyzing && (
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
        {node.documentName ? (
          <div className="h-full rounded-lg bg-muted/30 flex items-center justify-center p-4 relative">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-background/70 rounded-lg flex items-center justify-center z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Parsing & analyzing...</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 w-full">
              {getFileIcon(node.documentName)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{node.documentName}</p>
                {node.isAnalyzed && !isAnalyzing && (
                  <p className="text-xs text-green-500">Content extracted</p>
                )}
              </div>
            </div>
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
                <p className="text-sm text-muted-foreground">Drop file here</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOC, Audio, Video, Images & more</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Output port (centered on right edge of card) */}
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-4 h-4 rounded-full border-2 border-border bg-primary cursor-crosshair transition-all z-20 hover:scale-125"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onOutputPortMouseDown(e);
        }}
      />
    </div>
  );
}
