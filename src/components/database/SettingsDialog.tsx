import { useState } from "react";
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
import { User, Mail, Lock, Unplug, Loader2, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";

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
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleUpdateName = async () => {
    if (!displayName.trim()) return;
    
    setIsUpdatingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName }
      });
      
      if (error) throw error;
      
      toast({
        title: "Name updated",
        description: "Your display name has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error updating name",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your new passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({
        title: "Error updating password",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true);
    try {
      // Update connection status in database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('google_workspace_connections')
          .update({ connected: false })
          .eq('user_id', user.id);
      }
      
      toast({
        title: "Google Workspace disconnected",
        description: "Your Google Workspace connection has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Error disconnecting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
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
            {/* Account Section */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <User className="h-4 w-4" />
                Account
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="displayName"
                      placeholder="Enter your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleUpdateName}
                      disabled={isUpdatingName || !displayName.trim()}
                      size="sm"
                    >
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
                  <Input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <Input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button 
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                    variant="outline"
                    className="w-full"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Updating...
                      </>
                    ) : (
                      "Update Password"
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <Separator />

            {/* Appearance Section */}
            <div>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Appearance
              </h3>
              
              <div className="flex gap-2">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("light")}
                  className="flex-1 gap-2"
                >
                  <Sun className="h-4 w-4" />
                  Light
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("dark")}
                  className="flex-1 gap-2"
                >
                  <Moon className="h-4 w-4" />
                  Dark
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme("system")}
                  className="flex-1 gap-2"
                >
                  <Monitor className="h-4 w-4" />
                  System
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
            
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Google Workspace</p>
                      <p className="text-xs text-muted-foreground">Gmail, Drive, Calendar, Sheets</p>
                    </div>
                  </div>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDisconnectGoogle}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Disconnect"
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/10">
                <p className="text-sm text-muted-foreground text-center">More integrations coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
