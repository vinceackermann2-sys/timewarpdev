import { useState, useEffect } from "react";
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
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  FileText,
  RefreshCw, 
  Bot,
  LogOut,
  Dna,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
  Settings,
  MessageSquare,
  Users,
  ChevronsUpDown,
  User,
  Inbox,
  Bell,
  Sun,
  Moon,
  Monitor,
  Palette,
  CreditCard,
  Check
} from "lucide-react";
import { useTheme } from "next-themes";
import { WhatsNewDropdown } from "./WhatsNewDropdown";
import { SettingsDialog } from "./SettingsDialog";
import { FeedbackDialog } from "./FeedbackDialog";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { ActionsCard } from "./ActionsCard";
import { SiriOrb } from "@/components/ui/siri-orb";

type View = "dataconversion" | "aiceo" | "businessdna" | "employees";

interface DatabaseSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userEmail: string;
}

export function DatabaseSidebar({ currentView, onViewChange, userEmail }: DatabaseSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { state, toggleSidebar, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { theme, setTheme } = useTheme();

  // Auto-collapse sidebar when in dataconversion view
  useEffect(() => {
    if (currentView === "dataconversion") {
      setOpen(false);
    }
  }, [currentView, setOpen]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

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
        <SidebarHeader className="border-b border-sidebar-border p-2">
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            {!isCollapsed && (
              <Link to="/app" className="flex items-center gap-2">
                <img 
                  src="/favicon.png" 
                  alt="TimeWarp" 
                  className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                />
                <span className="font-semibold text-lg">TimeWarp</span>
              </Link>
            )}
            <button
              onClick={toggleSidebar}
              className={`p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0 ${isCollapsed ? 'w-full flex justify-center' : ''}`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
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
                    isActive={currentView === "dataconversion"}
                    onClick={() => onViewChange("dataconversion")}
                    tooltip="Data Conversion"
                    className={currentView === "dataconversion" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                  >
                    <RefreshCw className="h-4 w-4" />
                    {!isCollapsed && <span>Data Conversion</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={currentView === "businessdna"}
                    onClick={() => onViewChange("businessdna")}
                    tooltip="Business DNA"
                    className={currentView === "businessdna" ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                  >
                    <Dna className="h-4 w-4" />
                    {!isCollapsed && <span>Business DNA</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    tooltip="Employees - Coming Soon"
                    className="opacity-50 cursor-not-allowed"
                    disabled
                  >
                    <Bot className="h-4 w-4" />
                    {!isCollapsed && (
                      <span className="flex items-center gap-2">
                        Employees
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full leading-none">Soon</span>
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
          {/* Actions Card */}
          <ActionsCard isCollapsed={isCollapsed} />

          {/* What's New Section */}
          <WhatsNewDropdown isCollapsed={isCollapsed} />


          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={`w-full rounded-md transition-colors hover:bg-transparent ${isCollapsed ? 'p-2 flex justify-center' : 'p-2 flex items-center gap-2'}`}>
                <div className="h-8 w-8 rounded-[14px] bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{userEmail}</p>
                      
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
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
                onClick={() => {
                  setSettingsOpen(true);
                  // Open to Plans & Billing tab
                  setTimeout(() => {
                    const event = new CustomEvent('settings-tab', { detail: 'billing' });
                    window.dispatchEvent(event);
                  }, 100);
                }}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Plans & Billing
              </DropdownMenuItem>
              
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Palette className="h-4 w-4 mr-2" />
                  Appearance
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")} className="cursor-pointer">
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                    {theme === "light" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")} className="cursor-pointer">
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                    {theme === "dark" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")} className="cursor-pointer">
                    <Monitor className="h-4 w-4 mr-2" />
                    System theme
                    {theme === "system" && <Check className="h-4 w-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              
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
      <WorkspaceDialog
        open={workspaceOpen}
        onOpenChange={setWorkspaceOpen}
        userEmail={userEmail}
      />
    </>
  );
}
