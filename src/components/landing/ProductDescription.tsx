import { Globe, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import futureCity from "@/assets/future-city.jpg";
import { useNavigate, Link } from "react-router-dom";
import ZipHowItWorks from "@/components/landing/ZipHowItWorks";
import ZipLifeAndWork from "@/components/landing/ZipLifeAndWork";

const ctaUrls = [
  "nike.com",
  "apple.com",
  "shopify.com",
  "stripe.com",
  "notion.so",
  "figma.com",
  "airbnb.com",
  "tesla.com",
];


interface ProductDescriptionProps {
  onAuthRequest?: (productUrl?: string) => void;
}

export function ProductDescription({ onAuthRequest }: ProductDescriptionProps) {
  const navigate = useNavigate();
  const [inputUrl, setInputUrl] = useState("");
  const [typewriterText, setTypewriterText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typewriter effect for bottom CTA
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
      const current = ctaUrls[ui];
      if (!deleting) {
        ci++;
        setTypewriterText(current.slice(0, ci));
        if (ci === current.length) { deleting = true; timeoutId = setTimeout(tick, pauseAfter); return; }
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        ci--;
        setTypewriterText(current.slice(0, ci));
        if (ci === 0) { deleting = false; ui = (ui + 1) % ctaUrls.length; timeoutId = setTimeout(tick, pauseBefore); return; }
        timeoutId = setTimeout(tick, deleteSpeed);
      }
    };
    timeoutId = setTimeout(tick, 600);
    return () => clearTimeout(timeoutId);
  }, [isEditing]);

  const handleAnalyze = () => {
    if (onAuthRequest) {
      onAuthRequest(inputUrl.trim() || undefined);
      return;
    }
    if (inputUrl.trim()) {
      navigate(`/auth?mode=signup&url=${encodeURIComponent(inputUrl.trim())}`);
    } else {
      navigate("/auth?mode=signup");
    }
  };

  return (
    <div className="relative">
      {/* Cosmic background — dark only */}
      <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{
        background: `linear-gradient(to bottom, hsl(230 30% 3%) 0%, hsl(228 28% 5%) 30%, hsl(225 25% 4%) 60%, hsl(230 30% 3%) 100%)`
      }} />

      {/* ── New Zip Sections ── */}
      <ZipHowItWorks />
      <ZipLifeAndWork />
      

      {/* ── Making Work Optional ── */}
      <section className="relative z-10 py-16 lg:py-32 bg-background dark:bg-[#1a1a1a]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          {/* Text */}
          <div className="space-y-4 sm:space-y-6 max-w-3xl mb-8 sm:mb-12">
            <h2
              className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground dark:text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Making work optional.
            </h2>
            <p
              className="text-base sm:text-lg text-muted-foreground dark:text-white/60 leading-relaxed"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              For centuries, human potential has been chained to the desk, bound by the necessity of economic survival. By replacing the CEO and the operational workforce with autonomous intelligence, we are accelerating the transition to a post-labor economy.
            </p>
          </div>

          {/* Full-width Image */}
          <div className="relative rounded-2xl overflow-hidden shadow-xl aspect-[4/3] sm:aspect-[16/7]">
            <img
              src={futureCity}
              alt="A futuristic city representing the post-labor economy"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-16 lg:py-32 overflow-hidden text-center bg-background dark:bg-[hsl(0_0%_10%)]">
        {/* Top glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 hidden dark:block" style={{ height: 400, top: 0, background: "radial-gradient(ellipse 80% 100% at center top, rgba(51,153,255,0.08) 0%, transparent 60%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <h3 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-3 sm:mb-4" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ready to have levers pulled?</h3>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-white/50 mb-8 sm:mb-12 max-w-xl mx-auto" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Paste your website URL.</p>

          {/* Hero-style input card */}
          <div className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-[14px] p-2 sm:p-[0.5rem_0.5rem_0.5rem_1rem] sm:h-16 bg-card border border-border dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.1)]">
              <div className="flex items-center flex-1 px-3 sm:px-0 cursor-text" onClick={() => { if (!isEditing) { setIsEditing(true); setTimeout(() => inputRef.current?.focus(), 0); } }}>
                <Globe size={20} className="text-primary opacity-70 mr-3 shrink-0" style={{ color: "#647dbf" }} />
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                    onBlur={() => { if (!inputUrl) setIsEditing(false); }}
                    placeholder="enter your url"
                    autoFocus
                    className="flex-1 border-none bg-transparent text-foreground dark:text-white placeholder:text-muted-foreground/40 dark:placeholder:text-white/30 outline-none py-3 sm:py-0"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: "1rem" }}
                  />
                ) : (
                  <span className="flex items-center flex-1 min-w-0 text-left">
                    <span className="text-[16px] font-normal whitespace-nowrap overflow-hidden text-muted-foreground dark:text-white/50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {typewriterText}
                    </span>
                    <span className="inline-block w-[2px] h-[1em] ml-[1px] align-text-bottom animate-pulse" style={{ background: "#647dbf" }} />
                  </span>
                )}
              </div>
              <button
                onClick={handleAnalyze}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2 sm:mt-0 h-12 sm:h-full flex items-center gap-2"
                style={{ padding: "0 1.5rem", borderRadius: 10, fontSize: "1rem", whiteSpace: "nowrap", border: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500, cursor: "pointer" }}>
                <span>Activate CEO</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex items-center justify-start gap-4 mt-5">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
                <span className="text-xs text-muted-foreground dark:text-white/40">No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#647dbf]" />
                <span className="text-xs text-muted-foreground dark:text-white/40">15-90 Seconds</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 bg-background dark:bg-[hsl(0_0%_10%)]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl pb-10 pt-4">
          <div className="rounded-2xl border border-border/50 dark:border-[hsl(0_0%_20%)] bg-muted/30 dark:bg-[hsl(0_0%_14%)] backdrop-blur-sm px-5 sm:px-12 py-8 sm:py-14">
            <div className="flex flex-col gap-8 sm:flex-row sm:gap-14">
              <div className="flex items-start gap-2 shrink-0">
                <img src="/favicon.png" alt="TimeWarp" className="h-10 w-10 rounded-md" />
                <span className="font-semibold text-xl text-foreground dark:text-white">TimeWarp</span>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-6 sm:gap-14 flex-1">
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground dark:text-white" style={{ fontSize: 16 }}>Product</h4>
                  <ul className="space-y-1.5">
                    <li><Link to="/pricing" className="text-muted-foreground dark:text-[hsl(0_0%_50%)] hover:text-foreground dark:hover:text-white transition-colors" style={{ fontSize: 14 }}>Pricing</Link></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground dark:text-white" style={{ fontSize: 16 }}>Resources</h4>
                  <ul className="space-y-1.5">
                    <li><Link to="/support" className="text-muted-foreground dark:text-[hsl(0_0%_50%)] hover:text-foreground dark:hover:text-white transition-colors" style={{ fontSize: 14 }}>Support</Link></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground dark:text-white" style={{ fontSize: 16 }}>Legal</h4>
                  <ul className="space-y-1.5">
                    <li><Link to="/terms" className="text-muted-foreground dark:text-[hsl(0_0%_50%)] hover:text-foreground dark:hover:text-white transition-colors" style={{ fontSize: 14 }}>Terms of Service</Link></li>
                    <li><Link to="/privacy" className="text-muted-foreground dark:text-[hsl(0_0%_50%)] hover:text-foreground dark:hover:text-white transition-colors" style={{ fontSize: 14 }}>Privacy Policy</Link></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground dark:text-white" style={{ fontSize: 16 }}>Community</h4>
                  <ul className="space-y-1.5">
                    <li><a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="text-muted-foreground dark:text-[hsl(0_0%_50%)] hover:text-foreground dark:hover:text-white transition-colors" style={{ fontSize: 14 }}>Discord</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-10 pt-5 border-t border-border/30 dark:border-[hsl(0_0%_20%)]">
              <p className="text-muted-foreground dark:text-[hsl(0_0%_50%)] text-center sm:text-left" style={{ fontSize: 14 }}>© 2026 Vincent Ackermann, All rights reserved</p>
              <p className="text-muted-foreground dark:text-[hsl(0_0%_50%)]" style={{ fontSize: 14 }}>🇸🇪 Made in Sweden</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
