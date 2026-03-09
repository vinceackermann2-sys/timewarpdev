import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Globe, Sun, Moon, Link2 } from "lucide-react";
import { useTheme } from "next-themes";

interface HeroSectionProps {
  onRunClick?: () => void;
}

// Generate a small noise data URL once (100x100 canvas → ~4KB PNG)
function generateNoiseDataUrl(): string {
  const size = 100;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(size, size);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.random() * 255;
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function LightPhoneMockup() {
  return (
    <div
      style={{
        width: 320,
        height: 650,
        background: "#fff",
        borderRadius: 44,
        border: "12px solid #111",
        boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25), 0 -5px 25px rgba(0,0,0,0.05)",
        position: "relative",
        overflow: "hidden",
        transform: "rotateY(-5deg) rotateX(2deg)",
        transition: "transform 0.5s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "rotateY(0deg) rotateX(0deg) translateY(-10px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "rotateY(-5deg) rotateX(2deg)";
      }}
    >
      <div style={{ width: "100%", height: "100%", background: "#fff", display: "flex", flexDirection: "column", position: "relative" }}>
        {/* Notch */}
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 120, height: 25, background: "#111", borderBottomLeftRadius: 16, borderBottomRightRadius: 16, zIndex: 10 }} />
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.5rem 0.5rem", fontSize: "0.8rem", fontWeight: 600, zIndex: 5 }}>
          <span>9:41</span>
          <div style={{ display: "flex", gap: "0.3rem", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 10C18 10 21 10 21 14C21 18 18 18 18 18" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 6C14 6 18 6 18 14C18 22 14 22 14 22" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 2C10 2 15 2 15 14C15 26 10 26 10 26" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="black" strokeWidth="2" strokeLinejoin="round"/></svg>
          </div>
        </div>
        {/* App Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1.5rem", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "rgba(139,92,246,0.1)", color: "#3399ff", padding: "0.3rem 0.8rem", borderRadius: 999, fontSize: "0.75rem", fontWeight: 600, marginBottom: "1.5rem" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#3399ff"/><circle cx="12" cy="12" r="4" fill="white"/></svg>
            AI-Powered Research
          </div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "1.5rem", color: "#000", fontFamily: "'Outfit', sans-serif" }}>Enter your product URL</h2>
          <div style={{ width: "100%", display: "flex", alignItems: "center", background: "#f8fafc", borderRadius: 8, padding: "0.4rem 0.5rem", marginBottom: "1.5rem", border: "1px solid rgba(0,0,0,0.05)" }}>
            <Globe size={14} style={{ color: "#3399ff", opacity: 0.7, marginRight: "0.5rem", flexShrink: 0 }} />
            <span style={{ color: "#9ca3af", fontSize: "0.85rem", fontFamily: "'Outfit', sans-serif" }}>https://example</span>
          </div>
          <button style={{ width: "100%", borderRadius: 8, padding: "0.6rem", fontSize: "0.9rem", background: "#3399ff", color: "#fff", border: "none", fontWeight: 500, cursor: "pointer", fontFamily: "'Outfit', sans-serif" }}>
            Analyze →
          </button>
        </div>
      </div>
    </div>
  );
}

export function HeroSection({ onRunClick }: HeroSectionProps) {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
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

  // Generate noise texture once
  const noiseUrl = useMemo(() => {
    if (typeof document === "undefined") return "";
    return generateNoiseDataUrl();
  }, []);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

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
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [url]);

  const handleAnalyze = () => {
    if (onRunClick) onRunClick();
  };

  // Theme colors
  const t = {
    bg: dark ? "#0a0e1a" : "#ffffff",
    text: dark ? "#ffffff" : "#000000",
    textSec: dark ? "rgba(255,255,255,0.6)" : "#333333",
    inputBg: dark ? "#0a0e1a" : "#ffffff",
    inputBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    inputShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 4px 15px rgba(0,0,0,0.08)",
    inputText: dark ? "#fff" : "#000",
    badgeBg: dark ? "#0a0e1a" : "rgba(255,255,255,0.6)",
    badgeBorder: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)",
    badgeText: dark ? "#fff" : "#000",
    dotColor: dark ? "#ffffff" : "#000000",
    hintColor: dark ? "rgba(255,255,255,0.5)" : "#333",
    navLink: dark ? "#fff" : "#000",
    iconColor: dark ? "rgba(255,255,255,0.7)" : "#333",
    logoFilter: dark ? "none" : "contrast(1.1) brightness(1.05)",
    logoBlend: dark ? "normal" as const : "multiply" as const,
    auraOpacity: dark ? 0.85 : 1,
  };

  return (
    <>
    {/* Navbar - outside overflow:hidden wrapper so fixed positioning works */}
    <header className="hero-navbar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1rem", width: "100%", maxWidth: 1760, margin: "0 auto", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", background: dark ? "rgba(10,14,26,0.65)" : "rgba(255,255,255,0.65)", fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <img className="hero-logo" src="/favicon.png" alt="TimeWarp Logo" style={{ height: 48, width: "auto", display: "block", mixBlendMode: t.logoBlend, filter: t.logoFilter, transition: "filter 0.3s ease" }} />
      </div>
      <div className="hero-nav-actions" style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
        <button
          aria-label="Toggle theme"
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="hero-theme-btn"
          style={{ background: dark ? "hsla(0,0%,100%,0.1)" : "hsla(250,30%,92%,0.7)", border: "none", cursor: "pointer", color: t.iconColor, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", borderRadius: 12, width: 40, height: 40 }}
        >
          {dark ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <Link className="hero-login-link" to="/auth" style={{ textDecoration: "none", color: t.navLink, fontWeight: 500, fontSize: "0.95rem", fontFamily: "'Outfit', sans-serif", transition: "color 0.3s ease", background: dark ? "hsla(0,0%,100%,0.1)" : "hsla(250,30%,92%,0.7)", padding: "0.5rem 1.2rem", borderRadius: 12 }}>Log in</Link>
        <Link
          className="hero-cta-btn"
          to="/auth?mode=signup"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0.6rem 1.2rem", borderRadius: 8, fontFamily: "'Outfit', sans-serif", fontWeight: 500, fontSize: "0.95rem", cursor: "pointer", textDecoration: "none", transition: "all 0.2s ease", border: "none", background: "#3399ff", color: "#fff" }}
        >
          Get Started →
        </Link>
      </div>
    </header>

    <div className={dark ? "dark-card" : ""} style={{ fontFamily: "'Outfit', sans-serif", color: t.text, minHeight: "100dvh", display: "flex", flexDirection: "column", transition: "color 0.3s ease", position: "relative", overflow: "hidden", paddingTop: 72 }}>
      {/* Fixed Background */}
      <div style={{ position: "absolute", inset: 0, zIndex: -1, background: t.bg, overflow: "hidden", transition: "background 0.3s ease" }}>
        {/* Mobile: lightweight CSS gradient aurora (no SVG filters) */}
        <div className="block sm:hidden" style={{
          position: "absolute", inset: 0,
          background: [
            `radial-gradient(ellipse 160% 70% at 50% 100%, ${dark ? "rgba(160,179,228,0.5)" : "rgba(160,179,228,0.58)"} 0%, transparent 65%)`,
            `radial-gradient(ellipse 120% 55% at 40% 85%, ${dark ? "rgba(111,149,214,0.45)" : "rgba(111,149,214,0.55)"} 0%, transparent 55%)`,
            `radial-gradient(ellipse 90% 45% at 60% 90%, ${dark ? "rgba(178,138,200,0.35)" : "rgba(178,138,200,0.5)"} 0%, transparent 50%)`,
            `radial-gradient(ellipse 70% 35% at 50% 95%, ${dark ? "rgba(211,110,142,0.25)" : "rgba(211,110,142,0.35)"} 0%, transparent 45%)`,
            `radial-gradient(ellipse 130% 35% at 50% 0%, ${dark ? "rgba(229,169,197,0.25)" : "rgba(229,169,197,0.4)"} 0%, transparent 45%)`,
          ].join(", "),
          opacity: t.auraOpacity,
          transition: "opacity 0.3s ease",
        }} />

        {/* Desktop: full SVG aurora with blur filters */}
        <svg className="hidden sm:block" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: t.auraOpacity, transition: "opacity 0.3s ease" }} viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
          <defs>
            <filter id="f5" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60" /></filter>
            <filter id="f4" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60" /></filter>
            <filter id="f3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60" /></filter>
            <filter id="f2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60" /></filter>
            <filter id="f1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60" /></filter>
            <filter id="fblob" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="60" /></filter>
            <filter id="fcap1" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="72" /></filter>
            <filter id="fcap2" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur stdDeviation="90" /></filter>
          </defs>
          <rect x="-200" y="100" width="2320" height="400" rx="1160" ry="200" fill="#7a6aa0" opacity="0.30" filter="url(#fcap2)" />
          <rect x="-550" y="270" width="3020" height="1380" rx="1510" ry="690" fill="#a0b3e4" opacity="0.64" filter="url(#f4)" />
          <rect x="-272" y="360" width="2464" height="1120" rx="1232" ry="560" fill="#6f95d6" opacity="0.68" filter="url(#f3)" />
          <rect x="-96" y="440" width="2112" height="960" rx="1056" ry="480" fill="#777dd6" opacity="0.72" filter="url(#f2)" />
          <rect x="80" y="520" width="1760" height="800" rx="880" ry="400" fill="#b28ac8" opacity="0.74" filter="url(#f1)" />
          <rect x="240" y="590" width="1440" height="660" rx="720" ry="330" fill="#D36E8E" opacity="0.74" filter="url(#f1)" />
          <rect x="510" y="750" width="900" height="460" rx="230" ry="230" fill="#e57373" opacity="0.74" filter="url(#fblob)" />
          <rect x="200" y="-160" width="1520" height="460" rx="760" ry="230" fill="#e5a9c5" opacity="0.35" filter="url(#fcap2)" />
          <rect x="360" y="-240" width="1200" height="480" rx="600" ry="240" fill="#e5a9c5" opacity="0.50" filter="url(#fcap2)" />
          <rect x="480" y="-180" width="960" height="380" rx="480" ry="190" fill="#e5a9c5" opacity="0.60" filter="url(#fcap1)" />
        </svg>

        {/* Grain: lightweight canvas-generated noise tile (all devices) */}
        {noiseUrl && (
          <div className="hero-grain-tile" style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            mixBlendMode: "soft-light" as const, opacity: 0.6, zIndex: 9,
            backgroundImage: `url(${noiseUrl})`,
            backgroundRepeat: "repeat",
            backgroundSize: "100px 100px",
          }} />
        )}

        {/* Desktop-only: extra high-fidelity SVG grain layer */}
        <div className="hidden sm:block" style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "soft-light" as const, opacity: 0.85, zIndex: 10 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.88" numOctaves={4} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width="100%" height="100%" filter="url(#grain)" opacity="1" />
          </svg>
        </div>
        <div className="hidden sm:block" style={{ position: "absolute", inset: 0, pointerEvents: "none", mixBlendMode: "multiply" as const, opacity: 0.42, zIndex: 11 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves={3} seed={8} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
            <rect width="100%" height="100%" filter="url(#grain2)" opacity="1" />
          </svg>
        </div>
      </div>


      {/* Hero */}
      <main style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", maxWidth: 1760, margin: "0 auto", padding: "4rem 2rem", gap: "4rem", flex: 1 }} className="hero-main-flex">
        {/* Left Content */}
        <div style={{ flex: 1, maxWidth: 720 }} className="hero-left-content">
          <h1 className="hero-heading" style={{ fontSize: "clamp(2.4rem, 5vw, 4.8rem)", fontWeight: 700, lineHeight: 1.05, marginBottom: "2rem", letterSpacing: "-0.04em", color: dark ? "#ffffff" : "#0F2638", fontFamily: "'Outfit', sans-serif", transition: "color 0.3s ease" }}>
            Get business decisions<br />completed in<br className="hero-mobile-br" /> seconds
          </h1>
          <p className="hero-subtitle" style={{ fontSize: "1.25rem", color: t.textSec, lineHeight: 1.5, marginBottom: "3rem", maxWidth: "90%", fontFamily: "'Outfit', sans-serif", transition: "color 0.3s ease" }}>
            AI CEO runs deep research on your business and turns your data into levers pulled–for you
          </p>

          {/* URL Input */}
          <div className="hero-input-card" style={{ marginBottom: "1.5rem" }}>
            <div className="hero-input-bar" style={{ display: "flex", alignItems: "center", background: t.inputBg, borderRadius: 14, padding: "0.5rem 0.5rem 0.5rem 1rem", boxShadow: t.inputShadow, border: `1px solid ${t.inputBorder}`, height: 64, transition: "all 0.3s ease" }}>
              <Globe size={20} style={{ color: "#3399ff", opacity: 0.7, marginRight: "0.75rem", flexShrink: 0 }} className="hero-input-icon" />
              <input
                type="text"
                placeholder={placeholder || "nike.com/shoes/air-max"}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                style={{ flex: 1, border: "none", background: "transparent", fontFamily: "'Outfit', sans-serif", fontSize: "1rem", color: t.inputText, outline: "none", transition: "color 0.3s ease" }}
              />
              <button
                className="hero-analyze-btn"
                onClick={handleAnalyze}
                style={{ height: "100%", padding: "0 1.5rem", borderRadius: 10, fontSize: "1rem", whiteSpace: "nowrap" as const, background: "#3399ff", color: "#fff", border: "none", fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#2288ee"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "#3399ff"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                Analyze →
              </button>
            </div>
            <button
              className="hero-mobile-analyze"
              onClick={handleAnalyze}
              style={{ display: "none", width: "100%", padding: "0.75rem", borderRadius: 12, fontSize: "0.95rem", background: "#3399ff", color: "#fff", border: "none", fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer", marginTop: "0.75rem", alignItems: "center", justifyContent: "center" }}
            >
              Analyze →
            </button>
            <div className="hero-hint" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.5rem", fontSize: "0.85rem", color: t.hintColor, marginTop: "1rem", transition: "color 0.3s ease", flexWrap: "wrap" }}>
              <Link2 size={14} style={{ flexShrink: 0 }} />
              Link to a specific product (like "nike.com/shoes/air-max") for 10x faster results
            </div>
          </div>

          {/* Badges */}
          <div className="hero-badges" style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: t.badgeBg, backdropFilter: "blur(8px)", color: t.badgeText, padding: "0.5rem 1rem", borderRadius: 999, fontSize: "0.85rem", fontWeight: 500, border: `1px solid ${t.badgeBorder}`, transition: "all 0.3s ease" }}>
              <span className="hero-badge-dot" style={{ width: 6, height: 6, background: "#22c55e", borderRadius: "50%" }} /> No credit card
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: t.badgeBg, backdropFilter: "blur(8px)", color: t.badgeText, padding: "0.5rem 1rem", borderRadius: 999, fontSize: "0.85rem", fontWeight: 500, border: `1px solid ${t.badgeBorder}`, transition: "all 0.3s ease" }}>
              <span className="hero-badge-dot" style={{ width: 6, height: 6, background: "#3399ff", borderRadius: "50%" }} /> 15-90 seconds
            </span>
          </div>
        </div>

        {/* Right Phone */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", perspective: 1000 }} className="hero-phone-visual">
          <LightPhoneMockup />
        </div>
      </main>

      {/* Responsive Styles */}
      <style>{`
        .hero-mobile-br { display: none; }
        @media (max-width: 1024px) {
          .hero-main-flex {
            flex-direction: column !important;
            text-align: center !important;
            padding: 2rem 1rem !important;
            justify-content: center !important;
            align-items: center !important;
            gap: 2rem !important;
            min-height: calc(100dvh - 80px) !important;
          }
          .hero-left-content {
            align-items: center !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            max-width: 100% !important;
            width: 100% !important;
          }
          .hero-heading {
            text-align: center !important;
          }
          .hero-subtitle {
            text-align: center !important;
            max-width: 100% !important;
          }
          .hero-input-bar {
            width: 100% !important;
          }
          .hero-hint {
            justify-content: center !important;
            text-align: center !important;
          }
          .hero-badges {
            justify-content: center !important;
          }
          .hero-badge-dot {
            width: 4px !important;
            height: 4px !important;
          }
          .hero-phone-visual {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .hero-grain-tile {
            opacity: 0.3 !important;
            background-size: 150px 150px !important;
          }
          .hero-navbar {
            padding: 0.6rem 0.75rem !important;
          }
          .hero-logo {
            height: 30px !important;
          }
          .hero-nav-actions {
            gap: 0.5rem !important;
          }
          .hero-theme-btn {
            width: 32px !important;
            height: 32px !important;
            border-radius: 8px !important;
          }
          .hero-login-link {
            font-size: 0.75rem !important;
            padding: 0.35rem 0.8rem !important;
            border-radius: 8px !important;
          }
          .hero-cta-btn {
            padding: 0.35rem 0.7rem !important;
            font-size: 0.75rem !important;
            border-radius: 6px !important;
          }
          .hero-main-flex {
            padding: 1.5rem 1rem !important;
          }
          .hero-heading {
            font-size: 36px !important;
            margin-bottom: 0.75rem !important;
          }
          .hero-mobile-br {
            display: inline !important;
          }
          .hero-subtitle {
            font-size: 14px !important;
            margin-bottom: 1.25rem !important;
            max-width: 100% !important;
          }
          .hero-badge-dot {
            width: 4px !important;
            height: 4px !important;
            min-width: 4px !important;
            min-height: 4px !important;
            display: inline-block !important;
            padding: 0 !important;
            border-radius: 9999px !important;
            aspect-ratio: 1 / 1;
            flex-shrink: 0;
          }
          /* Card wrapper on mobile */
          .hero-input-card {
            background: rgba(255,255,255,0.65) !important;
            backdrop-filter: blur(16px) !important;
            border-radius: 20px !important;
            padding: 1rem !important;
            border: 1px solid rgba(0,0,0,0.06) !important;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08) !important;
          }
          .dark-card .hero-input-card {
            background: rgba(15,20,30,0.75) !important;
            border: 1px solid rgba(255,255,255,0.08) !important;
          }
          .dark-card .hero-input-bar {
            background: rgba(15,20,30,0.9) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
          }
          .hero-input-bar {
            height: auto !important;
            border-radius: 12px !important;
            padding: 0.75rem !important;
            box-shadow: none !important;
            border: 1px solid rgba(0,0,0,0.08) !important;
            background: rgba(255,255,255,0.5) !important;
          }
          .dark-card .hero-input-bar {
            background: rgba(255,255,255,0.06) !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
          }
          .hero-input-icon {
            display: none !important;
          }
          .hero-input-bar input {
            font-size: 0.9rem !important;
          }
          .hero-analyze-btn {
            display: none !important;
          }
          .hero-input-card::after {
            content: none;
          }
          .hero-mobile-analyze {
            display: flex !important;
          }
          .hero-hint {
            font-size: 0.65rem !important;
            margin-top: 0.75rem !important;
            justify-content: flex-start !important;
            text-align: left !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
          }
          .hero-hint svg {
            flex-shrink: 0 !important;
          }
          .hero-badges {
            flex-wrap: wrap !important;
            gap: 0.5rem !important;
            justify-content: center !important;
            margin-top: 1.5rem !important;
          }
          .hero-badges > span {
            font-size: 0.78rem !important;
            padding: 0.4rem 0.8rem !important;
          }
        }
      `}</style>
    </div>
    </>
  );
}
