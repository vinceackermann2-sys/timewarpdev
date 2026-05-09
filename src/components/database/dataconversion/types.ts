import { 
  Database, 
  FileText, 
  FileImage, 
  Globe, 
  Type,
  Telescope,
  Images,
  Users,
  LucideIcon
} from "lucide-react";

// Shared icon map for node types
export const nodeIconMap: Record<string, LucideIcon> = {
  "business-db": Database,
  "text": Type,
  "document": FileText,
  "image": FileImage,
  "website": Globe,
  "research": Telescope,
  "action": Images,
  "leads": Users,
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
  width?: number;
  height?: number;
  // Node-specific data
  textContent?: string;
  imageUrl?: string;
  documentUrl?: string;
  documentName?: string;
  documentContent?: string;
  websiteUrl?: string;
  websiteTitle?: string;
  // AI analysis results
  analyzedContent?: string;
  isAnalyzed?: boolean;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromPort: "output";
  toNodeId: string;
  toPort: "input";
}

export interface PendingConnection {
  fromNodeId: string;
  fromPort: "output";
  mouseX: number;
  mouseY: number;
}
