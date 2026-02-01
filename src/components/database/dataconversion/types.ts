import { 
  Database, 
  FileText, 
  FileImage, 
  Globe, 
  Type,
  Search,
  Zap,
  LucideIcon
} from "lucide-react";

// Shared icon map for node types
export const nodeIconMap: Record<string, LucideIcon> = {
  "business-db": Database,
  "text": Type,
  "document": FileText,
  "image": FileImage,
  "website": Globe,
  "research": Search,
  "action": Zap,
};

export interface NodeItem {
  id: string;
  label: string;
  description: string;
  templates?: string[];
}

export interface CanvasNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}
