import { RefreshCw, Lock, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function DataConversionView() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleNotify = () => {
    if (email) {
      toast({
        title: "You're on the list!",
        description: "We'll notify you when Dataconversion launches.",
      });
      setEmail("");
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-dashed">
        <CardContent className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 relative">
            <RefreshCw className="h-8 w-8 text-muted-foreground" />
            <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
              <Lock className="h-3 w-3 text-primary" />
            </div>
          </div>
          <CardTitle className="mb-2">Coming Soon</CardTitle>
          <CardDescription className="max-w-sm mx-auto mb-6">
            Dataconversion will help you transform and migrate your data between different formats and systems automatically.
          </CardDescription>
          
          <div className="flex gap-2 max-w-xs mx-auto">
            <Input 
              placeholder="Enter your email" 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-card border-border"
            />
            <Button onClick={handleNotify} variant="outline">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Get notified when this feature launches
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
