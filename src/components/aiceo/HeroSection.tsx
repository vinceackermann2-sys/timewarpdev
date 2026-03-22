import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Link2, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

interface HeroSectionProps {
  onRunClick?: () => void;
}

export function HeroSection({ onRunClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [url, setUrl] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const placeholderUrls = useRef([
    "nike.com/shoes/air-max",
    "apple.com/iphone-16",
    "tesla.com/model-3",
    "spotify.com/premium",
    "shopify.com/my-store",
  ]);
  const urlIndex = useRef(0);
  const charIndex = useRef(0);
  const isDeleting = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (url) return;

    const scheduleNext = (delay: number, fn: () => void) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, delay);
    };

    const tick = () => {
      const current = placeholderUrls.current[urlIndex.current];

      if (!isDeleting.current) {
        charIndex.current += 1;
        setPlaceholder(current.slice(0, charIndex.current));

        if (charIndex.current >= current.length) {
          isDeleting.current = true;
          scheduleNext(2000, tick);
          return;
        }

        scheduleNext(140, tick);
        return;
      }

      charIndex.current -= 1;
      setPlaceholder(current.slice(0, charIndex.current));

      if (charIndex.current <= 0) {
        isDeleting.current = false;
        urlIndex.current = (urlIndex.current + 1) % placeholderUrls.current.length;
      }

      scheduleNext(55, tick);
    };

    scheduleNext(140, tick);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [url]);

  const handleAnalyze = () => {
    if (onRunClick) {
      onRunClick();
      return;
    }

    navigate("/auth?mode=signup");
  };

  return (
    <section className="orb-hero">
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

      <div className="orb-hero__bg-base" />

      <svg className="orb-hero__grain" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <filter id="heroGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.88" numOctaves={4} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#heroGrain)" opacity="0.3" />
      </svg>

      <div className="orb-hero__stage">
        <div className="orb-hero__wrapper">
          <div className="orb-hero__glow-aura" />

          <div className="orb-hero__connectors">
            <div className="orb-hero__connector orb-hero__connector--1" />
            <div className="orb-hero__connector orb-hero__connector--2" />
          </div>

          <div className="orb-hero__sphere" />
        </div>

        <div className="orb-hero__content">
          <h1>
            The future of <span>business</span>
          </h1>
          <p>Employ your own Elon Musk.</p>

          <div className="orb-hero__input">
            <Link2 className="orb-hero__url-icon" />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder={placeholder || "nike.com/shoes/air-max"}
            />
            <button type="button" className="orb-hero__btn" onClick={handleAnalyze}>
              <span>Activate CEO</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .orb-hero {
          --hero-bg-top: 215 100% 97%;
          --hero-bg-mid: 216 100% 90%;
          --hero-bg-bottom: 216 100% 78%;
          --hero-glow: 216 100% 76%;
          --hero-sphere-start: 0 0% 100%;
          --hero-sphere-mid-1: 214 100% 91%;
          --hero-sphere-mid-2: 216 100% 76%;
          --hero-sphere-end: 214 100% 65%;
          --hero-ink: 219 41% 7%;
          --hero-muted: 215 17% 43%;
          --hero-accent: 208 100% 60%;
          --hero-accent-strong: 211 78% 47%;
          --hero-pill: 0 0% 100%;
          --hero-input-bg: 0 0% 100% / 0.84;
          --hero-input-text: 215 17% 43%;
          --hero-connector-dim: 240 10% 75% / 0.3;
          --hero-connector-mid: 240 12% 82% / 0.6;
          --hero-connector-bright: 240 15% 90% / 0.9;
          --hero-connector-peak: 0 0% 100%;
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          background: linear-gradient(180deg, hsl(var(--hero-bg-top)) 0%, hsl(var(--hero-bg-mid)) 45%, hsl(var(--hero-bg-bottom)) 100%);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Dark mode overrides ── */
        .dark .orb-hero {
          --hero-bg-top: 222 47% 6%;
          --hero-bg-mid: 222 47% 10%;
          --hero-bg-bottom: 222 47% 16%;
          --hero-glow: 216 63% 53%;
          --hero-sphere-start: 220 33% 35%;
          --hero-sphere-mid-1: 222 56% 35%;
          --hero-sphere-mid-2: 216 60% 49%;
          --hero-sphere-end: 220 71% 41%;
          --hero-ink: 210 40% 96%;
          --hero-muted: 215 20% 65%;
          --hero-pill: 220 30% 20%;
          --hero-input-bg: 220 30% 12% / 0.88;
          --hero-input-text: 215 20% 65%;
          --hero-connector-dim: 220 33% 47% / 0.3;
          --hero-connector-mid: 220 33% 55% / 0.5;
          --hero-connector-bright: 216 50% 60% / 0.7;
          --hero-connector-peak: 216 63% 53%;
        }

        .dark .orb-hero__bg-base {
          background:
            radial-gradient(ellipse 80% 40% at 50% 0%, hsl(216 63% 53% / 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 60% 30% at 20% 50%, hsl(216 63% 53% / 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 30% at 80% 50%, hsl(216 63% 53% / 0.08) 0%, transparent 50%);
        }

        .dark .orb-hero__icon-btn,
        .dark .orb-hero__pill-link {
          color: hsl(var(--hero-ink));
          background: hsl(var(--hero-pill) / 0.6);
          box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.08);
        }

        .dark .orb-hero__sphere {
          box-shadow:
            inset -10px -10px 30px hsl(0 0% 0% / 0.3),
            inset 10px 10px 30px hsl(216 60% 50% / 0.3),
            0 0 120px hsl(var(--hero-glow) / 0.4);
        }

        .dark .orb-hero__input {
          background: hsl(var(--hero-input-bg));
          box-shadow: 0 8px 48px hsl(216 63% 53% / 0.15), 0 2px 10px hsl(0 0% 0% / 0.3);
          border: 1px solid hsl(0 0% 100% / 0.08);
        }

        .dark .orb-hero__input input {
          color: hsl(var(--hero-ink));
        }

        .dark .orb-hero__input input::placeholder {
          color: hsl(var(--hero-input-text));
        }

        .dark .orb-hero__url-icon {
          color: hsl(216 50% 50%);
        }

        .dark .orb-hero__grain {
          opacity: 0.15;
        }

        .orb-hero__header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: transparent;
        }

        .orb-hero__header-inner {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 2.5rem;
        }

        .orb-hero__brand {
          display: flex;
          align-items: center;
        }

        .orb-hero__logo {
          height: 64px;
          width: auto;
          display: block;
          transition: filter 0.3s ease;
        }

        .orb-hero__nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .orb-hero__icon-btn,
        .orb-hero__pill-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: none;
          text-decoration: none;
          color: hsl(var(--hero-ink));
          background: hsl(var(--hero-pill) / 0.46);
          backdrop-filter: blur(10px);
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.28);
          transition: background 0.3s ease, color 0.3s ease;
        }

        .orb-hero__icon-btn {
          width: 40px;
          height: 40px;
          cursor: pointer;
        }

        .orb-hero__pill-link {
          min-height: 40px;
          padding: 0.5rem 1.1rem;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .orb-hero__cta-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          padding: 0.55rem 1.15rem;
          border-radius: 999px;
          text-decoration: none;
          color: hsl(0 0% 100%);
          background: linear-gradient(135deg, hsl(197 100% 68%) 0%, hsl(var(--hero-accent)) 100%);
          box-shadow: 0 10px 28px hsl(208 100% 60% / 0.28);
          font-size: 0.95rem;
          font-weight: 700;
          transition: box-shadow 0.3s ease;
        }

        .orb-hero__bg-base {
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 80% 40% at 50% 0%, hsl(0 0% 100% / 0.5) 0%, transparent 60%),
            radial-gradient(ellipse 60% 30% at 20% 50%, hsl(0 0% 100% / 0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 30% at 80% 50%, hsl(0 0% 100% / 0.15) 0%, transparent 50%);
          transition: background 0.3s ease;
        }

        .orb-hero__grain {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          mix-blend-mode: soft-light;
          opacity: 0.3;
          transition: opacity 0.3s ease;
        }

        .orb-hero__stage {
          --sz: min(70vw, 720px);
          position: absolute;
          bottom: 5vh;
          left: 50%;
          transform: translateX(-50%);
          width: var(--sz);
          height: var(--sz);
          z-index: 10;
        }

        .orb-hero__wrapper {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          top: 0;
          width: var(--sz);
          height: var(--sz);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-hero__glow-aura {
          position: absolute;
          border-radius: 50%;
          inset: calc(var(--sz) * -0.25);
          background: radial-gradient(circle, hsl(var(--hero-glow) / 0.3) 0%, transparent 70%);
          animation: orb-pulse-slow 4s ease-in-out infinite;
        }

        .orb-hero__connectors {
          position: absolute;
          inset: 0;
        }

        .orb-hero__connector {
          position: absolute;
          border-style: solid;
          border-color: transparent;
          pointer-events: none;
        }

        .orb-hero__connector--1 {
          inset: calc(var(--sz) * -0.012);
          border-width: calc(var(--sz) * 0.022);
          border-radius: 49% 51% 50% 50% / 51% 49% 51% 49%;
          background:
            linear-gradient(transparent, transparent) padding-box,
            conic-gradient(from 0deg, transparent 0%, hsl(var(--hero-connector-dim)) 6%, hsl(var(--hero-connector-mid)) 10%, hsl(var(--hero-connector-bright)) 14%, hsl(var(--hero-connector-peak)) 18%, hsl(var(--hero-connector-bright)) 22%, hsl(var(--hero-connector-mid)) 26%, hsl(var(--hero-connector-dim)) 30%, transparent 34%, transparent 100%) border-box;
          animation: orb-edge-rotate 12s linear infinite;
        }

        .orb-hero__connector--2 {
          inset: calc(var(--sz) * -0.012);
          border-width: calc(var(--sz) * 0.022);
          border-radius: 51% 49% 49% 51% / 49% 51% 50% 50%;
          background:
            linear-gradient(transparent, transparent) padding-box,
            conic-gradient(from 180deg, transparent 0%, hsl(var(--hero-connector-dim)) 6%, hsl(var(--hero-connector-mid)) 10%, hsl(var(--hero-connector-bright)) 14%, hsl(var(--hero-connector-peak)) 18%, hsl(var(--hero-connector-bright)) 22%, hsl(var(--hero-connector-mid)) 26%, hsl(var(--hero-connector-dim)) 30%, transparent 34%, transparent 100%) border-box;
          animation: orb-edge-rotate 12s linear infinite;
        }

        .orb-hero__sphere {
          width: var(--sz);
          height: var(--sz);
          min-width: var(--sz);
          min-height: var(--sz);
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          z-index: 1;
          background: radial-gradient(circle at 30% 30%,
            hsl(var(--hero-sphere-start)) 0%,
            hsl(var(--hero-sphere-mid-1)) 20%,
            hsl(var(--hero-sphere-mid-2)) 50%,
            hsl(var(--hero-sphere-end)) 100%
          );
          box-shadow:
            inset -10px -10px 30px hsl(0 0% 0% / 0.1),
            inset 10px 10px 30px hsl(0 0% 100% / 0.8),
            0 0 120px hsl(var(--hero-glow) / 0.3);
          transition: box-shadow 0.3s ease;
        }

        .orb-hero__content {
          position: absolute;
          z-index: 20;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          text-align: center;
          width: clamp(400px, 76%, 720px);
          white-space: nowrap;
          animation: orb-fade-up 0.8s ease-out both;
        }

        .orb-hero__content h1 {
          font-size: clamp(40px, 6vw, 74px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1;
          color: hsl(var(--hero-ink));
          margin: 0;
          white-space: nowrap;
          transition: color 0.3s ease;
        }

        .orb-hero__content h1 span {
          background: linear-gradient(135deg, hsl(var(--hero-accent)) 0%, hsl(var(--hero-accent-strong)) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .orb-hero__content p {
          font-size: 19px;
          font-weight: 400;
          color: hsl(var(--hero-muted));
          margin: 0;
          letter-spacing: 0.01em;
          white-space: nowrap;
          transition: color 0.3s ease;
        }

        .orb-hero__input {
          display: flex;
          align-items: center;
          width: 100%;
          padding: 14px 14px 14px 26px;
          border-radius: 22px;
          background: hsl(var(--hero-input-bg));
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 48px hsl(208 100% 60% / 0.2), 0 2px 10px hsl(0 0% 0% / 0.08);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }

        .orb-hero__url-icon {
          width: 22px;
          height: 22px;
          margin-right: 14px;
          flex-shrink: 0;
          color: hsl(214 67% 80%);
          transition: color 0.3s ease;
        }

        .orb-hero__input input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: hsl(var(--hero-input-text));
          caret-color: hsl(var(--hero-accent));
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 16px;
          font-weight: 400;
          white-space: nowrap;
          overflow: hidden;
          transition: color 0.3s ease;
        }

        .orb-hero__input input::placeholder {
          color: hsl(var(--hero-input-text));
        }

        .orb-hero__btn {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 13px 22px;
          border: none;
          border-radius: 15px;
          cursor: pointer;
          color: hsl(0 0% 100%);
          background: linear-gradient(135deg, hsl(197 100% 68%) 0%, hsl(var(--hero-accent)) 100%);
          box-shadow: 0 3px 14px hsl(208 100% 60% / 0.38);
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          white-space: nowrap;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .orb-hero__btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px hsl(208 100% 60% / 0.48);
        }

        .orb-hero__btn:active {
          transform: scale(0.97);
        }

        @keyframes orb-pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.3; }
        }

        @keyframes orb-edge-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes orb-fade-up {
          from { opacity: 0; transform: translate(-50%, -50%) translateY(18px); }
          to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
        }

        @media (max-width: 640px) {
          .orb-hero__header-inner {
            padding: 0.75rem 1rem;
          }

          .orb-hero__logo {
            height: 44px;
          }

          .orb-hero__nav-actions {
            gap: 0.6rem;
          }

          .orb-hero__icon-btn {
            width: 34px;
            height: 34px;
          }

          .orb-hero__pill-link,
          .orb-hero__cta-link {
            min-height: 34px;
            font-size: 0.8rem;
            padding: 0.4rem 0.9rem;
          }

          .orb-hero__stage {
            --sz: min(160vw, 900px);
          }

          .orb-hero__content {
            width: clamp(280px, 85vw, 500px);
            gap: 12px;
          }

          .orb-hero__content h1 {
            font-size: clamp(28px, 7vw, 44px);
            white-space: normal;
          }

          .orb-hero__content p {
            font-size: 15px;
            white-space: normal;
          }

          .orb-hero__input {
            padding: 10px 10px 10px 18px;
            border-radius: 16px;
          }

          .orb-hero__url-icon {
            width: 18px;
            height: 18px;
            margin-right: 10px;
          }

          .orb-hero__input input {
            font-size: 14px;
          }

          .orb-hero__btn {
            padding: 10px 16px;
            border-radius: 12px;
            font-size: 13px;
          }
        }
      `}</style>
    </section>
  );
}
