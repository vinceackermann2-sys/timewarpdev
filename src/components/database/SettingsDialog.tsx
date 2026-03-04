import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Mail, Lock, Unplug, Loader2, Sun, Moon, Monitor, Plug, Globe, MailPlus } from "lucide-react";
import { useTheme } from "next-themes";
import logoMicrosoft from "@/assets/logo-microsoft.png";

const integrations = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar, Teams", logo: logoMicrosoft, authType: "oauth" as const },
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function SettingsDialog({ open, onOpenChange, userEmail }: SettingsDialogProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [actionProvider, setActionProvider] = useState<string | null>(null);

  const checkConnections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ action: "check-status" }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConnectedProviders((data.connected || []).map((c: any) => c.provider));
      }
    } catch (err) {
      console.error("Failed to check connections:", err);
    }
  }, []);

  useEffect(() => {
    if (open) checkConnections();
  }, [open, checkConnections]);

  const handleConnect = async (providerId: string) => {
    setActionProvider(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: providerId, action: "get-auth-url" }),
        }
      );

      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({ title: "Error", description: data.error || "Failed to get authorization URL", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to start connection", variant: "destructive" });
    }
    setActionProvider(null);
  };

  const handleDisconnect = async (providerId: string) => {
    setActionProvider(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-provider`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ provider: providerId, action: "disconnect" }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast({ title: "Disconnected", description: `${integrations.find(i => i.id === providerId)?.name} has been disconnected.` });
        checkConnections();
      } else {
        toast({ title: "Error", description: data.error || "Failed to disconnect", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    }
    setActionProvider(null);
  };


  // ... keep existing code (handleUpdateName, handleUpdatePassword)
  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    setIsUpdatingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
      if (error) throw error;
      toast({ title: "Name updated", description: "Your display name has been updated successfully." });
    } catch (error: any) {
      toast({ title: "Error updating name", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Missing fields", description: "Please fill in all password fields.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your new passwords match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your password has been updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ title: "Error updating password", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your account and connections.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4">
          {/* Left Column: Account & Appearance */}
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <div className="flex gap-2">
                    <Input id="displayName" placeholder="Enter your name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="flex-1" />
                    <Button onClick={handleUpdateName} disabled={isUpdatingName || !displayName.trim()} size="sm">
                      {isUpdatingName ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Connected Email</Label>
                  <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{userEmail}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Change Password
                  </Label>
                  <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                  <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !newPassword || !confirmPassword} variant="outline" className="w-full">
                    {isUpdatingPassword ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</>) : "Update Password"}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Appearance
              </h3>
              <div className="flex gap-2">
                <Button variant={theme === "light" ? "default" : "outline"} size="sm" onClick={() => setTheme("light")} className="flex-1 gap-2">
                  <Sun className="h-4 w-4" /> Light
                </Button>
                <Button variant={theme === "dark" ? "default" : "outline"} size="sm" onClick={() => setTheme("dark")} className="flex-1 gap-2">
                  <Moon className="h-4 w-4" /> Dark
                </Button>
                <Button variant={theme === "system" ? "default" : "outline"} size="sm" onClick={() => setTheme("system")} className="flex-1 gap-2">
                  <Monitor className="h-4 w-4" /> System
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Connections */}
          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Unplug className="h-4 w-4" />
              Connections
            </h3>
            
            <div className="space-y-2">
              {integrations.map((integration) => {
                const connected = connectedProviders.includes(integration.id);
                const isActioning = actionProvider === integration.id;

                return (
                  <div key={integration.id} className={`p-3 rounded-lg border transition-colors ${connected ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/20"}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center p-1.5">
                          <img src={integration.logo} alt={integration.name} className="h-6 w-6 object-contain" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{integration.name}</p>
                          <p className="text-xs text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      {connected ? (
                        <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={() => handleDisconnect(integration.id)} disabled={isActioning}>
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3 mr-1" />}
                          Disconnect
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleConnect(integration.id)} disabled={isActioning}>
                          {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3 mr-1" />}
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Request Integration */}
            <a
              href="mailto:support@timewarp.ai?subject=Integration%20Request&body=Hi%2C%20I%20would%20like%20to%20request%20an%20integration%20with%3A%20"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-2"
            >
              <MailPlus className="h-3.5 w-3.5" />
              Request an integration
            </a>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
