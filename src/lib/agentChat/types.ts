export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  files?: { name: string; url?: string }[];
  employees?: { id: string; name: string; role: string }[];
  isStreaming?: boolean;
  streamStartTime?: number;
  taskSteps?: { action: string; label: string; status: "running" | "done" | "error"; detail?: string }[];
  currentStepIndex?: number;
  reportContent?: string;
  reportSavedToDb?: boolean;
  suggestions?: string[];
  /** User rated this assistant reply via thumbs (hidden after submit). */
  insightFeedback?: "helpful" | "not_helpful";
}

export type ChatTaskStep = NonNullable<ChatMessage["taskSteps"]>[number];

export type EmployeeContext = { id: string; name: string; role: string };
