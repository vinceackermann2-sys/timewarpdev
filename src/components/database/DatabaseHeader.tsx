import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

export function DatabaseHeader() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      {isCollapsed && (
        <>
          <Separator orientation="vertical" className="h-4" />
          <Link to="/database" className="flex items-center gap-2">
            <img 
              src="/favicon.png" 
              alt="TimeWarp" 
              className="h-6 w-6 rounded-md object-cover"
            />
            <span className="font-semibold text-sm">TimeWarp</span>
          </Link>
        </>
      )}
      <div className="flex-1" />
    </header>
  );
}
