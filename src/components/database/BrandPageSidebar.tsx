import { cn } from "@/lib/utils";

interface SidebarSection {
  id: string;
  label: string;
  children?: { id: string; label: string }[];
}

const BRAND_SECTIONS: SidebarSection[] = [
  {
    id: "branding",
    label: "Branding",
    children: [
      { id: "logo", label: "Primary logo" },
      { id: "colors", label: "Brand colors" },
      { id: "typography", label: "Typography" },
    ],
  },
  {
    id: "value-exchange",
    label: "Value Exchange Loop",
    children: [
      { id: "attract", label: "Attract" },
      { id: "engage", label: "Engage" },
      { id: "convert", label: "Convert" },
      { id: "deliver", label: "Deliver" },
      { id: "retain", label: "Retain" },
    ],
  },
];

export function BrandPageSidebar({
  activeSection,
  onSectionClick,
}: {
  activeSection?: string;
  onSectionClick?: (id: string) => void;
}) {
  return (
    <nav className="sticky top-6 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      <div className="space-y-1">
        {BRAND_SECTIONS.map((section) => (
          <div key={section.id}>
            {/* Parent item */}
            <button
              onClick={() => onSectionClick?.(section.id)}
              className={cn(
                "flex items-center gap-2 w-full text-left py-1.5 text-sm transition-colors",
                activeSection === section.id
                  ? "text-primary font-medium"
                  : "text-foreground/80 hover:text-foreground"
              )}
            >
              <div className={cn(
                "w-0.5 h-5 rounded-full transition-colors shrink-0",
                activeSection === section.id ? "bg-primary" : "bg-transparent"
              )} />
              {section.label}
            </button>

            {/* Children */}
            {section.children && (
              <div className="ml-3 border-l border-border/40 pl-3 space-y-0.5">
                {section.children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onSectionClick?.(child.id)}
                    className={cn(
                      "block w-full text-left py-1.5 text-sm transition-colors",
                      activeSection === child.id
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {child.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
