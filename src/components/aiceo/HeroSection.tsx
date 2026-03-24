import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Link2, Moon, Sun, Globe, ArrowRight } from "lucide-react";
import { useTheme } from "next-themes";

interface HeroSectionProps {
  onRunClick?: () => void;
}

const urls = [
  "nike.com/shoes/air-max",
  "apple.com/iphone",
  "shopify.com/pricing",
  "stripe.com/payments",
  "notion.so/product",
  "figma.com/design",
  "airbnb.com/rooms",
  "tesla.com/model3",
];

export function HeroSection({ onRunClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const grainCanvasRef = useRef<HTMLCanvasElement>(null);
  const [typewriterText, setTypewriterText] = useState("");
  const [url, setUrl] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Grain effect
  useEffect(() => {
    const canvas = grainCanvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx || canvas.width === 0 || canvas.height === 0) return;

      const id = ctx.createImageData(canvas.width, canvas.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        d[i] = d[i + 1] = d[i + 2] = v;
        d[i + 3] = (Math.random() * 18) | 0;
      }
      ctx.putImageData(id, 0, 0);
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Typewriter effect
  useEffect(() => {
    if (isEditing) return;
    let ui = 0;
    let ci = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeSpeed = 52;
    const deleteSpeed = 28;
    const pauseAfter = 1600;
    const pauseBefore = 320;

    const tick = () => {
      const current = urls[ui];
      if (!deleting) {
        ci++;
        setTypewriterText(current.slice(0, ci));
        if (ci === current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, pauseAfter);
          return;
        }
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        ci--;
        setTypewriterText(current.slice(0, ci));
        if (ci === 0) {
          deleting = false;
          ui = (ui + 1) % urls.length;
          timeoutId = setTimeout(tick, pauseBefore);
          return;
        }
        timeoutId = setTimeout(tick, deleteSpeed);
      }
    };

    timeoutId = setTimeout(tick, 600);
    return () => clearTimeout(timeoutId);
  }, [isEditing]);

  const handleAnalyze = () => {
    if (onRunClick) {
      onRunClick();
      return;
    }
    navigate("/auth?mode=signup");
  };

  return (
    <section className="orb-hero">
      {/* ── Sticky header (unchanged) ── */}
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

      {/* ── Background gradient ── */}
      <div className="orb-hero__bg-base" />

      {/* ── Grain canvas ── */}
      <canvas
        ref={grainCanvasRef}
        className="absolute inset-0 z-[1] pointer-events-none mix-blend-multiply"
        style={{ opacity: isDark ? 0.15 : 0.08 }}
      />

      {/* ── Orb stage ── */}
      <div className="orb-hero__stage">
        <div className="orb-hero__wrapper">
          {/* Glow aura */}
          <div className="orb-hero__glow-aura" />

          {/* Rotating connectors */}
          <div className="orb-hero__connectors">
            <div className="orb-hero__connector orb-hero__connector--1" />
            <div className="orb-hero__connector orb-hero__connector--2" />
          </div>

          {/* Main sphere */}
          <div className="orb-hero__sphere" />
        </div>

        {/* Content inside orb area */}
        <div className="orb-hero__content">
          <div className="flex flex-col items-center gap-8 w-fit max-w-full">
            {/* Top text */}
            <div className="flex flex-col items-center gap-4 w-full">
              <h1>
                The future of <span>business</span>
              </h1>
              <p>
                Levers pulled for you by{" "}
                <span className="font-bold line-through">YOU</span>
              </p>
            </div>

            {/* Input area */}
            <div className="flex flex-col items-center gap-4 w-full">
              <div className="orb-hero__input">
                <div className="orb-hero__url-row" onClick={() => { if (!isEditing) { setIsEditing(true); setTimeout(() => inputRef.current?.focus(), 0); } }}>
                  <Globe className="orb-hero__url-icon" />

                  {isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                      placeholder="nike.com/shoes/air-max"
                      autoFocus
                    />
                  ) : (
                    <span className="flex items-center flex-1 min-w-0 text-left cursor-text">
                      <span
                        className="text-[16px] font-normal whitespace-nowrap overflow-hidden"
                        style={{ color: "hsl(var(--hero-input-text))" }}
                      >
                        {typewriterText}
                      </span>
                      <span className="inline-block w-[2px] h-[1em] ml-[1px] align-text-bottom animate-blink"
                        style={{ background: "hsl(var(--hero-accent))" }} />
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="orb-hero__btn"
                  onClick={handleAnalyze}
                >
                  <span>Activate CEO</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>

              {/* Bullet points */}
              <div className="orb-hero__bullets">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full" style={{ background: "hsl(var(--hero-accent))" }} />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full" style={{ background: "hsl(var(--hero-accent))" }} />
                  <span>15-90 seconds</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-blink { animation: blink .7s step-end infinite; }

        .orb-hero {
          --hero-bg-top: 215 100% 97%;
          --hero-bg-mid: 216 100% 90%;
          --hero-bg-bottom: 216 100% 78%;
          --hero-glow: 216 100% 76%;
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

          --hero-sphere-core: radial-gradient(
            circle at center,
            #ee8878 0%, #d56a87 30%, #8ebcf0 70%, #ffffff 100%
          );

          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          background: linear-gradient(
            180deg,
            hsl(var(--hero-bg-top)) 0%,
            hsl(var(--hero-bg-mid)) 45%,
            hsl(var(--hero-bg-bottom)) 100%
          );
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        /* ── Dark mode ── */
        .dark .orb-hero {
          --hero-bg-top: 222 47% 6%;
          --hero-bg-mid: 222 47% 10%;
          --hero-bg-bottom: 222 47% 16%;
          --hero-glow: 216 63% 53%;
          --hero-ink: 219 41% 7%;
          --hero-muted: 215 17% 43%;
          --hero-accent: 208 100% 60%;
          --hero-accent-strong: 211 78% 47%;
          --hero-pill: 0 0% 100%;
          --hero-input-bg: 0 0% 100% / 0.84;
          --hero-input-text: 215 17% 43%;
          --hero-connector-dim: 220 33% 47% / 0.3;
          --hero-connector-mid: 220 33% 55% / 0.5;
          --hero-connector-bright: 216 50% 60% / 0.7;
          --hero-connector-peak: 216 63% 53%;
          --hero-sphere-core: radial-gradient(
            circle at center,
            #ee8878 0%, #d56a87 30%, #8ebcf0 70%, #ffffff 100%
          );
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
          background: hsl(var(--hero-pill) / 0.46);
          box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.28);
        }

        .dark .orb-hero__sphere {
          box-shadow:
            inset -10px -10px 30px hsl(0 0% 0% / 0.1),
            inset 10px 10px 30px hsl(0 0% 100% / 0.8),
            0 0 120px hsl(var(--hero-glow) / 0.3);
        }

        .dark .orb-hero__input {
          background: hsl(var(--hero-input-bg));
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 48px hsl(208 100% 60% / 0.2), 0 2px 10px hsl(0 0% 0% / 0.08);
          border: none;
        }

        .dark .orb-hero__input input { color: hsl(var(--hero-ink)); }
        .dark .orb-hero__input input::placeholder { color: hsl(var(--hero-input-text)); }
        .dark .orb-hero__url-icon { color: hsl(214 67% 80%); }

        .dark .orb-hero__bullets { background: hsl(0 0% 100% / 0.3); border-color: hsl(0 0% 100% / 0.6); }
        .dark .orb-hero__bullets span { color: hsl(var(--hero-muted)); }

        /* ── Header (unchanged) ── */
        .orb-hero__header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: transparent;
        }
        .orb-hero__header-inner {
          width: 100%; display: flex; align-items: center;
          justify-content: space-between; padding: 1.25rem 2.5rem;
        }
        .orb-hero__brand { display: flex; align-items: center; }
        .orb-hero__logo { height: 64px; width: auto; display: block; transition: filter 0.3s ease; }
        .orb-hero__nav-actions { display: flex; align-items: center; gap: 1rem; }

        .orb-hero__icon-btn, .orb-hero__pill-link {
          display: inline-flex; align-items: center; justify-content: center;
          border: none; text-decoration: none; color: hsl(var(--hero-ink));
          background: hsl(var(--hero-pill) / 0.46); backdrop-filter: blur(10px);
          border-radius: 999px; box-shadow: inset 0 0 0 1px hsl(0 0% 100% / 0.28);
          transition: background 0.3s ease, color 0.3s ease;
        }
        .orb-hero__icon-btn { width: 40px; height: 40px; cursor: pointer; }
        .orb-hero__pill-link { min-height: 40px; padding: 0.5rem 1.1rem; font-size: 0.95rem; font-weight: 500; }
        .orb-hero__cta-link {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 40px; padding: 0.55rem 1.15rem; border-radius: 999px;
          text-decoration: none; color: hsl(0 0% 100%);
          background: linear-gradient(135deg, hsl(197 100% 68%) 0%, hsl(var(--hero-accent)) 100%);
          box-shadow: 0 10px 28px hsl(208 100% 60% / 0.28);
          font-size: 0.95rem; font-weight: 700; transition: box-shadow 0.3s ease;
        }

        /* ── Background layer ── */
        .orb-hero__bg-base {
          position: absolute; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 150% 100% at 50% 100%, hsl(var(--hero-accent)) 0%, transparent 70%);
          opacity: 0.15;
          transition: background 0.3s ease;
        }

        /* ── Orb stage — NEW: bigger, positioned at bottom ── */
        .orb-hero__stage {
          --sz: min(200vw, 2400px);
          position: absolute;
          bottom: 0; left: 50%; transform: translateX(-50%) translateY(50%);
          width: var(--sz); height: var(--sz);
          z-index: 10;
        }

        .orb-hero__wrapper {
          position: absolute; left: 50%; transform: translateX(-50%);
          top: calc(var(--sz) * 0.08);
          width: var(--sz); height: var(--sz);
          display: flex; align-items: center; justify-content: center;
        }

        .orb-hero__glow-aura {
          position: absolute; border-radius: 50%;
          inset: calc(var(--sz) * -0.25);
          background: radial-gradient(circle, hsl(var(--hero-glow) / 0.3) 0%, transparent 70%);
          animation: orb-pulse-slow 4s ease-in-out infinite;
        }

        .orb-hero__connectors { position: absolute; inset: 0; }

        .orb-hero__connector {
          position: absolute; border-style: solid; border-color: transparent; pointer-events: none;
        }
        .orb-hero__connector--1 {
          inset: calc(var(--sz) * -0.012); border-width: calc(var(--sz) * 0.022);
          border-radius: 49% 51% 50% 50% / 51% 49% 51% 49%;
          background:
            linear-gradient(transparent, transparent) padding-box,
            conic-gradient(from 0deg, transparent 0%, hsl(var(--hero-connector-dim)) 6%, hsl(var(--hero-connector-mid)) 10%, hsl(var(--hero-connector-bright)) 14%, hsl(var(--hero-connector-peak)) 18%, hsl(var(--hero-connector-bright)) 22%, hsl(var(--hero-connector-mid)) 26%, hsl(var(--hero-connector-dim)) 30%, transparent 34%, transparent 100%) border-box;
          animation: orb-edge-rotate 12s linear infinite;
        }
        .orb-hero__connector--2 {
          inset: calc(var(--sz) * -0.012); border-width: calc(var(--sz) * 0.022);
          border-radius: 51% 49% 49% 51% / 49% 51% 50% 50%;
          background:
            linear-gradient(transparent, transparent) padding-box,
            conic-gradient(from 180deg, transparent 0%, hsl(var(--hero-connector-dim)) 6%, hsl(var(--hero-connector-mid)) 10%, hsl(var(--hero-connector-bright)) 14%, hsl(var(--hero-connector-peak)) 18%, hsl(var(--hero-connector-bright)) 22%, hsl(var(--hero-connector-mid)) 26%, hsl(var(--hero-connector-dim)) 30%, transparent 34%, transparent 100%) border-box;
          animation: orb-edge-rotate 12s linear infinite;
        }

        /* ── Sphere — NEW: pink/coral gradient ── */
        .orb-hero__sphere {
          width: var(--sz); height: var(--sz);
          min-width: var(--sz); min-height: var(--sz);
          border-radius: 50%; position: relative; overflow: hidden; z-index: 1;
          background: var(--hero-sphere-core);
          box-shadow:
            inset -10px -10px 30px hsl(0 0% 0% / 0.1),
            inset 10px 10px 30px hsl(0 0% 100% / 0.8),
            0 0 120px hsl(var(--hero-glow) / 0.3);
          transition: box-shadow 0.3s ease;
        }

        /* ── Content — positioned inside the orb area ── */
        .orb-hero__content {
          position: absolute; z-index: 20;
          top: 22%; left: 50%;
          transform: translate(-50%, -50%);
          display: flex; flex-direction: column; align-items: center;
          text-align: center;
          width: clamp(320px, 90%, 800px);
          animation: orb-fade-up 0.8s ease-out both;
        }

        .orb-hero__content h1 {
          font-size: clamp(40px, 5vw, 64px);
          font-weight: 700; letter-spacing: -0.03em; line-height: 1;
          color: hsl(0 0% 0%); margin: 0;
          transition: color 0.3s ease;
        }
        .dark .orb-hero__content h1 {
          color: hsl(0 0% 0%);
        }
        .orb-hero__content h1 span {
          color: inherit; background: none;
          -webkit-background-clip: unset; -webkit-text-fill-color: unset; background-clip: unset;
        }
        .orb-hero__content p {
          font-size: 19px; font-weight: 400; color: hsl(var(--hero-muted));
          margin: 0; letter-spacing: 0.01em; transition: color 0.3s ease;
        }

        /* ── Input bar ── */
        .orb-hero__input {
          display: flex; align-items: center; width: 100%;
          padding: 14px 14px 14px 26px; border-radius: 22px;
          background: hsl(var(--hero-input-bg)); backdrop-filter: blur(20px);
          box-shadow: 0 8px 48px hsl(208 100% 60% / 0.2), 0 2px 10px hsl(0 0% 0% / 0.08);
          transition: background 0.3s ease, box-shadow 0.3s ease;
        }
        .orb-hero__url-row {
          display: flex; align-items: center; flex: 1; min-width: 0; min-height: 28px;
        }
        .orb-hero__url-icon {
          width: 22px; height: 22px; margin-right: 14px; flex-shrink: 0;
          color: hsl(214 67% 80%); transition: color 0.3s ease;
        }
        .orb-hero__input input {
          flex: 1; min-width: 0; border: none; outline: none; background: transparent;
          color: hsl(var(--hero-input-text)); caret-color: hsl(var(--hero-accent));
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 16px; font-weight: 400;
          white-space: nowrap; overflow: hidden; transition: color 0.3s ease;
        }
        .orb-hero__input input::placeholder { color: hsl(var(--hero-input-text)); }

        .orb-hero__btn {
          flex-shrink: 0; display: inline-flex; align-items: center; gap: 7px;
          padding: 13px 22px; border: none; border-radius: 15px; cursor: pointer;
          color: hsl(0 0% 100%);
          background: linear-gradient(135deg, hsl(197 100% 68%) 0%, hsl(var(--hero-accent)) 100%);
          box-shadow: 0 3px 14px hsl(208 100% 60% / 0.38);
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 15px; font-weight: 700;
          white-space: nowrap; transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .orb-hero__btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px hsl(208 100% 60% / 0.48); }
        .orb-hero__btn:active { transform: scale(0.97); }

        /* ── Bullets ── */
        .orb-hero__bullets {
          display: flex; align-items: center; gap: 14px;
          background: hsl(0 0% 100% / 0.3); backdrop-filter: blur(12px);
          border: 1px solid hsl(0 0% 100% / 0.6); border-radius: 999px;
          padding: 4px 14px;
          box-shadow: 0 4px 24px hsl(0 0% 0% / 0.04);
        }
        .orb-hero__bullets span {
          font-size: 12px; font-weight: 500; color: hsl(var(--hero-muted));
        }

        /* ── Keyframes ── */
        @keyframes orb-pulse-slow { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.3; } }
        @keyframes orb-edge-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orb-fade-up {
          from { opacity: 0; transform: translate(-50%, -50%) translateY(18px); }
          to { opacity: 1; transform: translate(-50%, -50%) translateY(0); }
        }

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .orb-hero__header-inner { padding: 0.75rem 1rem; }
          .orb-hero__logo { height: 44px; }
          .orb-hero__nav-actions { gap: 0.6rem; }
          .orb-hero__icon-btn { width: 34px; height: 34px; }
          .orb-hero__pill-link, .orb-hero__cta-link { min-height: 34px; font-size: 0.8rem; padding: 0.4rem 0.9rem; }

          .orb-hero__stage { --sz: min(260vw, 1600px); }
          .orb-hero__content { width: clamp(300px, 92vw, 500px); }
          .orb-hero__content h1 { font-size: clamp(28px, 7vw, 44px); }
          .orb-hero__content p { font-size: 15px; }

          .orb-hero__input {
            flex-direction: column; align-items: stretch; gap: 10px;
            padding: 14px; border-radius: 20px;
          }
          .orb-hero__url-row {
            background: hsl(0 0% 100% / 0.5); border-radius: 12px;
            padding: 10px 14px; min-height: 44px;
          }
          .orb-hero__url-icon { width: 18px; height: 18px; margin-right: 10px; }
          .orb-hero__input input { font-size: 14px; }
          .orb-hero__btn { padding: 12px 16px; border-radius: 12px; font-size: 14px; width: 100%; justify-content: center; }
          .orb-hero__bullets { gap: 10px; padding: 3px 10px; }
          .orb-hero__bullets span { font-size: 11px; }
        }
      `}</style>
    </section>
  );
}
