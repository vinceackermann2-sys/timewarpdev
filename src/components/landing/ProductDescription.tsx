import { Globe, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import ZipHowItWorks from "@/components/landing/ZipHowItWorks";
import ZipLifeAndWork from "@/components/landing/ZipLifeAndWork";
import ZipGreaterGood from "@/components/landing/ZipGreaterGood";

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

export function ProductDescription() {
  const navigate = useNavigate();
  const [typewriterText, setTypewriterText] = useState("");

  // Typewriter effect
  useEffect(() => {
    let ui = 0;
    let ci = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const typeSpeed = 52;
    const deleteSpeed = 28;
    const pauseAfter = 1600;
    const pauseBefore = 320;

    const tick = () => {
      const url = urls[ui];
      if (!deleting) {
        ci++;
        setTypewriterText(url.slice(0, ci));
        if (ci === url.length) {
          deleting = true;
          timeoutId = setTimeout(tick, pauseAfter);
          return;
        }
        timeoutId = setTimeout(tick, typeSpeed);
      } else {
        ci--;
        setTypewriterText(url.slice(0, ci));
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
  }, []);

  const handleActivate = () => {
    navigate("/auth?mode=signup");
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
      <ZipGreaterGood />

      {/* ── Bottom CTA — Orb Style ── */}
      <section
        className="relative z-10 overflow-hidden bg-background"
        style={{ height: "100vh" }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 z-0"
          style={{
            background: "radial-gradient(ellipse 150% 100% at 50% 100%, hsl(var(--primary)) 0%, hsl(var(--background)) 70%)",
          }}
        />

        {/* Orb Stage */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[50%] z-40"
          style={{ width: "min(200vw, 2400px)", height: "min(200vw, 2400px)" }}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
            style={{
              top: "calc(min(200vw, 2400px) * 0.08)",
              width: "min(200vw, 2400px)",
              height: "min(200vw, 2400px)",
            }}
          >
            {/* Glow Aura */}
            <div
              className="absolute rounded-full animate-pulse-slow"
              style={{
                inset: "calc(min(200vw, 2400px) * -0.25)",
                background: "radial-gradient(circle, var(--orb-glow) 0%, transparent 70%)",
              }}
            />

            {/* Connectors */}
            <div className="absolute inset-0">
              <div
                className="silver-connector silver-connector-1"
                style={{
                  inset: "calc(min(200vw, 2400px) * -0.012)",
                  borderWidth: "calc(min(200vw, 2400px) * 0.022)",
                }}
              />
              <div
                className="silver-connector silver-connector-2"
                style={{
                  inset: "calc(min(200vw, 2400px) * -0.012)",
                  borderWidth: "calc(min(200vw, 2400px) * 0.022)",
                }}
              />
            </div>

            {/* Main Orb */}
            <div
              className="orb-container orb-core relative rounded-full overflow-hidden z-10 flex items-center justify-center"
              style={{
                width: "min(200vw, 2400px)",
                height: "min(200vw, 2400px)",
                minWidth: "min(200vw, 2400px)",
                minHeight: "min(200vw, 2400px)",
              }}
            >
              {/* Content inside Orb */}
              <div
                className="absolute z-20 flex flex-col items-center justify-center text-center"
                style={{
                  top: "22%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "clamp(320px, 90%, 800px)",
                }}
              >
                <div className="flex flex-col items-center gap-8 w-fit max-w-full">
                  {/* Top Text */}
                  <div className="flex flex-col items-center gap-4 w-full">
                    <h3
                      className="font-extrabold tracking-[-0.03em] leading-none text-foreground dark:text-black m-0"
                      style={{
                        fontSize: "clamp(40px, 5vw, 64px)",
                        fontFamily: "'Playfair Display', serif",
                      }}
                    >
                      Get to know your company's next decision
                    </h3>
                    <p className="text-[19px] font-normal text-muted-foreground dark:text-[#5a6a80] m-0 tracking-[0.01em]">
                      Paste your website URL. Get your Business DNA in 60 seconds.
                    </p>
                  </div>

                  {/* Bottom Input */}
                  <div className="flex flex-col items-start gap-4 w-full">
                    {/* Input Area */}
                    <div className="flex items-center bg-background/80 dark:bg-white/84 backdrop-blur-[20px] rounded-[22px] p-[14px_14px_14px_26px] w-full shadow-[0_8px_48px_rgba(51,153,255,0.20),0_2px_10px_rgba(0,0,0,0.08)]">
                      <Globe className="w-[22px] h-[22px] mr-[14px] shrink-0 text-primary/50" />

                      <span className="flex items-center flex-1 min-w-0 text-left">
                        <span className="text-[16px] font-normal text-muted-foreground whitespace-nowrap overflow-hidden">
                          {typewriterText}
                        </span>
                        <span className="inline-block w-[2px] h-[1em] bg-primary ml-[1px] align-text-bottom animate-blink" />
                      </span>

                      <button
                        onClick={handleActivate}
                        className="btn-gradient shrink-0 px-[22px] py-[13px] rounded-[15px] text-white font-bold text-[15px] border-none cursor-pointer transition-all duration-150 whitespace-nowrap flex items-center gap-[7px] active:scale-95"
                      >
                        Activate CEO
                        <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Glass Card Bullet Points */}
                    <div className="flex items-center self-start gap-5 bg-background/30 dark:bg-white/30 backdrop-blur-md border border-background/60 dark:border-white/60 rounded-full px-4 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[14px] font-medium text-muted-foreground dark:text-[#5a6a80]">No credit card</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span className="text-[14px] font-medium text-muted-foreground dark:text-[#5a6a80]">15-90 seconds</span>
                      </div>
                    </div>
                  </div>
                </div>
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
                    <li><Link to="/" className="text-muted-foreground dark:text-[hsl(0_0%_50%)] hover:text-foreground dark:hover:text-white transition-colors" style={{ fontSize: 14 }}>AI-CEO</Link></li>
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
