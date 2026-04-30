import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bot,
  LogOut,
  Dna,
  PanelLeft,
  Settings,
  MessageSquare,
  ChevronsUpDown,
  Check,
  Search,
  Plus,
  Cable,
  LayoutDashboard,
  Users,
  Zap,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";
import { WhatsNewDropdown } from "@/components/database/WhatsNewDropdown";
import { FeedbackDialog } from "@/components/database/FeedbackDialog";
import { ActionsCard } from "@/components/database/ActionsCard";
import { cn } from "@/lib/utils";

/**
 * AppSidebar — replaces the old state-driven DatabaseSidebar with NavLink-based
 * routing.  Each menu item is a real <NavLink> so deep links / browser back /
 * bookmarks all work.  Plans & Billing, referrals, ActionsCard, WhatsNew, and
 * the workspace switcher are preserved.
 */
type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const WORKSPACE_NAV: NavItem[] = [
  { to: "/app/assistant", label: "Assistant", icon: Bot },
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const MANAGE_NAV: NavItem[] = [
  { to: "/app/dna", label: "Business DNA", icon: Dna },
  { to: "/app/employees", label: "Employees", icon: Users },
  { to: "/app/agents", label: "Agents", icon: Zap },
  { to: "/app/connections", label: "Connectors", icon: Cable },
];

interface AppSidebarProps {
  userEmail: string;
}

export function AppSidebar({ userEmail }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  const {
    workspaces, activeWorkspaceId, activeWorkspace, selectWorkspace,
  } = useWorkspace();
  const [wsPopoverOpen, setWsPopoverOpen] = useState(false);
  const [wsSearch, setWsSearch] = useState("");

  const [feedbackOpen, setFeedbackOpen] = useState(false);
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

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    // /app/dna should match /app/dna and /app/dna/:brandId
    const isActive =
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`);
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.label}
          className={isActive ? "bg-primary/10 text-primary" : ""}
        >
          <NavLink to={item.to} end={item.exact}>
            <Icon className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <>
      <Sidebar collapsible="icon" className="border-none rounded-r-xl">
        <SidebarHeader className="p-2">
          <div className={cn("flex items-center", isCollapsed ? "flex-col gap-2" : "justify-between")}>
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
              className={cn(
                "p-1.5 rounded-md hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0",
                isCollapsed && "w-full flex justify-center",
              )}
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
              <SidebarMenu>{WORKSPACE_NAV.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Manage</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>{MANAGE_NAV.map(renderNavItem)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-2 space-y-2">
          {/* Workspace chooser */}
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
                    onClick={() => { setWsPopoverOpen(false); navigate("/app/workspaces"); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground"
                  >
                    See all workspaces
                  </button>
                  <button
                    onClick={() => { setWsPopoverOpen(false); navigate("/app/workspaces"); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-foreground flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add new workspace
                  </button>
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

          {/* Actions Card (referrals + buy actions — preserved) */}
          <ActionsCard isCollapsed={isCollapsed} />
          <WhatsNewDropdown isCollapsed={isCollapsed} />

          <DropdownMenu open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "w-full rounded-md transition-colors hover:bg-primary/10 hover:text-primary",
                profileMenuOpen && "bg-primary/10 text-primary",
                isCollapsed ? "p-2 flex justify-center" : "p-2 flex items-center gap-2",
              )}>
                <div className="h-8 w-8 rounded-[14px] bg-[#4a86ff] flex items-center justify-center flex-shrink-0">
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
                onClick={() => navigate("/app/settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer py-2.5"
                onClick={() => navigate("/app/settings?tab=plans")}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Plans & Billing
              </DropdownMenuItem>
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

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
