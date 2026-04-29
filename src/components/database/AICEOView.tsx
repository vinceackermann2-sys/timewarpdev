import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { TimeWarpLogo } from "@/components/brand/TimeWarpLogo";

export function AICEOView() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="text-center py-16">
          <div className="flex justify-center mb-4">
            <TimeWarpLogo iconOnly size={64} />
          </div>
          <CardTitle className="mb-2 flex items-center justify-center gap-2">
            TimeWarp AI
            <Sparkles className="h-4 w-4 text-primary" />
          </CardTitle>
          <CardDescription className="max-w-sm mx-auto mb-6">
            Your AI-powered executive assistant. Analyze your business data, get strategic recommendations, and automate decision-making.
          </CardDescription>
          
          <Button 
            onClick={() => navigate("/app")}
            className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            Start Analysis
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
