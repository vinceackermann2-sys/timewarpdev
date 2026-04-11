import { Link } from "react-router-dom";
import { WorkspaceFooter } from "@/components/database/WorkspaceFooter";

export default function DataDeletion() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">Data Deletion</h1>
        <p className="text-muted-foreground mb-10">How to remove your data from TimeWarp</p>

        <div className="space-y-8 text-sm sm:text-base text-foreground/90 leading-relaxed">
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
