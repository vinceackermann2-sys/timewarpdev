import { useState, useCallback, useRef } from "react";
import { useActionGate } from "@/hooks/useActionGate";
import { Upload, FileText, Image, File, Loader2, X, CheckCircle2, Music, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  fileName: string;
  mimeType: string;
  summary: string;
  uploadedAt: string;
}

interface FileUploadZoneProps {
  onFileUploaded?: (file: UploadedFile) => void;
}

const SUPPORTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  // Audio
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/aac", "audio/ogg", "audio/webm",
  // Video
  "video/mp4", "video/quicktime", "video/webm", "video/x-msvideo",
];

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.startsWith("audio/")) return Music;
  if (mimeType.startsWith("video/")) return Video;
  if (mimeType === "application/pdf") return FileText;
  return File;
};

export function FileUploadZone({ onFileUploaded }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { checkCanUseAction } = useActionGate();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const processFile = async (file: File) => {
    if (!checkCanUseAction()) return;
    if (!SUPPORTED_TYPES.includes(file.type)) {
      toast({
        title: "Unsupported file type",
        description: `${file.name} is not supported. Please upload PDFs, images, or text files.`,
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setCurrentFile(file.name);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Please log in to upload files");
      }

      // Convert file to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64Data = btoa(binary);

      // Determine content type
      let analyzeType = "document";
      if (file.type.startsWith("image/")) analyzeType = "image";
      else if (file.type.startsWith("audio/")) analyzeType = "audio";
      else if (file.type.startsWith("video/")) analyzeType = "video";
      else if (file.type === "text/plain" || file.type === "text/csv") analyzeType = "text";

      // Build request body matching analyze-content expectations
      let contentBody: any;
      if (analyzeType === "audio" || analyzeType === "video") {
        contentBody = { fileName: file.name, fileBase64: base64Data, fileMimeType: file.type };
      } else if (analyzeType === "image") {
        contentBody = { imageName: file.name, imageBase64: base64Data, imageMimeType: file.type };
      } else if (analyzeType === "text") {
        contentBody = { text: await file.text() };
      } else {
        contentBody = { documentName: file.name, fileBase64: base64Data, fileMimeType: file.type };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-content`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ type: analyzeType, content: contentBody }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to process file");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Analysis failed");
      }

      const uploadedFile: UploadedFile = {
        id: crypto.randomUUID(),
        fileName: file.name,
        mimeType: file.type,
        summary: result.analysis?.slice(0, 200) || "Analyzed successfully",
        uploadedAt: new Date().toISOString(),
      };
      
      setUploadedFiles(prev => [...prev, uploadedFile]);
      onFileUploaded?.(uploadedFile);

      toast({
        title: "File analyzed",
        description: `${file.name} has been processed and added to your business data.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setCurrentFile(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(processFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(processFile);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer",
          "flex flex-col items-center justify-center gap-3 min-h-[120px]",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border/50 hover:border-primary/50 hover:bg-muted/30",
          isUploading && "pointer-events-none opacity-70"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Analyzing {currentFile}...</p>
              <p className="text-xs text-muted-foreground mt-1">AI is extracting content</p>
            </div>
          </>
        ) : (
          <>
            <div className={cn(
              "p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20",
              "border border-primary/30 transition-transform",
              isDragging && "scale-110"
            )}>
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Drop files here" : "Upload files for AI analysis"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, images, audio, video, CSV, Word, Excel • Max 10MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Analyzed Files
          </p>
          {uploadedFiles.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            return (
              <div
                key={file.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/30 group"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {file.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {file.summary}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <button
                    onClick={() => removeFile(file.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 transition-all"
                  >
                    <X className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
