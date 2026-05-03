import { Link } from "react-router-dom";
import { WorkspaceFooter } from "@/components/database/WorkspaceFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Data Deletion & Integration Guide</h1>
        <p className="text-muted-foreground mb-10">How TimeWarp integrates with your tools and how to manage your data</p>

        <div className="space-y-10 text-sm sm:text-base text-foreground/90 leading-relaxed">

          {/* ── Zoom Integration Guide ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Zoom Integration</h2>

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="overview">
                <AccordionTrigger className="text-sm font-medium">Overview</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    The Zoom integration connects your Zoom account to TimeWarp so your AI assistant can automatically process meeting recordings, generate summaries, extract action items, and surface insights — all without manual note-taking.
                  </p>
                  <p>
                    It's designed for business owners, team leads, and professionals who want their meetings to feed directly into their AI-powered business intelligence.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="prerequisites">
                <AccordionTrigger className="text-sm font-medium">Prerequisites</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>A Zoom account (Pro, Business, or Enterprise recommended for cloud recordings).</li>
                    <li>A TimeWarp account with an active subscription.</li>
                    <li>At least one business created in Business DNA.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="install">
                <AccordionTrigger className="text-sm font-medium">How to Install</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Go to the <a href="https://marketplace.zoom.us/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Zoom App Marketplace</a> and search for <strong className="text-foreground">"TimeWarp"</strong>.</li>
                    <li>Click <strong className="text-foreground">Install</strong> (or <strong className="text-foreground">Add</strong>).</li>
                    <li>Review the requested permissions and click <strong className="text-foreground">Allow</strong>.</li>
                    <li>You'll be redirected back to TimeWarp — the connection will appear in your <strong className="text-foreground">Connectors</strong> page.</li>
                  </ol>
                  <p className="mt-2">
                    Alternatively, you can connect Zoom directly from the <strong className="text-foreground">Connectors</strong> page inside TimeWarp without visiting the Marketplace.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="usage">
                <AccordionTrigger className="text-sm font-medium">How to Use</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Once connected, TimeWarp automatically detects your upcoming and past Zoom meetings.</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Meeting insights appear on your <strong className="text-foreground">Dashboard briefing</strong> alongside other integration updates.</li>
                    <li>Your AI assistant can reference meeting context when answering questions or generating reports.</li>
                    <li>To manage which meetings are processed, visit <strong className="text-foreground">Connectors → Zoom</strong> in the app.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="remove">
                <AccordionTrigger className="text-sm font-medium">How to Remove / Uninstall</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-1">From Zoom:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Sign in to <a href="https://zoom.us" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">zoom.us</a>.</li>
                      <li>Navigate to <strong className="text-foreground">Manage → Installed Apps</strong>.</li>
                      <li>Find <strong className="text-foreground">TimeWarp</strong> and click <strong className="text-foreground">Remove</strong>.</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">From TimeWarp:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open <strong className="text-foreground">Connectors</strong> in the app.</li>
                      <li>Find Zoom and click <strong className="text-foreground">Disconnect</strong>.</li>
                    </ol>
                  </div>
                  <p>When you disconnect or uninstall from either side, all tokens and synced meeting data are removed from TimeWarp's systems.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="permissions">
                <AccordionTrigger className="text-sm font-medium">Permissions & Data</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>TimeWarp requests the following Zoom permissions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-foreground">user:read</strong> — to identify your account and display your connected email.</li>
                    <li><strong className="text-foreground">meeting:read</strong> — to access meeting details, schedules, and recordings for AI analysis.</li>
                  </ul>
                  <p>
                    TimeWarp does <strong className="text-foreground">not</strong> modify, delete, or create meetings on your behalf. Data is used solely to generate insights within your private AI workspace.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* ── Google Integration Guide ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Google Integration (Gmail, Calendar, Drive)</h2>

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="g-overview">
                <AccordionTrigger className="text-sm font-medium">Overview</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    The Google integration connects Gmail, Google Calendar, and Google Drive to TimeWarp so your AI assistant can reference emails, meetings, and documents when generating insights, drafting replies, or surfacing action items.
                  </p>
                  <p>
                    Designed for founders and operators who want their daily Google Workspace activity feeding directly into their private AI workspace.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="g-prereq">
                <AccordionTrigger className="text-sm font-medium">Prerequisites</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>A Google account (personal or Workspace).</li>
                    <li>A TimeWarp account with an active subscription.</li>
                    <li>At least one business created in Business DNA.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="g-install">
                <AccordionTrigger className="text-sm font-medium">How to Install</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Open the <strong className="text-foreground">Connectors</strong> page inside TimeWarp.</li>
                    <li>Find <strong className="text-foreground">Gmail</strong>, <strong className="text-foreground">Google Calendar</strong>, or <strong className="text-foreground">Google Drive</strong> and click <strong className="text-foreground">Connect</strong>.</li>
                    <li>Sign in to your Google account and review the requested permissions.</li>
                    <li>Click <strong className="text-foreground">Allow</strong> — you'll be redirected back to TimeWarp.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="g-usage">
                <AccordionTrigger className="text-sm font-medium">How to Use</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Once connected, TimeWarp automatically uses your Google data to power AI insights.</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Email, meeting, and document insights appear on your <strong className="text-foreground">Dashboard briefing</strong>.</li>
                    <li>Your AI assistant can reference Gmail threads, calendar events, and Drive files when answering questions.</li>
                    <li>Manage what gets processed in <strong className="text-foreground">Connectors → Google</strong>.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="g-remove">
                <AccordionTrigger className="text-sm font-medium">How to Remove / Uninstall</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-1">From Google:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Visit <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">myaccount.google.com/permissions</a>.</li>
                      <li>Find <strong className="text-foreground">TimeWarp</strong> in the list of third-party apps.</li>
                      <li>Click <strong className="text-foreground">Remove access</strong>.</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">From TimeWarp:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open <strong className="text-foreground">Connectors</strong> in the app.</li>
                      <li>Find the Google service and click <strong className="text-foreground">Disconnect</strong>.</li>
                    </ol>
                  </div>
                  <p>When you disconnect from either side, all tokens and synced Google data are removed from TimeWarp's systems.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="g-permissions">
                <AccordionTrigger className="text-sm font-medium">Permissions & Data</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>TimeWarp requests read-only Google permissions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-foreground">Gmail (read)</strong> — to surface relevant email context for AI insights.</li>
                    <li><strong className="text-foreground">Calendar (read)</strong> — to access events and schedules for briefings.</li>
                    <li><strong className="text-foreground">Drive (read)</strong> — to reference documents you explicitly select.</li>
                  </ul>
                  <p>
                    TimeWarp does <strong className="text-foreground">not</strong> send emails, modify calendar events, or alter Drive files on your behalf without explicit action.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* ── Microsoft Integration Guide ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Microsoft Integration (Outlook, OneDrive, OneNote, Teams)</h2>

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="m-overview">
                <AccordionTrigger className="text-sm font-medium">Overview</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    The Microsoft integration connects Outlook, OneDrive, OneNote, and Teams to TimeWarp so your AI assistant can process emails, files, notes, and meeting context as part of your daily intelligence briefings.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="m-prereq">
                <AccordionTrigger className="text-sm font-medium">Prerequisites</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>A Microsoft account (personal or Microsoft 365).</li>
                    <li>A TimeWarp account with an active subscription.</li>
                    <li>At least one business created in Business DNA.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="m-install">
                <AccordionTrigger className="text-sm font-medium">How to Install</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Open the <strong className="text-foreground">Connectors</strong> page inside TimeWarp.</li>
                    <li>Find the Microsoft service you want (Outlook, OneDrive, OneNote, or Teams) and click <strong className="text-foreground">Connect</strong>.</li>
                    <li>Sign in to your Microsoft account and review the requested permissions.</li>
                    <li>Click <strong className="text-foreground">Accept</strong> — you'll be redirected back to TimeWarp.</li>
                  </ol>
                  <p className="mt-2">Each Microsoft service connects independently, so you can pick exactly what to share.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="m-usage">
                <AccordionTrigger className="text-sm font-medium">How to Use</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Once connected, TimeWarp automatically uses your Microsoft data to power AI insights.</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Inbox, file, note, and meeting insights appear on your <strong className="text-foreground">Dashboard briefing</strong>.</li>
                    <li>Your AI assistant can reference Outlook threads, OneDrive files, OneNote pages, and Teams meetings.</li>
                    <li>Manage what gets processed in <strong className="text-foreground">Connectors → Microsoft</strong>.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="m-remove">
                <AccordionTrigger className="text-sm font-medium">How to Remove / Uninstall</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-1">From Microsoft:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Visit <a href="https://myaccount.microsoft.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">myaccount.microsoft.com</a>.</li>
                      <li>Go to <strong className="text-foreground">Privacy → Apps and services</strong>.</li>
                      <li>Find <strong className="text-foreground">TimeWarp</strong> and click <strong className="text-foreground">Revoke access</strong>.</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">From TimeWarp:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open <strong className="text-foreground">Connectors</strong> in the app.</li>
                      <li>Find the Microsoft service and click <strong className="text-foreground">Disconnect</strong>.</li>
                    </ol>
                  </div>
                  <p>When you disconnect from either side, all tokens and synced Microsoft data are removed from TimeWarp's systems.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="m-permissions">
                <AccordionTrigger className="text-sm font-medium">Permissions & Data</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>TimeWarp requests scoped Microsoft Graph permissions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-foreground">Mail.Read</strong> — to surface relevant Outlook email context.</li>
                    <li><strong className="text-foreground">Calendars.Read</strong> — to access events and schedules.</li>
                    <li><strong className="text-foreground">Files.Read</strong> — to reference OneDrive files you select.</li>
                    <li><strong className="text-foreground">Notes.Read</strong> — to reference OneNote pages.</li>
                    <li><strong className="text-foreground">Team.ReadBasic.All / Channel.ReadBasic.All</strong> — to surface Teams meeting context.</li>
                  </ul>
                  <p>
                    TimeWarp does <strong className="text-foreground">not</strong> send mail, modify files, or post to Teams on your behalf without explicit action.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* ── HubSpot Integration Guide ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">HubSpot Integration</h2>

            <Accordion type="multiple" className="w-full">
              <AccordionItem value="h-overview">
                <AccordionTrigger className="text-sm font-medium">Overview</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>
                    The HubSpot integration connects your CRM to TimeWarp so your AI assistant can reference contacts, companies, deals, and pipeline activity when generating insights, briefings, and recommended next actions.
                  </p>
                  <p>
                    Built for founders and revenue teams who want their CRM data feeding directly into their private AI workspace.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="h-prereq">
                <AccordionTrigger className="text-sm font-medium">Prerequisites</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ul className="list-disc list-inside space-y-1">
                    <li>A HubSpot account (Free, Starter, Professional, or Enterprise).</li>
                    <li>A TimeWarp account with an active subscription.</li>
                    <li>At least one business created in Business DNA.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="h-install">
                <AccordionTrigger className="text-sm font-medium">How to Install</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-1.5">
                    <li>Open the <strong className="text-foreground">Connectors</strong> page inside TimeWarp.</li>
                    <li>Find <strong className="text-foreground">HubSpot</strong> and click <strong className="text-foreground">Connect</strong>.</li>
                    <li>Sign in to your HubSpot account and choose the portal you want to connect.</li>
                    <li>Review the requested scopes and click <strong className="text-foreground">Connect app</strong>.</li>
                    <li>You'll be redirected back to TimeWarp with the integration active.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="h-usage">
                <AccordionTrigger className="text-sm font-medium">How to Use</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>Once connected, TimeWarp uses live HubSpot data to power AI insights.</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Pipeline, deal, and contact insights appear on your <strong className="text-foreground">Dashboard briefing</strong>.</li>
                    <li>Your AI assistant can reference CRM context when answering questions or drafting outreach.</li>
                    <li>Manage the connection in <strong className="text-foreground">Connectors → HubSpot</strong>.</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="h-remove">
                <AccordionTrigger className="text-sm font-medium">How to Remove / Uninstall</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-3">
                  <div>
                    <p className="font-medium text-foreground mb-1">From HubSpot:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Sign in to <a href="https://app.hubspot.com" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">app.hubspot.com</a>.</li>
                      <li>Go to <strong className="text-foreground">Settings → Integrations → Connected Apps</strong>.</li>
                      <li>Find <strong className="text-foreground">TimeWarp</strong> and click <strong className="text-foreground">Uninstall</strong>.</li>
                    </ol>
                  </div>
                  <div>
                    <p className="font-medium text-foreground mb-1">From TimeWarp:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Open <strong className="text-foreground">Connectors</strong> in the app.</li>
                      <li>Find HubSpot and click <strong className="text-foreground">Disconnect</strong>.</li>
                    </ol>
                  </div>
                  <p>When you disconnect or uninstall from either side, all tokens and synced CRM data are removed from TimeWarp's systems.</p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="h-permissions">
                <AccordionTrigger className="text-sm font-medium">Permissions & Data</AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-2">
                  <p>TimeWarp requests scoped HubSpot permissions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong className="text-foreground">crm.objects.contacts.read</strong> — to reference contacts.</li>
                    <li><strong className="text-foreground">crm.objects.companies.read</strong> — to reference companies.</li>
                    <li><strong className="text-foreground">crm.objects.deals.read</strong> — to reference deals and pipeline activity.</li>
                  </ul>
                  <p>
                    TimeWarp does <strong className="text-foreground">not</strong> create, modify, or delete CRM records on your behalf without explicit action.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {/* ── Deleting Integration Data ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Deleting Integration Data</h2>
            <p className="text-muted-foreground mb-2">
              You can disconnect any third-party service at any time through the <strong className="text-foreground">Connectors</strong> page inside the app. When you disconnect a service (e.g. Microsoft Outlook, OneDrive, OneNote, HubSpot, or Zoom), all associated tokens and synced data are removed from our systems.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-1">
              <li>Open the app and navigate to <strong className="text-foreground">Connectors</strong>.</li>
              <li>Find the integration you want to remove.</li>
              <li>Click the <strong className="text-foreground">Disconnect</strong> button.</li>
            </ol>
          </section>

          {/* ── Deleting Business DNA Data ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Deleting Business DNA Data</h2>
            <p className="text-muted-foreground mb-2">
              All business data you've added — brands, audiences, products, and uploaded files — can be deleted directly from the <strong className="text-foreground">Business DNA</strong> section.
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground ml-1">
              <li>Open <strong className="text-foreground">Business DNA</strong> in the app.</li>
              <li>Navigate to the <strong className="text-foreground">Database</strong> tab to view all stored data.</li>
              <li>Select the items you want to remove and delete them.</li>
              <li>You can also delete entire brands, audiences, or products from their respective sections.</li>
            </ol>
          </section>

          {/* ── Full Account Deletion ── */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Full Account Deletion</h2>
            <p className="text-muted-foreground">
              If you'd like to delete your entire account and all associated data, please contact us at{" "}
              <a href="mailto:support@timewarpdev.com" className="text-primary underline hover:text-primary/80 transition-colors">
                support@timewarpdev.com
              </a>
              . We will process your request and permanently remove all your data within 30 days.
            </p>
          </section>
        </div>
      </div>
      <WorkspaceFooter compact />
    </div>
  );
}