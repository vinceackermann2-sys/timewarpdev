import { useState } from "react";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader, 
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  RefreshCw, 
  Bot,
  LogOut,
  Lock,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Settings,
  MessageSquare,
  ChevronUp,
  User,
  Inbox,
  Bell
} from "lucide-react";
import { WhatsNewDropdown } from "./WhatsNewDropdown";
import { SettingsDialog } from "./SettingsDialog";
import { FeedbackDialog } from "./FeedbackDialog";

type View = "database" | "dataconversion" | "aiceo";

interface DatabaseSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userEmail: string;
}

export function DatabaseSidebar({ currentView, onViewChange, userEmail }: DatabaseSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/");
    }
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border p-4">
          <div className="flex items-center justify-between">
            <Link to="/database" className="flex items-center gap-2">
              <img 
                src="/favicon.png" 
                alt="TimeWarp" 
                className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
              />
              {!isCollapsed && <span className="font-semibold text-lg">TimeWarp</span>}
            </Link>
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors flex-shrink-0"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={currentView === "database"}
                    onClick={() => onViewChange("database")}
                    tooltip="Database"
                  >
                    <Database className="h-4 w-4" />
                    {!isCollapsed && <span>Database</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={currentView === "dataconversion"}
                    onClick={() => onViewChange("dataconversion")}
                    className="opacity-60"
                    tooltip="Dataconversion (Coming Soon)"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {!isCollapsed && (
                      <>
                        <span>Dataconversion</span>
                        <Lock className="h-3 w-3 ml-auto text-muted-foreground" />
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={currentView === "aiceo"}
                    onClick={() => onViewChange("aiceo")}
                    tooltip="TimeWarp AI"
                  >
                    <Bot className="h-4 w-4" />
                    {!isCollapsed && <span>TimeWarp AI</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2">
          {/* What's New Section */}
          <WhatsNewDropdown isCollapsed={isCollapsed} />

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full rounded-md hover:bg-sidebar-accent transition-colors ${isCollapsed ? 'p-2 flex justify-center' : 'p-2 flex items-center gap-2'}`}>
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{userEmail}</p>
                      <p className="text-xs text-sidebar-foreground/60">Free Trial</p>
                    </div>
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              side="top" 
              align="start"
              className="w-56 bg-popover border-border z-50"
            >
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userEmail}</p>
                  <p className="text-xs text-muted-foreground">Free Trial · 14 days left</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Developer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SettingsDialog 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen}
        userEmail={userEmail}
      />
      <FeedbackDialog 
        open={feedbackOpen} 
        onOpenChange={setFeedbackOpen}
      />
    </>
  );
}
