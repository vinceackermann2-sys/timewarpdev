import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, ArrowRight, Briefcase, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BgGradient } from "@/components/ui/bg-gradient";
import { supabase } from "@/integrations/supabase/client";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const integrations: Integration[] = [
  {
    id: "microsoft",
    name: "Microsoft",
    description: "Outlook, OneDrive, Calendar, Teams",
    icon: "⊞",
    color: "from-[hsl(210,80%,50%)] to-[hsl(210,80%,40%)]",
  },
  {
    id: "google",
    name: "Google",
    description: "Gmail, Drive, Calendar, Sheets",
    icon: "G",
    color: "from-[hsl(4,80%,56%)] to-[hsl(36,100%,50%)]",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Messages, Channels, Files",
    icon: "#",
    color: "from-[hsl(283,44%,47%)] to-[hsl(340,82%,52%)]",
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Posts, Pages, Analytics, Media",
    icon: "W",
    color: "from-[hsl(200,18%,26%)] to-[hsl(200,18%,36%)]",
  },
  {
    id: "fortknox",
    name: "FortKnox",
    description: "Financial data, Invoices, Reports",
    icon: "F",
    color: "from-[hsl(45,93%,47%)] to-[hsl(36,100%,50%)]",
  },
];

interface ConnectBusinessDNAProps {
  onComplete: () => void;
}

export function ConnectBusinessDNA({ onComplete }: ConnectBusinessDNAProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check existing connections on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setIsLoading(false);
          return;
        }

        const { data, error } = await (supabase as any)
          .from('user_connections')
          .select('provider, status')
          .eq('user_id', session.user.id)
          .eq('status', 'connected');

        if (!error && data && data.length > 0) {
          setConnectedProviders(data.map((d: any) => d.provider));
          // Already connected — skip this screen
          onComplete();
          return;
        }
      } catch (err) {
        console.error("Failed to check connections:", err);
      }
      setIsLoading(false);
    };

    checkExisting();
  }, [onComplete]);

  const toggleIntegration = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleConnect = async () => {
    if (selected.length === 0) return;
    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        onComplete();
        return;
      }

      const rows = selected.map((provider) => ({
        user_id: session.user.id,
        provider,
        status: 'connected',
      }));

      const { error } = await (supabase as any)
        .from('user_connections')
        .insert(rows);

      if (error) {
        console.error("Failed to save connections:", error);
      }
    } catch (err) {
      console.error("Error saving connections:", err);
    }

    setIsSaving(false);
    onComplete();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-background">
      <BgGradient
        gradientFrom="hsl(var(--background))"
        gradientTo="hsl(var(--primary) / 0.15)"
        gradientSize="150% 80%"
        gradientPosition="50% 100%"
        gradientStop="70%"
        className="z-0"
      />

      <div className="flex-1 flex items-center justify-center relative z-10 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-5">
              <Briefcase className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-light mb-3">
              Connect your{" "}
              <span className="italic text-primary font-normal">
                Business DNA
              </span>
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Link your tools so we can analyze your business data and provide
              personalized insights.
            </p>
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            {integrations.map((integration, index) => {
              const isSelected = selected.includes(integration.id);
              const isAlreadyConnected = connectedProviders.includes(integration.id);
              return (
                <motion.button
                  key={integration.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07, duration: 0.35 }}
                  onClick={() => !isAlreadyConnected && toggleIntegration(integration.id)}
                  disabled={isAlreadyConnected}
                  className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 text-left ${
                    isAlreadyConnected
                      ? "border-green-500/50 bg-green-500/5 opacity-70"
                      : isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 h-11 w-11 rounded-xl bg-gradient-to-br ${integration.color} flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {integration.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{integration.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {integration.description}
                    </p>
                  </div>

                  {/* Check */}
                  <div
                    className={`flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isAlreadyConnected || isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30"
                    }`}
                  >
                    {(isAlreadyConnected || isSelected) && <Check className="h-3 w-3 text-primary-foreground" />}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="ghost"
              onClick={onComplete}
              className="text-muted-foreground"
              disabled={isSaving}
            >
              Skip for now
            </Button>
            <Button
              onClick={handleConnect}
              disabled={selected.length === 0 || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect {selected.length > 0 ? `(${selected.length})` : ""}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
