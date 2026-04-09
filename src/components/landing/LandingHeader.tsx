import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function LandingHeader() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <header className="orb-hero__header">
      <div className="orb-hero__header-inner">
        <Link to="/" className="orb-hero__brand" aria-label="TimeWarp home">
          <img src="/favicon.png" alt="TimeWarp" className="orb-hero__logo" />
        </Link>

        <div className="orb-hero__nav-actions">
          <button
            type="button"
            aria-label="Toggle appearance"
            className="orb-hero__icon-btn"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <Link to="/auth" className="orb-hero__pill-link">
            Log in
          </Link>

          <Link to="/auth?mode=signup" className="orb-hero__cta-link">
            Get Started →
          </Link>
        </div>
      </div>
    </header>
  );
}
