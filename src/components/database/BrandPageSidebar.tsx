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
    <nav className="sticky top-6 space-y-3 max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-thin">
      <h3 className="text-sm font-semibold text-foreground">On This Page</h3>
      <div className="relative">
        {/* Continuous vertical line */}
        <div className="absolute left-[3px] top-2 bottom-2 w-px bg-border/60" />
        <div className="space-y-0.5">
          {BRAND_SECTIONS.map((section) => (
            <div key={section.id}>
              {/* Parent item */}
              <button
                onClick={() => onSectionClick?.(section.id)}
                className={cn(
                  "flex items-center gap-3 w-full text-left py-1.5 text-sm transition-colors relative",
                  activeSection === section.id
                    ? "text-primary font-medium"
                    : "text-foreground/80 hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-[7px] h-[7px] rounded-full shrink-0 transition-colors z-10",
                    activeSection === section.id
                      ? "bg-primary"
                      : "bg-border"
                  )}
                />
                {section.label}
              </button>

              {/* Children */}
              {section.children && (
                <div className="pl-6 space-y-0.5">
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
      </div>
    </nav>
  );
}
