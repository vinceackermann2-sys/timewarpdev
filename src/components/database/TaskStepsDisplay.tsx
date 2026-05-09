import { useState, useRef, useEffect } from "react";
import {
  CheckCircle2, XCircle, ChevronUp,
  Brain, Search, PenLine, Cog, RefreshCw, CircleCheck,
  CircleX, StopCircle, Globe, MousePointerClick,
  Keyboard, ClipboardList, ScrollText, Clock,
  SearchCode, Download, Zap, AlertTriangle, Dna, Database,
  Lightbulb, Compass, Target, Sparkles, Ear, Pencil, FileSearch, Wand2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThinkingTimer } from "./ThinkingTimer";
import { ProgressiveLoader } from "@/components/ui/progressive-loader";
import logoMsOutlook from "@/assets/logo-ms-outlook.svg";
import logoMsOnedrive from "@/assets/logo-ms-onedrive.svg";
import logoMsOnenote from "@/assets/logo-ms-onenote.svg";
import logoSlack from "@/assets/logo-slack.png";
import logoZoom from "@/assets/logo-zoom.svg";
import logoHubspot from "@/assets/logo-hubspot.svg";
import logoGmail from "@/assets/logo-gmail.svg";
import logoGoogleCalendar from "@/assets/logo-google-calendar.svg";
import logoGoogleDrive from "@/assets/logo-google-drive.svg";
import logoGoogleDocs from "@/assets/logo-google-docs.svg";
import logoGoogleSheets from "@/assets/logo-google-sheets.svg";
import logoGoogleSlides from "@/assets/logo-google-slides.svg";

/* Provider logo map */
const PROVIDER_LOGOS: Record<string, string> = {
  microsoft_outlook: logoMsOutlook,
  microsoft_onedrive: logoMsOnedrive,
  microsoft_onenote: logoMsOnenote,
  slack: logoSlack,
  zoom: logoZoom,
  hubspot: logoHubspot,
  google_gmail: logoGmail,
  google_calendar: logoGoogleCalendar,
  google_drive: logoGoogleDrive,
  google_docs: logoGoogleDocs,
  google_sheets: logoGoogleSheets,
  google_slides: logoGoogleSlides,
};

interface TaskStep {
  action: string;
  label: string;
  status: "running" | "done" | "error";
  detail?: string;
}

export type TaskStepsOpenLoop = "awaiting_user" | "incomplete_note" | null;

interface Props {
  steps: TaskStep[];
  currentStepIndex: number;
  isStreaming?: boolean;
  startTime?: number;
  /** Final elapsed seconds, set once streaming finishes — used so the timer is stable across reloads. */
  frozenElapsed?: number;
  /**
   * When the pipeline steps are "done" but the assistant still needs the user
   * (chips) or explicitly said the task is not finished — avoid showing "Completed".
   */
  openLoop?: TaskStepsOpenLoop;
}

