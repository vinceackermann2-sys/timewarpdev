import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Send, Loader2, Bug, Lightbulb, HelpCircle } from "lucide-react";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FeedbackType = "bug" | "feature" | "question";

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("feature");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    { id: "bug" as FeedbackType, label: "Bug Report", icon: Bug, color: "text-status-error" },
    { id: "feature" as FeedbackType, label: "Feature Request", icon: Lightbulb, color: "text-status-warning" },
    { id: "question" as FeedbackType, label: "Question", icon: HelpCircle, color: "text-status-info" },
  ];

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter your feedback message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Simulate sending feedback (in production, this would call an API)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Feedback sent!",
      description: "Thank you for your feedback. We'll review it shortly.",
    });
    
    setMessage("");
    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve TimeWarp by sharing your thoughts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Feedback Type Selection */}
          <div className="space-y-2">
            <Label>What type of feedback?</Label>
            <div className="grid grid-cols-3 gap-2">
              {feedbackTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFeedbackType(type.id)}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    feedbackType === type.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <type.icon className={`h-5 w-5 mx-auto mb-1 ${type.color}`} />
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Your Message</Label>
            <Textarea
              id="feedback-message"
              placeholder={
                feedbackType === "bug"
                  ? "Describe the issue you encountered..."
                  : feedbackType === "feature"
                  ? "What feature would you like to see?"
                  : "What would you like to know?"
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !message.trim()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Feedback
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
