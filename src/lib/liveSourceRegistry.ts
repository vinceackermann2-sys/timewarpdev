/** Mirrors edge \`LiveSourceRegistry\` — keys are \`twsrc_1\`, etc. */
export type LiveSourceRef = {
  provider: string;
  kind: string;
  title: string;
  snippet?: string;
  webUrl?: string | null;
};

export type LiveSourceRegistry = Record<string, LiveSourceRef>;

export function parseLiveSourcesHeader(header: string | null): LiveSourceRegistry | undefined {
  if (!header?.trim()) return undefined;
  try {
    const json = decodeURIComponent(escape(atob(header.trim())));
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LiveSourceRegistry;
    }
  } catch {
    /* ignore malformed header */
  }
  return undefined;
}

export function formatLiveProviderLabel(provider: string): string {
  const map: Record<string, string> = {
    google_gmail: "Gmail",
    google_drive: "Google Drive",
    google_calendar: "Google Calendar",
    microsoft_outlook: "Outlook",
    microsoft_onedrive: "OneDrive",
    microsoft_onenote: "OneNote",
    slack: "Slack",
    hubspot: "HubSpot",
    zoom: "Zoom",
  };
  return map[provider] || provider.replace(/_/g, " ");
}
