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