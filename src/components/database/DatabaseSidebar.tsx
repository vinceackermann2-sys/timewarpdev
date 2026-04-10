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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot,
  LogOut,
  Dna,
  PanelLeft,
  Settings,
  MessageSquare,
  ChevronsUpDown,
  User,
  Sun,
  Moon,
  Monitor,
  Palette,
  CreditCard,
  Check,
  Search,
  Plus,
  Plug,
} from "lucide-react";
import { useTheme } from "next-themes";
import { WhatsNewDropdown } from "./WhatsNewDropdown";
import { SettingsDialog } from "./SettingsDialog";
import { FeedbackDialog } from "./FeedbackDialog";
import { WorkspaceDialog } from "./WorkspaceDialog";
import { ActionsCard } from "./ActionsCard";
import { useWorkspace } from "@/hooks/useWorkspace";

type View = "aiceo" | "businessdna" | "employees" | "connections" | "workspaces";

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

  const {
    workspaces, activeWorkspaceId, activeWorkspace, selectWorkspace, createWorkspace,
  } = useWorkspace();
  const [wsPopoverOpen, setWsPopoverOpen] = useState(false);
  const [wsSearch, setWsSearch] = useState("");
  const [showNewWsInput, setShowNewWsInput] = useState(false);
  const [newWsName, setNewWsName] = useState("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
                    isActive={currentView === "businessdna"}
                    onClick={() => onViewChange("businessdna")}
                    tooltip="Business DNA"
                    className={currentView === "businessdna" ? "bg-primary/10 text-primary" : ""}
                  >
                    <Dna className="h-4 w-4" />
                    {!isCollapsed && <span>Business DNA</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={currentView === "employees"}
                    onClick={() => onViewChange("employees")}
                    tooltip="Employees"
                    className={currentView === "employees" ? "bg-primary/10 text-primary" : ""}
                  >
                    <Bot className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>Employees</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={currentView === "connections"}
                    onClick={() => onViewChange("connections")}
                    tooltip="Connections"
                    className={currentView === "connections" ? "bg-primary/10 text-primary" : ""}
                  >
                    <Plug className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span>Connections</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-2 space-y-2">
          {/* Workspace Chooser */}
          {!isCollapsed ? (
            <Popover open={wsPopoverOpen} onOpenChange={setWsPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="w-full rounded-md transition-colors hover:bg-muted/50 p-2 flex items-center gap-2">
                  <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-background">
                      {(activeWorkspace?.workspaceName || "W").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold truncate">{activeWorkspace?.workspaceName || "Workspace"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {activeWorkspace && activeWorkspace.memberCount > 1 ? "Team" : "Personal"}
                    </p>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="center" className="w-64 p-0">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    placeholder="Find workspace..."
                    value={wsSearch}
                    onChange={(e) => setWsSearch(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="py-2 max-h-[300px] overflow-y-auto">
                  {workspaces
                    .filter(ws => ws.workspaceName.toLowerCase().includes(wsSearch.toLowerCase()))
                    .map(ws => (
                      <button
                        key={ws.workspaceId}
                        onClick={() => { selectWorkspace(ws.workspaceId); setWsPopoverOpen(false); setWsSearch(""); }}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-background">
                            {ws.workspaceName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">{ws.workspaceName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {ws.memberCount > 1 ? "Team workspace" : "Personal workspace"}
                          </p>
                        </div>
                        {ws.workspaceId === activeWorkspaceId && (
                          <Check className="h-4 w-4 text-foreground shrink-0" />
                        )}
                      </button>
                    ))}
                </div>
                <div className="border-t border-border/50 py-1.5">
                  <button
                    onClick={() => { setWsPopoverOpen(false); onViewChange("workspaces"); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground"
                  >
                    See all workspaces
                  </button>
                  {showNewWsInput ? (
                    <div className="px-3 py-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Workspace name"
                        value={newWsName}
                        onChange={(e) => setNewWsName(e.target.value)}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter" && newWsName.trim()) {
                            const id = await createWorkspace(newWsName.trim());
                            selectWorkspace(id);
                            setNewWsName("");
                            setShowNewWsInput(false);
                            setWsPopoverOpen(false);
                          }
                        }}
                        autoFocus
                        className="flex-1 bg-transparent text-sm outline-none border-b border-border pb-0.5 placeholder:text-muted-foreground"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewWsInput(true)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add new workspace
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <Popover open={wsPopoverOpen} onOpenChange={setWsPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="w-full p-2 flex justify-center" title={activeWorkspace?.workspaceName || "Workspace"}>
                  <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-background">
                      {(activeWorkspace?.workspaceName || "W").charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="w-64 p-0">
                <div className="py-1.5 max-h-[200px] overflow-y-auto">
                  {workspaces.map(ws => (
                    <button
                      key={ws.workspaceId}
                      onClick={() => { selectWorkspace(ws.workspaceId); setWsPopoverOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors"
                    >
                      <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-background">
                          {ws.workspaceName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{ws.workspaceName}</p>
                      {ws.workspaceId === activeWorkspaceId && (
                        <Check className="h-4 w-4 text-foreground shrink-0 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Actions Card */}
          <ActionsCard isCollapsed={isCollapsed} />

          {/* What's New Section */}
          <WhatsNewDropdown isCollapsed={isCollapsed} />

          {/* User Dropdown */}
          <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className={`w-full rounded-md transition-colors hover:bg-primary/10 hover:text-primary ${profileMenuOpen ? 'bg-primary/10 text-primary' : ''} ${isCollapsed ? 'p-2 flex justify-center' : 'p-2 flex items-center gap-2'}`}>
                <div className="h-8 w-8 rounded-[14px] bg-[#3399ff] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-white">
                    {(userEmail || "U").charAt(0).toUpperCase()}
                  </span>
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
              align="center"
              className="w-56 bg-popover border-border z-50"
            >
              <DropdownMenuLabel className="font-normal py-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userEmail}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer py-2.5"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer py-2.5"
                onClick={() => {
                  setSettingsOpen(true);
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
                <DropdownMenuSubTrigger className="cursor-pointer py-2.5">
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
                className="cursor-pointer py-2.5"
                onClick={() => setFeedbackOpen(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Developer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer text-destructive focus:text-destructive py-2.5"
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
