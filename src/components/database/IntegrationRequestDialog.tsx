import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MailPlus, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IntegrationRequestDialogProps {
  children?: React.ReactNode;
}

export function IntegrationRequestDialog({ children }: IntegrationRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Please enter an integration name");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in first");
        return;
      }

      const { error } = await supabase
        .from("integration_requests")
        .insert({
          user_id: user.id,
          integration_name: name.trim(),
          details: details.trim() || null,
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("Integration request submitted!");
      setTimeout(() => {
        setOpen(false);
        setName("");
        setDetails("");
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to submit request:", err);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSubmitted(false); setName(""); setDetails(""); } }}>
      <DialogTrigger asChild>
        {children || (
          <button className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <MailPlus className="h-3.5 w-3.5" /> Request an integration
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request an Integration</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-sm text-muted-foreground">Thanks! We'll review your request.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="integration-name">Integration name</Label>
              <Input
                id="integration-name"
                placeholder="e.g. Google Analytics, HubSpot..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-details">Details (optional)</Label>
              <Textarea
                id="integration-details"
                placeholder="What would you use this integration for?"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                maxLength={500}
                rows={3}
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !name.trim()}>
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Submitting...</> : "Submit Request"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
