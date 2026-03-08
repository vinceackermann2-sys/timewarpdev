import { Link } from "react-router-dom";
import { Mail, MessageSquare, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Support() {
  return (
    <div className="min-h-[1300px] bg-background text-foreground">
      <div className="max-w-[1900px] mx-auto px-4 py-12">
        <Link to="/app" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>

        <h1 className="text-3xl font-bold mb-2">Support</h1>
        <p className="text-muted-foreground mb-10">Need help? We're here for you.</p>

        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-1">Email Support</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Send us an email and we'll get back to you as soon as possible.
                </p>
                <a href="mailto:support@timewarpdev.com">
                  <Button variant="outline" size="sm">
                    support@timewarpdev.com
                  </Button>
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-lg mb-1">Feedback & Feature Requests</h2>
                <p className="text-sm text-muted-foreground mb-3">
                  Have an idea or found a bug? Let us know through the Developer dialog in the app sidebar.
                </p>
                <Link to="/app">
                  <Button variant="outline" size="sm">
                    Open App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
