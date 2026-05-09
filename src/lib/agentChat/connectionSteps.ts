import type { ChatTaskStep } from "./types";

function getConnectionSearchLabel(provider: string, topic: string) {
  if (provider === "microsoft_outlook") return `Peeking into your Outlook inbox for ${topic}`;
  if (provider === "microsoft_onedrive") return `Looking through your OneDrive for ${topic}`;
  if (provider === "microsoft_onenote") return `Flipping through your OneNote pages for ${topic}`;
  if (provider === "microsoft") return `Peeking into your Microsoft 365 for ${topic}`;
  if (provider === "google_gmail") return `Peeking into your Gmail for ${topic}`;
  if (provider === "google_calendar") return `Checking your Google Calendar for ${topic}`;
  if (provider === "google_drive") return `Looking through your Google Drive for ${topic}`;
  if (provider === "google_docs") return `Skimming your Google Docs for ${topic}`;
  if (provider === "google_sheets") return `Scanning your Google Sheets for ${topic}`;
  if (provider === "google_slides") return `Browsing your Google Slides for ${topic}`;
  if (provider === "slack") return `Listening in on your Slack for ${topic}`;
  if (provider === "zoom") return `Checking your Zoom meetings for ${topic}`;
  if (provider === "hubspot") return `Digging through your HubSpot for ${topic}`;
  return `Searching ${provider} for ${topic}`;
}

function getConnectionSkipLabel(provider: string, reason: string) {
  const friendly = (r: string) => {
    if (r === "not connected") return "not connected yet";
    if (r === "not requested in this query") return "not needed for this one";
    if (r === "token expired or missing") return "needs reconnecting";
    if (r === "search failed") return "couldn't reach it";
    return r;
  };
  const r = friendly(reason);
  if (provider === "microsoft_outlook") return `Skipping Outlook — ${r}`;
  if (provider === "microsoft_onedrive") return `Skipping OneDrive — ${r}`;
  if (provider === "microsoft_onenote") return `Skipping OneNote — ${r}`;
  if (provider === "microsoft") return `Skipping Microsoft — ${r}`;
  if (provider === "google_gmail") return `Skipping Gmail — ${r}`;
  if (provider === "google_calendar") return `Skipping Google Calendar — ${r}`;
  if (provider === "google_drive") return `Skipping Google Drive — ${r}`;
  if (provider === "google_docs") return `Skipping Google Docs — ${r}`;
  if (provider === "google_sheets") return `Skipping Google Sheets — ${r}`;
  if (provider === "google_slides") return `Skipping Google Slides — ${r}`;
  if (provider === "slack") return `Skipping Slack — ${r}`;
  if (provider === "zoom") return `Skipping Zoom — ${r}`;
  if (provider === "hubspot") return `Skipping HubSpot — ${r}`;
  return `Skipping ${provider} — ${r}`;
}

export function upsertChatTaskStep(taskSteps: ChatTaskStep[], nextStep: ChatTaskStep) {
  const existingIndex = taskSteps.findIndex((step) => step.label === nextStep.label);
  if (existingIndex === -1) {
    taskSteps.push(nextStep);
    return;
  }

  taskSteps[existingIndex] = {
    ...taskSteps[existingIndex],
    ...nextStep,
    detail: nextStep.detail ?? taskSteps[existingIndex].detail,
  };
}

export function buildConnectionTaskSteps(payload: {
  connectionDecision?: { shouldSearch?: boolean; reason?: string };
  searchedProviders?: string[];
  skippedProviderDetails?: { provider: string; reason: string }[];
  queryTopic?: string;
}): ChatTaskStep[] {
  if (!payload.connectionDecision) return [];

  const topic = payload.queryTopic?.trim() || "your request";
  if (!payload.connectionDecision.shouldSearch) {
    return [{
      action: "connections",
      label: `No need to check connected tools for ${topic} — ${payload.connectionDecision.reason || "I can answer from your business context"}`,
      status: "done",
    }];
  }

  const steps: ChatTaskStep[] = [{
    action: "connections",
    label: `Checking your connected tools for ${topic}`,
    status: "done",
    detail: payload.connectionDecision.reason,
  }];

  for (const provider of payload.searchedProviders || []) {
    steps.push({
      action: "connections",
      label: getConnectionSearchLabel(provider, topic),
      status: "done",
    });
  }

  for (const skipped of payload.skippedProviderDetails || []) {
    steps.push({
      action: "connections",
      label: getConnectionSkipLabel(skipped.provider, skipped.reason),
      status: "done",
    });
  }

  return steps;
}
