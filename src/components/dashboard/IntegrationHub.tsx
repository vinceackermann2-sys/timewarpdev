import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, FileSpreadsheet, FileText, Calendar, BarChart3, Plus, Check, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  status: "connected" | "available" | "coming_soon";
}

const integrations: Integration[] = [
  {
    id: "gmail",
    name: "Gmail",
    description: "Read emails, draft responses, and send on your behalf",
    icon: Mail,
    color: "bg-red-100 text-red-600",
    status: "available",
  },
  {
    id: "google-drive",
    name: "Google Drive",
    description: "Access and analyze your Docs, Sheets, and files",
    icon: FileSpreadsheet,
    color: "bg-green-100 text-green-600",
    status: "available",
  },
  {
    id: "google-docs",
    name: "Google Docs",
    description: "Summarize and extract insights from your documents",
    icon: FileText,
    color: "bg-blue-100 text-blue-600",
    status: "available",
  },
  {
    id: "outlook",
    name: "Outlook",
    description: "Connect your Microsoft email account",
    icon: Mail,
    color: "bg-sky-100 text-sky-600",
    status: "coming_soon",
  },
  {
    id: "calendar",
    name: "Google Calendar",
    description: "Manage your schedule and meetings",
    icon: Calendar,
    color: "bg-yellow-100 text-yellow-600",
    status: "coming_soon",
  },
  {
    id: "analytics",
    name: "Google Analytics",
    description: "Analyze your website traffic and performance",
    icon: BarChart3,
    color: "bg-orange-100 text-orange-600",
    status: "coming_soon",
  },
];

export function IntegrationHub() {
  const { toast } = useToast();
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  const handleConnect = (integration: Integration) => {
    if (integration.status === "coming_soon") {
      toast({
        title: "Coming Soon",
        description: `${integration.name} integration will be available soon!`,
      });
      return;
    }

    // For now, simulate connection
    toast({
      title: "Integration requires setup",
      description: `To connect ${integration.name}, you'll need to set up OAuth. This feature is coming soon!`,
    });
  };

  const getStatusBadge = (status: Integration["status"]) => {
    switch (status) {
      case "connected":
        return <Badge variant="default" className="bg-green-500">Connected</Badge>;
      case "coming_soon":
        return <Badge variant="secondary">Coming Soon</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Integration Hub</h1>
          <p className="text-muted-foreground">
            Connect your tools to give AI CEO access to your business data.
          </p>
        </div>

        {/* Connection status */}
        <Card className="mb-8 border-accent/30 bg-accent/5">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Connect your first integration</p>
              <p className="text-sm text-muted-foreground">
                AI CEO works best when connected to your email and documents.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Integrations grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {integrations.map((integration) => {
            const isConnected = connectedIntegrations.includes(integration.id);
            
            return (
              <Card 
                key={integration.id} 
                className={`border-border/50 hover:border-accent/30 transition-all ${
                  integration.status === "coming_soon" ? "opacity-60" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg ${integration.color} flex items-center justify-center`}>
                        <integration.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        {getStatusBadge(isConnected ? "connected" : integration.status)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">{integration.description}</CardDescription>
                  <Button 
                    variant={isConnected ? "secondary" : "default"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleConnect(integration)}
                    disabled={integration.status === "coming_soon"}
                  >
                    {isConnected ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Connected
                      </>
                    ) : integration.status === "coming_soon" ? (
                      "Coming Soon"
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
