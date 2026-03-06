import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Settings, Users, CreditCard, Key, Unplug, Plug, Loader2,
  Sun, Moon, Monitor, Mail, MailPlus, User,
} from "lucide-react";
import { useTheme } from "next-themes";
import logoMicrosoft from "@/assets/logo-microsoft.png";
import { cn } from "@/lib/utils";

const integrations = [
  { id: "microsoft", name: "Microsoft", description: "Outlook, OneDrive, Calendar, Teams", logo: logoMicrosoft, authType: "oauth" as const },
];

type SettingsTab = "settings" | "workspace" | "plans" | "connections";

const sidebarItems = [
  { section: "Account", items: [
    { id: "settings" as SettingsTab, label: "Settings", icon: Settings },
    { id: "workspace" as SettingsTab, label: "Workspace", icon: Users },
    { id: "plans" as SettingsTab, label: "Plans & Billing", icon: CreditCard },
  ]},
  { section: "Connections", items: [
    { id: "connections" as SettingsTab, label: "Integrations", icon: Unplug },
  ]},
];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

export function SettingsDialog({ open, onOpenChange, userEmail }: SettingsDialogProps) {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("settings");
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<string[]>([]);
  const [actionProvider, setActionProvider] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Load display name on open
  useEffect(() => {
    if (open) {
      supabase.auth.getUser().then(({ data }) => {
        setDisplayName(data.user?.user_metadata?.display_name || "");
      });
    }
  }, [open]);

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

  const handleSaveChanges = async () => {
    if (displayName.trim()) {
      setIsUpdatingName(true);
      try {
        const { error } = await supabase.auth.updateUser({ data: { display_name: displayName } });
        if (error) throw error;
        toast({ title: "Settings saved", description: "Your changes have been saved successfully." });
        setHasChanges(false);
      } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
        setIsUpdatingName(false);
      }
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl h-[85vh] p-0 gap-0 bg-background border-border overflow-hidden">
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-60 border-r border-border p-4 flex flex-col gap-1 shrink-0">
            {sidebarItems.map((section) => (
              <div key={section.section} className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-3">{section.section}</p>
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                      activeTab === item.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="px-8 pt-8 pb-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {activeTab === "settings" && "Account Settings"}
                {activeTab === "workspace" && "Workspace"}
                {activeTab === "plans" && "Plans & Billing"}
                {activeTab === "connections" && "Connections"}
              </h2>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-8 py-4">
              {activeTab === "settings" && (
                <div className="space-y-8 max-w-xl">
                  {/* Profile Section */}
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                      <User className="h-4 w-4" />
                      Profile
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                        <Input
                          id="fullName"
                          placeholder="Your full name"
                          value={displayName}
                          onChange={(e) => { setDisplayName(e.target.value); setHasChanges(true); }}
                        />
                        <p className="text-xs text-muted-foreground">Your full name, as visible to others.</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Email</Label>
                        <div className="flex items-center gap-2.5 p-3 rounded-md border border-input bg-muted/30">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{userEmail}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Your email address associated with your account.</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Security Section */}
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                      <Key className="h-4 w-4" />
                      Security
                    </h3>
                    <div className="rounded-xl bg-muted/40 border border-border p-5 space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold flex items-center gap-2 mb-1">
                          <Key className="h-3.5 w-3.5" />
                          Change Password
                        </h4>
                        <p className="text-xs text-muted-foreground mb-4">
                          Update your password to keep your account secure. Make sure to use a strong password.
                        </p>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Current Password</Label>
                          <Input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">New Password</Label>
                          <Input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Confirm New Password</Label>
                          <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                        </div>
                        <Button onClick={handleUpdatePassword} disabled={isUpdatingPassword || !newPassword || !confirmPassword} variant="outline" size="sm" className="w-full">
                          {isUpdatingPassword ? (<><Loader2 className="h-4 w-4 animate-spin mr-2" />Updating...</>) : "Update Password"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Appearance Section */}
                  <div>
                    <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
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
              )}

              {activeTab === "workspace" && (
                <div className="space-y-4 max-w-xl">
                  <p className="text-sm text-muted-foreground">
                    Manage your workspace settings, members, and invitations from the workspace switcher in the sidebar.
                  </p>
                </div>
              )}

              {activeTab === "plans" && (
                <div className="space-y-4 max-w-xl">
                  <p className="text-sm text-muted-foreground">
                    Manage your subscription plan and billing details.
                  </p>
                </div>
              )}

              {activeTab === "connections" && (
                <div className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    {integrations.map((integration) => {
                      const connected = connectedProviders.includes(integration.id);
                      const isActioning = actionProvider === integration.id;
                      return (
                        <div key={integration.id} className={cn(
                          "p-4 rounded-xl border transition-colors",
                          connected ? "border-green-500/40 bg-green-500/5" : "border-border bg-muted/20"
                        )}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center p-2">
                                <img src={integration.logo} alt={integration.name} className="h-6 w-6 object-contain" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{integration.name}</p>
                                <p className="text-xs text-muted-foreground">{integration.description}</p>
                              </div>
                            </div>
                            {connected ? (
                              <Button variant="destructive" size="sm" onClick={() => handleDisconnect(integration.id)} disabled={isActioning}>
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3 mr-1" />}
                                Disconnect
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleConnect(integration.id)} disabled={isActioning}>
                                {isActioning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plug className="h-3 w-3 mr-1" />}
                                Connect
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <a
                    href="mailto:support@timewarp.ai?subject=Integration%20Request&body=Hi%2C%20I%20would%20like%20to%20request%20an%20integration%20with%3A%20"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    <MailPlus className="h-3.5 w-3.5" />
                    Request an integration
                  </a>
                </div>
              )}
            </div>

            {/* Footer with Cancel/Save */}
            <div className="border-t border-border px-8 py-4 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleSaveChanges}
                disabled={isUpdatingName || !hasChanges}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isUpdatingName ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
