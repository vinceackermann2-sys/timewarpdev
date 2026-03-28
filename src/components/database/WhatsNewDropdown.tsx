import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Inbox, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import timewarpBetaImg from "@/assets/timewarp-beta-update.png";

interface WhatsNewDropdownProps {
  isCollapsed: boolean;
}

const inboxItems: Array<{ id: number; title: string; message: string; time: string; unread: boolean; image?: string }> = [];

const updateItems: Array<{ id: number; title: string; message: string; time: string; isNew: boolean; image?: string }> = [
  {
    id: 2,
    title: "Subtle Navigation Update",
    message: "Sidebar nav items now use a soft highlight instead of full-color when selected — cleaner and easier on the eyes.",
    time: "Just now",
    isNew: true,
  },
  {
    id: 1,
    title: "Introducing TimeWarp Beta",
    message: "If you've ever been at work and thought \"I wish someone could do my work for me\" — this one's for you!",
    time: "1d ago",
    isNew: false,
    image: timewarpBetaImg,
  },
];

export function WhatsNewDropdown({ isCollapsed }: WhatsNewDropdownProps) {
  const [activeTab, setActiveTab] = useState("updates");
  const hasUnread = inboxItems.some(i => i.unread) || updateItems.some(i => i.isNew);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button 
          className={`w-full rounded-md transition-colors hover:bg-transparent mb-2 ${
            isCollapsed ? 'p-2 flex justify-center' : 'p-2 flex items-center gap-2'
          }`}
        >
          <div className="relative">
            <Inbox className="h-4 w-4 text-primary" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-primary rounded-full" />
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
                {inboxItems.some(i => i.unread) && (
                  <span className="ml-1 h-2 w-2 bg-primary rounded-full inline-block" />
                )}
              </TabsTrigger>
              <TabsTrigger value="updates" className="text-xs gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Updates
                {updateItems.some(i => i.isNew) && (
                  <span className="ml-1 h-2 w-2 bg-accent rounded-full inline-block" />
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="inbox" className="m-0">
            <ScrollArea className="h-80">
              <div className="p-2 space-y-1">
                {inboxItems.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">No messages yet</p>
                )}
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
                        <p className="text-xs text-muted-foreground line-clamp-3">{item.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="updates" className="m-0">
            <ScrollArea className="h-80">
              <div className="p-2 space-y-1">
                {updateItems.map((item) => (
                  <button
                    key={item.id}
                    className={`w-full text-left p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      item.isNew ? 'bg-accent/5' : ''
                    }`}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    )}
                    <div className="flex items-start gap-2">
                      {item.isNew && (
                        <span className="h-2 w-2 bg-accent rounded-full mt-1.5 flex-shrink-0" />
                      )}
                      <div className={item.isNew ? '' : 'pl-4'}>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-3">{item.message}</p>
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
