import { Bot, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

export function AICEOView() {
  const navigate = useNavigate();

  return (
    <div className="h-full flex items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="text-center py-16">
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Bot className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="mb-2 flex items-center justify-center gap-2">
            AI CEO
            <Sparkles className="h-4 w-4 text-primary" />
          </CardTitle>
          <CardDescription className="max-w-sm mx-auto mb-6">
            Your AI-powered executive assistant. Analyze your business data, get strategic recommendations, and automate decision-making.
          </CardDescription>
          
          <Button 
            onClick={() => navigate("/dashboard")}
            className="gradient-primary shadow-glow"
          >
            Open AI CEO
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