/* ── Lucide icon map for step labels ── */
function getStepIcon(label: string) {
  const l = label.toLowerCase();
  // Connection provider icons — only show provider logos for actual connection-fetch
  // steps (the agent backend emits labels like "Peeking into your Gmail for X",
  // "Skipping Gmail — Y", "Looking through your Google Drive for Z", etc.).
  // We require one of those provider-action verbs to be present so we don't slap
  // the Gmail logo on every step just because the user's question mentions "gmail".
  const isProviderStep =
    /\b(peeking into|skipping|looking through|checking your|flipping through|searching your|searching|fetching your|reading your|scanning your|browsing your|digging through|listening in on)\b/.test(l);
  if (isProviderStep) {
    if (l.includes("gmail")) return "google_gmail" as any;
    if (l.includes("google calendar")) return "google_calendar" as any;
    if (l.includes("google drive")) return "google_drive" as any;
    if (l.includes("google docs")) return "google_docs" as any;
    if (l.includes("google sheets")) return "google_sheets" as any;
    if (l.includes("google slides")) return "google_slides" as any;
    if (l.includes("outlook")) return "microsoft_outlook" as any;
    if (l.includes("onedrive")) return "microsoft_onedrive" as any;
    if (l.includes("onenote")) return "microsoft_onenote" as any;
    if (l.includes("microsoft 365") || l.includes("microsoft")) return "microsoft_outlook" as any;
    if (l.includes("slack")) return "slack" as any;
    if (l.includes("zoom")) return "zoom" as any;
    if (l.includes("hubspot")) return "hubspot" as any;
  }
  // Always use the DNA icon when the step is about Business DNA / brand / audience / product
  if (l.includes("business dna") || l.includes(" dna ") || l.endsWith(" dna") || l.startsWith("dna ")) return Dna;
  if (l.includes("brand") || l.includes("audience") || l.includes("product") || l.includes("positioning") || l.includes("business model")) return Dna;
  if (l.includes("database") || l.includes("business data")) return Database;
  if (l.includes("internet") || l.includes("web search") || l.includes("searching the web") || l.includes("browsing")) return Globe;
  // Varied icons for the "understand" step phrasings
  if (l.includes("listening") || l.includes("sitting with")) return Ear;
  if (l.includes("framing") || l.includes("angle") || l.includes("sharpening")) return Compass;
  if (l.includes("unpacking") || l.includes("understanding") || l.includes("memory") || l.includes("context")) return Brain;
  // Varied icons for the "gather" step phrasings
  if (l.includes("receipts") || l.includes("numbers") || l.includes("facts")) return FileSearch;
  if (l.includes("stitching") || l.includes("sweeping") || l.includes("signals")) return Search;
  if (l.includes("digging") || l.includes("pulling")) return Database;
  if (l.includes("gathering")) return Database;
  // Varied icons for the "craft / answer" step phrasings
  if (l.includes("sketching") || l.includes("play")) return Lightbulb;
  if (l.includes("drafting") || l.includes("writing") || l.includes("composing")) return Pencil;
  if (l.includes("shaping") || l.includes("crafting")) return Wand2;
  if (l.includes("recommendation") || l.includes("call on") || l.includes("move") || l.includes("take")) return Target;
  if (l.includes("generating")) return Sparkles;
  if (l.includes("analyz") || l.includes("reviewing")) return Search;
  if (l.includes("checking connected") || l.includes("connected sources")) return Search;
  if (l.includes("processing") || l.includes("employee") || l.includes("preparing")) return Cog;
  if (l.includes("extending") || l.includes("continu") || l.includes("part") || l.includes("refining")) return RefreshCw;
  if (l.includes("complete") || l.includes("done") || l.includes("finished")) return CircleCheck;
  if (l.includes("error") || l.includes("fail")) return CircleX;
  if (l.includes("cancel")) return StopCircle;
  if (l.includes("navigat") || l.includes("fetching") || l.includes("connecting")) return Globe;
  if (l.includes("click")) return MousePointerClick;
  if (l.includes("type") || l.includes("fill")) return Keyboard;
  if (l.includes("extract") || l.includes("read")) return ClipboardList;
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
  frozenElapsed?: number;
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
function SectionDisplay({
  section,
  isLast,
  isStreaming,
  openLoop,
}: {
  section: Section;
  isLast: boolean;
  isStreaming?: boolean;
  openLoop?: TaskStepsOpenLoop;
}) {
  const sectionDone = section.isDone && !(isLast && isStreaming) && !openLoop;
  const [collapsed, setCollapsed] = useState(sectionDone);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sectionDone) setCollapsed(true);
  }, [sectionDone]);

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
      {/* Section header — chip-style, clearly clickable when collapsed */}
      <button
        onClick={() => setCollapsed(prev => !prev)}
        aria-expanded={!collapsed}
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors text-[13px]",
          sectionDone
            ? "border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground"
            : "border-transparent text-muted-foreground"
        )}
      >
        {sectionDone && <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground/70" />}
        <span className="font-medium">
          {openLoop === "awaiting_user"
            ? "Needs your reply"
            : openLoop === "incomplete_note"
              ? "More to do on this task"
              : sectionDone
                ? `Thought for ${taskCount} step${taskCount !== 1 ? "s" : ""}`
                : "Thinking"}
        </span>
        {!sectionDone && (
          <span className="inline-flex gap-[2px] items-end h-[14px]">
            <span className="w-[3px] h-[3px] rounded-full bg-primary/80 animate-bounce [animation-delay:0ms]" />
            <span className="w-[3px] h-[3px] rounded-full bg-primary/80 animate-bounce [animation-delay:150ms]" />
            <span className="w-[3px] h-[3px] rounded-full bg-primary/80 animate-bounce [animation-delay:300ms]" />
          </span>
        )}
        <span className="text-muted-foreground/40">·</span>
        <ThinkingTimer
          startTime={section.startTime}
          stopped={sectionDone || !!openLoop}
          frozenElapsed={section.frozenElapsed}
          className="text-[11px] opacity-60"
        />
        <ChevronUp className={cn(
          "w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 ml-0.5",
          collapsed && "rotate-180"
        )} />
      </button>

      {/* Steps timeline */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        collapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
      )}>
        <div ref={scrollRef} className="max-h-[400px] overflow-y-auto mt-1.5 ml-3">
          {section.steps.map((step, idx) => {
            const isActive = step.status === "running" && isStreaming && isLast;
            const isDone = step.status === "done";
            const isError = step.status === "error";
            const StepIcon = getStepIcon(step.label);
            const isLastStep = idx === section.steps.length - 1;

            return (
              <div
                key={idx}
                className="flex items-stretch gap-2.5 text-[13px] animate-in fade-in slide-in-from-bottom-1 duration-200"
              >
                {/* Icon column with connector line */}
                <div className="flex flex-col items-center shrink-0 w-5">
                  <span className="flex items-center justify-center h-6">
                    {isError ? (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    ) : typeof StepIcon === "string" && PROVIDER_LOGOS[StepIcon] ? (
                      <img src={PROVIDER_LOGOS[StepIcon]} alt={StepIcon} className="w-3.5 h-3.5 object-contain" />
                    ) : typeof StepIcon !== "string" ? (
                      <StepIcon className={cn(
                        "w-3.5 h-3.5",
                        isActive ? "text-primary animate-pulse" : "text-muted-foreground/50"
                      )} />
                    ) : (
                      <Zap className={cn("w-3.5 h-3.5", isActive ? "text-primary animate-pulse" : "text-muted-foreground/50")} />
                    )}
                  </span>
                  {!isLastStep && (
                    <span className="flex-1 w-px bg-border/60 min-h-[8px]" />
                  )}
                </div>

                {/* Label + bottom spacer for breathing room between rows */}
                <div className={cn("flex items-center gap-2 min-w-0 pt-1", !isLastStep && "pb-2")}>
                  {isActive ? (
                    <ProgressiveLoader text={step.label} textClassName="text-[13px]" />
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ── */
export function TaskStepsDisplay({ steps, currentStepIndex, isStreaming, startTime, frozenElapsed, openLoop }: Props) {
  const [fallbackStartTime] = useState(() => startTime ?? Date.now());
  const effectiveStartTime = startTime ?? fallbackStartTime;

  if (steps.length === 0) return null;

  const sections = buildSections(steps, effectiveStartTime).map(s => ({ ...s, frozenElapsed }));

  return (
    <div className="mb-4">
      {sections.map((section, idx) => (
        <SectionDisplay
          key={idx}
          section={section}
          isLast={idx === sections.length - 1}
          isStreaming={isStreaming}
          openLoop={openLoop}
        />
      ))}
    </div>
  );
}
