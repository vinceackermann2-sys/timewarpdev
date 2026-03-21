import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Link2 } from "lucide-react";

export function HeroSection() {
  const navigate = useNavigate();
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
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [url]);

  const handleAnalyze = () => {
    navigate("/auth?mode=signup");
  };

  return (
    <section className="orb-hero">
      {/* Background */}
      <div className="orb-hero__bg-base" />

      {/* Grain overlay */}
      <svg className="orb-hero__grain" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <filter id="heroGrain">
          <feTurbulence type="fractalNoise" baseFrequency="0.88" numOctaves={4} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#heroGrain)" opacity="0.3" />
      </svg>

      {/* Orb Stage */}
      <div className="orb-hero__stage">
        <div className="orb-hero__wrapper">
          {/* Glow aura */}
          <div className="orb-hero__glow-aura" />

          {/* Silver connectors */}
          <div className="orb-hero__connectors">
            <div className="orb-hero__connector orb-hero__connector--1" />
            <div className="orb-hero__connector orb-hero__connector--2" />
          </div>

          {/* Main orb sphere */}
          <div className="orb-hero__sphere" />
        </div>

        {/* Content overlay on the orb */}
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
            <button className="orb-hero__btn" onClick={handleAnalyze}>
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
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          background: linear-gradient(180deg, #eef4ff 0%, #cde0ff 45%, #90b8ff 100%);
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .orb-hero__bg-base {
          position: absolute;
          inset: 0;
          z-index: 0;
          background:
            radial-gradient(ellipse 80% 40% at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 60%),
            radial-gradient(ellipse 60% 30% at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%),
            radial-gradient(ellipse 60% 30% at 80% 50%, rgba(255,255,255,0.15) 0%, transparent 50%);
        }

        .orb-hero__grain {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          mix-blend-mode: soft-light;
          opacity: 0.3;
        }

        /* ── Orb sizing ── */
        .orb-hero__stage {
          --sz: min(105vw, 1160px);
          position: absolute;
          bottom: 0;
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
          top: calc(var(--sz) * 0.08);
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
          background: radial-gradient(circle, rgba(133,176,255,0.30) 0%, transparent 70%);
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
            conic-gradient(from 0deg, transparent 0%, rgba(180,180,200,0.30) 6%, rgba(200,200,220,0.60) 10%, rgba(220,220,240,0.90) 14%, rgba(255,255,255,1.00) 18%, rgba(220,220,240,0.90) 22%, rgba(200,200,220,0.60) 26%, rgba(180,180,200,0.30) 30%, transparent 34%, transparent 100%) border-box;
          animation: orb-edge-rotate 12s linear infinite;
        }

        .orb-hero__connector--2 {
          inset: calc(var(--sz) * -0.012);
          border-width: calc(var(--sz) * 0.022);
          border-radius: 51% 49% 49% 51% / 49% 51% 50% 50%;
          background:
            linear-gradient(transparent, transparent) padding-box,
            conic-gradient(from 180deg, transparent 0%, rgba(180,180,200,0.30) 6%, rgba(200,200,220,0.60) 10%, rgba(220,220,240,0.90) 14%, rgba(255,255,255,1.00) 18%, rgba(220,220,240,0.90) 22%, rgba(200,200,220,0.60) 26%, rgba(180,180,200,0.30) 30%, transparent 34%, transparent 100%) border-box;
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
            rgba(255,255,255,1) 0%,
            rgba(209,227,255,1) 20%,
            rgba(133,176,255,1) 50%,
            rgba(90,148,255,1) 100%
          );
          box-shadow:
            inset -10px -10px 30px rgba(0,0,0,0.10),
            inset 10px 10px 30px rgba(255,255,255,0.80),
            0 0 120px rgba(133,176,255,0.30);
        }

        /* ── Content overlay ── */
        .orb-hero__content {
          position: absolute;
          z-index: 20;
          top: 46%;
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
          color: #0d1420;
          margin: 0;
          white-space: nowrap;
        }

        .orb-hero__content h1 span {
          background: linear-gradient(135deg, #3399ff 0%, #1a6fd4 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .orb-hero__content p {
          font-size: 19px;
          font-weight: 400;
          color: #5a6a80;
          margin: 0;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }

        .orb-hero__input {
          display: flex;
          align-items: center;
          background: rgba(255,255,255,0.84);
          backdrop-filter: blur(20px);
          border-radius: 22px;
          padding: 14px 14px 14px 26px;
          box-shadow: 0 8px 48px rgba(51,153,255,0.20), 0 2px 10px rgba(0,0,0,0.08);
          width: 100%;
        }

        .orb-hero__url-icon {
          width: 22px;
          height: 22px;
          margin-right: 14px;
          flex-shrink: 0;
          color: #a8c4f0;
        }

        .orb-hero__input input {
          flex: 1;
          border: none;
          outline: none;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 16px;
          font-weight: 400;
          color: #6a7a90;
          background: transparent;
          min-width: 0;
          caret-color: #3399ff;
          white-space: nowrap;
          overflow: hidden;
        }

        .orb-hero__btn {
          flex-shrink: 0;
          padding: 13px 22px;
          border-radius: 15px;
          background: linear-gradient(135deg, #5bbfff, #3399ff);
          color: #fff;
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          border: none;
          cursor: pointer;
          box-shadow: 0 3px 14px rgba(51,153,255,0.38);
          transition: transform 0.15s, box-shadow 0.15s;
          white-space: nowrap;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .orb-hero__btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(51,153,255,0.48);
        }

        .orb-hero__btn:active {
          transform: scale(0.97);
        }

        /* ── Animations ── */
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

        /* ── Mobile ── */
        @media (max-width: 640px) {
          .orb-hero__stage {
            --sz: min(160vw, 900px);
          }
          .orb-hero__content {
            width: clamp(280px, 85vw, 500px);
            gap: 12px;
          }
          .orb-hero__content h1 {
            font-size: clamp(28px, 7vw, 44px);
          }
          .orb-hero__content p {
            font-size: 15px;
          }
          .orb-hero__input {
            padding: 10px 10px 10px 18px;
            border-radius: 16px;
          }
          .orb-hero__btn {
            padding: 10px 16px;
            font-size: 13px;
            border-radius: 12px;
          }
          .orb-hero__url-icon {
            width: 18px;
            height: 18px;
            margin-right: 10px;
          }
          .orb-hero__input input {
            font-size: 14px;
          }
        }
      `}</style>
    </section>
  );
}
