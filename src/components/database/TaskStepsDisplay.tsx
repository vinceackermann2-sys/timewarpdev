import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2, XCircle, ChevronUp,
  Brain, Search, PenLine, Cog, RefreshCw, CircleCheck,
  CircleX, StopCircle, Globe, MousePointerClick,
  Keyboard, ClipboardList, ScrollText, Clock,
  SearchCode, Download, Zap, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingTimer } from "./ThinkingTimer";
import { ShiningText } from "@/components/ui/shining-text";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsOnenote from "@/assets/logo-ms-onenote.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoHubspot from "@/assets/logo-hubspot.png";

/* Provider logo map */
const PROVIDER_LOGOS: Record<string, string> = {
  microsoft_outlook: logoMsOutlook,
  microsoft_onedrive: logoMsOnedrive,
  microsoft_onenote: logoMsOnenote,
  slack: logoSlack,
  hubspot: logoHubspot,
};

interface TaskStep {
  action: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
}

interface Props {
  steps: TaskStep[];
  currentStepIndex: number;
  isStreaming?: boolean;
}

/* ── Lucide icon map for step labels ── */
function getStepIcon(label: string) {
  const l = label.toLowerCase();
  // Connection provider icons — return string identifiers for special rendering
  if (l.includes("outlook") || l.includes("email") || l.includes("calendar")) return "microsoft_outlook" as any;
  if (l.includes("onedrive") || l.includes("files")) return "microsoft_onedrive" as any;
  if (l.includes("onenote") || l.includes("notes")) return "microsoft_onenote" as any;
  if (l.includes("microsoft")) return "microsoft_outlook" as any;
  if (l.includes("slack")) return "slack" as any;
  if (l.includes("hubspot")) return "hubspot" as any;
  if (l.includes("context") || l.includes("memory") || l.includes("understanding")) return Brain;
  if (l.includes("analyz") || l.includes("reviewing")) return Search;
  if (l.includes("writing") || l.includes("generating") || l.includes("composing") || l.includes("drafting")) return PenLine;
  if (l.includes("processing") || l.includes("employee") || l.includes("preparing")) return Cog;
  if (l.includes("extending") || l.includes("continu") || l.includes("part") || l.includes("refining")) return RefreshCw;
  if (l.includes("complete") || l.includes("done") || l.includes("finished")) return CircleCheck;
  if (l.includes("error") || l.includes("fail")) return CircleX;
  if (l.includes("cancel")) return StopCircle;
  if (l.includes("navigat") || l.includes("fetching") || l.includes("connecting")) return Globe;
  if (l.includes("click")) return MousePointerClick;
  if (l.includes("type") || l.includes("fill")) return Keyboard;
  if (l.includes("extract") || l.includes("read") || l.includes("gathering")) return ClipboardList;
  if (l.includes("scroll")) return ScrollText;
  if (l.includes("wait")) return Clock;
  if (l.includes("search") || l.includes("looking")) return SearchCode;
  if (l.includes("load") || l.includes("saving")) return Download;
  if (l.includes("warn")) return AlertTriangle;
  return Zap;
}

/* ── Section ── */
interface Section {
  steps: { label: string; status: TaskStep["status"]; count: number; detail?: string }[];
  startTime: number;
  isDone: boolean;
}

function buildSections(steps: TaskStep[], globalStartTime: number): Section[] {
  if (steps.length === 0) return [];

  // Put all steps into a single section — no splitting
  const sectionSteps: Section["steps"] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const last = sectionSteps[sectionSteps.length - 1];
    if (last && last.label === step.label && last.status === "done" && step.status !== "error") {
      last.count++;
      last.status = step.status;
    } else {
      sectionSteps.push({ label: step.label, status: step.status, count: 1, detail: step.detail });
    }
  }

  const allDone = sectionSteps.every(s => s.status === "done" || s.status === "error");
  return [{ steps: sectionSteps, startTime: globalStartTime, isDone: allDone }];
}

