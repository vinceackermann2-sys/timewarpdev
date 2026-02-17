import { Dna } from "lucide-react";

export function BusinessDNAView() {
  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Dna className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Business DNA</h1>
          <p className="text-sm text-muted-foreground">Your structured business intelligence profile</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Dna className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-foreground mb-2">Your Business DNA</h2>
          <p className="text-sm text-muted-foreground">
            This is where your structured business profile will appear, built from all connected data sources and AI analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
