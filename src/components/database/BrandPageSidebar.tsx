import { cn } from "@/lib/utils";

interface SidebarSection {
  id: string;
  label: string;
  highlight?: boolean;
  children?: { id: string; label: string; highlight?: boolean }[];
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
    id: "extended-brand",
    label: "Visual Identity",
    children: [
      { id: "moodboard", label: "Moodboard" },
      { id: "illustrations", label: "Illustrations" },
      { id: "image-guidelines", label: "Image Guidelines" },
      { id: "website", label: "Website & Digital" },
      { id: "buttons", label: "Buttons & UI" },
      { id: "social-media", label: "Social Media" },
    ],
  },
  {
    id: "value-exchange",
    label: "Value Exchange Loop",
    highlight: true,
    children: [
      { id: "problem", label: "The Problem", highlight: true },
      { id: "solution", label: "The Solution", highlight: true },
      { id: "customer", label: "The Customer", highlight: true },
      { id: "economics", label: "The Economics", highlight: true },
      { id: "formula", label: "Atomic Formula", highlight: true },
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
    <nav className="sticky top-6 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
      <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      <div className="relative">
        {/* Continuous vertical line */}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-border/40 rounded-full" />
        <div className="space-y-0.5">
          {BRAND_SECTIONS.map((section) => (
            <div key={section.id}>
              {/* Parent item */}
              <button
                onClick={() => onSectionClick?.(section.id)}
                className={cn(
                  "flex items-center w-full text-left py-1.5 text-sm transition-colors relative pl-3",
                  activeSection === section.id
                    ? "text-primary font-medium"
                    : section.highlight
                      ? "text-primary/80 hover:text-primary"
                      : "text-foreground/80 hover:text-foreground"
                )}
              >
                {/* Line bump indicator */}
                <div
                  className={cn(
                    "absolute left-[-3px] top-1/2 -translate-y-1/2 w-[8px] h-[2px] rounded-r-full transition-colors z-10",
                    activeSection === section.id
                      ? "bg-primary"
                      : "bg-border"
                  )}
                />
                {section.label}
              </button>

              {/* Children */}
              {section.children && (
                <div className="pl-5 space-y-0.5">
                  {section.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onSectionClick?.(child.id)}
                      className={cn(
                        "block w-full text-left py-1.5 text-sm transition-colors",
                        activeSection === child.id
                          ? "text-primary font-medium"
                          : child.highlight
                            ? "text-primary/80 hover:text-primary"
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
      </div>
    </nav>
  );
}
