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
} from "@/components/ui/sidebar";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  RefreshCw, 
  Bot,
  LogOut,
  Lock
} from "lucide-react";

type View = "database" | "dataconversion" | "aiceo";

interface DatabaseSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userEmail: string;
}

export function DatabaseSidebar({ currentView, onViewChange, userEmail }: DatabaseSidebarProps) {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/database" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">AI CEO</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={currentView === "database"}
                  onClick={() => onViewChange("database")}
                >
                  <Database className="h-4 w-4" />
                  <span>Database</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={currentView === "dataconversion"}
                  onClick={() => onViewChange("dataconversion")}
                  className="opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Dataconversion</span>
                  <Lock className="h-3 w-3 ml-auto text-muted-foreground" />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  isActive={currentView === "aiceo"}
                  onClick={() => onViewChange("aiceo")}
                >
                  <Bot className="h-4 w-4" />
                  <span>AI CEO</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userEmail}</p>
            <p className="text-xs text-sidebar-foreground/60">Free Trial</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-md hover:bg-sidebar-accent transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
