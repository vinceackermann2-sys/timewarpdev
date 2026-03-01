import { useState } from "react";
import { Plus, Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MyBusinessesViewProps {
  onSelectBusiness: () => void;
}

const TABS = ["My Businesses", "Shared with me"] as const;

export function MyBusinessesView({ onSelectBusiness }: MyBusinessesViewProps) {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]>("My Businesses");
  const [search, setSearch] = useState("");

  return (
    <div className="flex flex-col h-full items-center">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-border/50 space-y-5 w-full max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-lg bg-muted/50 border border-border/40 p-1">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative text-sm font-medium px-4 py-1.5 rounded-md transition-colors",
                  activeTab === tab
                    ? "bg-background text-foreground shadow-sm border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search businesses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/30 border-border/40"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 w-full max-w-3xl">
        {activeTab === "My Businesses" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Add Business Card */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSelectBusiness}
              className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/50 hover:border-primary/40 bg-card/30 hover:bg-card/60 p-8 min-h-[200px] transition-colors cursor-pointer"
            >
              <div className="h-14 w-14 rounded-xl bg-muted/60 group-hover:bg-primary/10 border border-border/40 group-hover:border-primary/30 flex items-center justify-center transition-colors">
                <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Add Business
              </span>
            </motion.button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No shared businesses yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Businesses shared with you will appear here
            </p>
          </div>
        )}
      </div>

      {/* Floating Footer */}
      <div className="w-full max-w-5xl mx-auto mb-6 mt-auto px-6">
        <div className="rounded-2xl border border-border/50 bg-muted/30 backdrop-blur-sm px-12 py-14">
          <div className="flex items-center gap-2 mb-8">
            <img src="/favicon.png" alt="TimeWarp" className="h-8 w-8 rounded-md" />
            <span className="font-semibold text-lg text-foreground">TimeWarp</span>
          </div>
          <div className="flex flex-wrap gap-14">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Product</h4>
              <ul className="space-y-1.5">
                <li><a href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Resources</h4>
              <ul className="space-y-1.5">
                <li><a href="mailto:support@nxtrinity.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              <ul className="space-y-1.5">
                <li><a href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Community</h4>
              <ul className="space-y-1.5">
                <li><a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Discord</a></li>
              </ul>
            </div>
          </div>
          <div className="flex items-center justify-between mt-10 pt-5 border-t border-border/30">
            <p className="text-xs text-muted-foreground">© 2026 Nxtrinity AB, All rights reserved</p>
            <p className="text-xs text-muted-foreground">🇸🇪 Made in Sweden</p>
          </div>
        </div>
      </div>
    </div>
  );
}