/* ── Section Component ── */
function SectionDisplay({ section, isLast, isStreaming }: { section: Section; isLast: boolean; isStreaming?: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionDone = section.isDone && !(isLast && isStreaming);

  useEffect(() => {
    if (scrollRef.current && !collapsed) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [section.steps, collapsed]);

  useEffect(() => {
    // Don't auto-collapse — keep all steps visible
  }, [sectionDone, isLast]);

  const taskCount = section.steps.filter(s => !s.label.toLowerCase().includes("complete")).length;

  return (
    <div className="mb-3">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        className="flex items-center gap-2 w-full group"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[15px] text-muted-foreground">
          {sectionDone && <CheckCircle2 className="w-3 h-3 text-muted-foreground/60" />}
          <span className="font-medium text-[17px]">
            {sectionDone
              ? `Completed ${taskCount} task${taskCount !== 1 ? "s" : ""}`
              : "Thinking"}
          </span>
          {!sectionDone && (
            <span className="inline-flex gap-[2px] items-end h-[14px]">
              <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
              <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
              <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
            </span>
          )}
          <span className="text-[11px] opacity-40">·</span>
          <ThinkingTimer startTime={section.startTime} stopped={sectionDone} className="text-[11px] opacity-50" />
        </div>
        <ChevronUp className={cn(
          "w-3.5 h-3.5 text-muted-foreground/30 transition-transform duration-200",
          collapsed && "rotate-180"
        )} />
      </button>

      {/* Steps timeline */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        collapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
      )}>
        <div ref={scrollRef} className="max-h-[400px] overflow-y-auto mt-1.5 ml-3 space-y-0.5">
          {section.steps.map((step, idx) => {
            const isActive = step.status === "running" && isStreaming && isLast;
            const isDone = step.status === "done";
            const isError = step.status === "error";
            const StepIcon = getStepIcon(step.label);

            return (
              <div
                key={idx}
                className="flex items-center gap-2.5 py-1 px-1 text-[13px] animate-in fade-in slide-in-from-bottom-1 duration-200"
              >
                {/* Icon - never animated */}
                <span className="w-5 text-center shrink-0">
                  {isError ? (
                    <XCircle className="w-3.5 h-3.5 text-destructive mx-auto" />
                  ) : typeof StepIcon === "string" && PROVIDER_LOGOS[StepIcon] ? (
                    <img src={PROVIDER_LOGOS[StepIcon]} alt={StepIcon} className="w-3.5 h-3.5 mx-auto object-contain" />
                  ) : typeof StepIcon !== "string" ? (
                    <StepIcon className={cn(
                      "w-3.5 h-3.5 mx-auto",
                      isActive ? "text-muted-foreground/60" : "text-muted-foreground/50"
                    )} />
                  ) : (
                    <Zap className={cn("w-3.5 h-3.5 mx-auto", isActive ? "text-muted-foreground/60" : "text-muted-foreground/50")} />
                  )}
                </span>

                {/* Label - shining animation on active steps */}
                {isActive ? (
                  <ShiningText text={step.label} className="text-[13px] truncate" />
                ) : (
                  <span className={cn(
                    "truncate",
                    isDone && "text-muted-foreground/70",
                    isError && "text-destructive",
                  )}>
                    {step.label}
                  </span>
                )}

                {step.count > 1 && (
                  <span className="text-muted-foreground/30 text-[11px] shrink-0">({step.count}×)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function TaskStepsDisplay({ steps, currentStepIndex, isStreaming }: Props) {
  const [startTime] = useState(() => Date.now());

  if (steps.length === 0) return null;

  const sections = buildSections(steps, startTime);

  return (
    <div className="mb-4">
      {sections.map((section, idx) => (
        <SectionDisplay
          key={idx}
          section={section}
          isLast={idx === sections.length - 1}
          isStreaming={isStreaming}
        />
      ))}
    </div>
  );
}
