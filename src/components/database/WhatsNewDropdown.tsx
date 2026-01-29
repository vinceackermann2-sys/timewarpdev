import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Inbox, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WhatsNewDropdownProps {
  isCollapsed: boolean;
}

const inboxItems = [
  {
    id: 1,
    title: "Welcome to TimeWarp!",
    message: "Get started by connecting your Google Workspace.",
    time: "Just now",
    unread: true,
  },
  {
    id: 2,
    title: "Analysis Complete",
    message: "Your CEO analysis found 3 optimization opportunities.",
    time: "2 hours ago",
    unread: true,
  },
  {
    id: 3,
    title: "Weekly Report Ready",
    message: "Your weekly productivity report is available.",
    time: "Yesterday",
    unread: false,
  },
];

const updateItems = [
  {
    id: 1,
    title: "New Feature: Data Export",
    message: "You can now export your analyzed data to CSV.",
    time: "Today",
    isNew: true,
  },
  {
    id: 2,
    title: "Improved AI Analysis",
    message: "Our AI engine is now 2x faster and more accurate.",
    time: "3 days ago",
    isNew: false,
  },
];

export function WhatsNewDropdown({ isCollapsed }: WhatsNewDropdownProps) {
  const [activeTab, setActiveTab] = useState("inbox");
  const unreadCount = inboxItems.filter(i => i.unread).length + updateItems.filter(i => i.isNew).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`w-full rounded-md hover:bg-sidebar-accent transition-colors mb-2 ${
            isCollapsed ? 'p-2 flex justify-center' : 'p-2 flex items-center gap-2'
          }`}
        >
          <div className="relative">
            <Sparkles className="h-4 w-4 text-primary" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-primary text-[10px] font-medium rounded-full flex items-center justify-center text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </div>
          {!isCollapsed && <span className="text-sm">What's New</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        side="top" 
        align="start"
        className="w-80 bg-popover border-border z-50 p-0"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border px-3 pt-3">
            <TabsList className="w-full grid grid-cols-2 h-9">
              <TabsTrigger value="inbox" className="text-xs gap-1.5">
                <Inbox className="h-3.5 w-3.5" />
                Inbox
                {inboxItems.filter(i => i.unread).length > 0 && (
                  <span className="ml-1 h-4 w-4 bg-primary/20 text-primary text-[10px] rounded-full flex items-center justify-center">
                    {inboxItems.filter(i => i.unread).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="updates" className="text-xs gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Updates
                {updateItems.filter(i => i.isNew).length > 0 && (
                  <span className="ml-1 h-4 w-4 bg-accent/20 text-accent text-[10px] rounded-full flex items-center justify-center">
                    {updateItems.filter(i => i.isNew).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inbox" className="m-0">
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {inboxItems.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      item.unread ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.unread && (
                        <span className="h-2 w-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className={item.unread ? '' : 'pl-4'}>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="updates" className="m-0">
            <ScrollArea className="h-64">
              <div className="p-2 space-y-1">
                {updateItems.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      item.isNew ? 'bg-accent/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {item.isNew && (
                        <span className="h-2 w-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className={item.isNew ? '' : 'pl-4'}>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
