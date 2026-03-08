import { 
  Zap, Brain, Users, Building2, Rocket, TrendingUp,
  Clock, Eye, Heart, DollarSign, ArrowRight, Link2,
  CheckCircle, ChevronRight, Cpu, UserCheck, BarChart3,
  Briefcase, Target, Shield
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ─────────────────────── Section wrapper ─────────────────────── */
function Section({ children, className = "", dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  return (
    <section className={`relative py-20 lg:py-28 ${dark ? "bg-card/60" : ""} ${className}`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {children}
      </div>
    </section>
  );
}

/* ─────────────────────── Autonomy loop step ─────────────────────── */
function LoopStep({ number, title, description, icon: Icon }: { number: string; title: string; description: string; icon: any }) {
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="w-px flex-1 bg-border/40 mt-2" />
      </div>
      <div className="pb-12">
        <span className="text-xs font-mono text-primary/60 tracking-wider">{number}</span>
        <h4 className="text-lg font-bold text-foreground mt-1">{title}</h4>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

/* ─────────────────────── Persona card ─────────────────────── */
function PersonaCard({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/80 p-6 hover:border-primary/30 transition-colors">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h4 className="text-lg font-bold text-foreground mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ─────────────────────── Grain card wrapper ─────────────────────── */
function GrainCard({ children, filterId, seed = 0, borderColor = "hsl(0 0% 18%)" }: { children: React.ReactNode; filterId: string; seed?: number; borderColor?: string }) {
  return (
    <div className="rounded-2xl p-7 sm:p-8 relative overflow-hidden" style={{ background: "hsl(0 0% 14%)", border: `1px solid ${borderColor}` }}>
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.8, mixBlendMode: "soft-light" }}>
        <filter id={filterId}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={4} seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─────────────────────── Business DNA scroll-swap card ─── */
function BusinessDNACard() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSecond, setShowSecond] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const trigger = window.innerHeight * 0.45;
      setShowSecond(rect.top < trigger);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: 220 }}>
      {/* Card 1 */}
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: showSecond ? 0 : 1,
          transform: showSecond ? "translateY(-30px) scale(0.97)" : "translateY(0) scale(1)",
          position: showSecond ? "absolute" : "relative",
          inset: showSecond ? 0 : undefined,
          pointerEvents: showSecond ? "none" : "auto",
        }}
      >
        <GrainCard filterId="grain-dna-1" seed={0}>
          <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#ef4444" }}>What others call "AI Automation"</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Chatbots, agents and workflows.</h3>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(0 0% 50%)" }}>Other tools connect apps to move data. That's plumbing — not leadership.</p>
        </GrainCard>
      </div>

      {/* Card 2 */}
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: showSecond ? 1 : 0,
          transform: showSecond ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
          position: showSecond ? "relative" : "absolute",
          inset: showSecond ? undefined : 0,
          pointerEvents: showSecond ? "auto" : "none",
        }}
      >
        <GrainCard filterId="grain-dna-2" seed={5} borderColor="hsl(0 0% 20%)">
          <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#3399ff" }}>What we mean by Business DNA</p>
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Every decision your company has</h3>
          <p className="text-sm leading-relaxed" style={{ color: "hsl(0 0% 50%)" }}>The way you close deals. The way you solve churn. The way you scale culture. TimeWarp learns the "Why" behind your success — and runs the company based on that intelligence.</p>
        </GrainCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                    */
/* ═══════════════════════════════════════════════════════════════════ */
export function ProductDescription() {
  const navigate = useNavigate();
  const [inputUrl, setInputUrl] = useState("");

  const handleAnalyze = () => {
    if (inputUrl.trim()) {
      navigate(`/auth?mode=signup&url=${encodeURIComponent(inputUrl.trim())}`);
    } else {
      navigate("/auth?mode=signup");
    }
  };

  return (
    <div className="relative">
      {/* Cosmic background continuation */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `
          linear-gradient(to bottom, 
            hsl(230 30% 3%) 0%, 
            hsl(228 28% 5%) 30%,
            hsl(225 25% 4%) 60%,
            hsl(230 30% 3%) 100%
          )
        `
      }} />

      {/* ── Hero headline — dark stat banner ── */}
      <section className="relative z-10 py-20 lg:py-28 overflow-hidden" style={{ background: "hsl(0 0% 10%)" }}>
        {/* Ambient light glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute rounded-full" style={{ width: 500, height: 500, left: "-10%", top: "-30%", background: "radial-gradient(circle, rgba(51,153,255,0.15) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div className="absolute rounded-full" style={{ width: 600, height: 600, right: "-15%", top: "-20%", background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)", filter: "blur(100px)" }} />
          <div className="absolute rounded-full" style={{ width: 400, height: 400, left: "50%", bottom: "-30%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(51,153,255,0.1) 0%, transparent 70%)", filter: "blur(60px)" }} />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(51,153,255,0.3) 30%, rgba(139,92,246,0.3) 70%, transparent 100%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center relative z-10">
          <p className="text-xs tracking-[0.35em] uppercase text-white/50 font-mono mb-10">AI CEO — Replacing human labor</p>
          <div className="flex items-center justify-center gap-12 sm:gap-20 lg:gap-32 mb-10">
            <div>
              <span className="text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-none">+100%</span>
              <p className="text-sm sm:text-base text-white/50 mt-3">More freedom</p>
            </div>
            <div>
              <span className="text-5xl sm:text-7xl lg:text-8xl font-bold text-white leading-none">-100%</span>
              <p className="text-sm sm:text-base text-white/50 mt-3">Less work</p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-white/50 max-w-2xl mx-auto">
            Not from hiring more employees. From <span className="font-semibold text-white">levers pulled for you</span> – built on the DNA already running through your business.
          </p>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(51,153,255,0.2) 50%, transparent 100%)" }} />
      </section>

      {/* ── Business DNA + Evolution of Labor (merged) ── */}
      <section className="relative z-10 py-24 lg:py-32" style={{ background: "hsl(0 0% 10%)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white" style={{
              left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 1.5}px`, height: `${1 + Math.random() * 1.5}px`,
              opacity: 0.08 + Math.random() * 0.12,
            }} />
          ))}
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          {/* Business DNA Title with sparkles */}
          <div className="text-center mb-16 relative">
            <div className="absolute inset-0 pointer-events-none" style={{ top: "-40px", bottom: "-40px", left: "10%", right: "10%" }}>
              {[...Array(20)].map((_, i) => (
                <div key={`sparkle-${i}`} className="absolute rounded-full" style={{
                  left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 80}%`,
                  width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`,
                  background: i % 3 === 0 ? "#3399ff" : i % 3 === 1 ? "#a78bfa" : "#ffffff",
                  opacity: 0.3 + Math.random() * 0.5,
                  boxShadow: `0 0 ${4 + Math.random() * 8}px ${i % 3 === 0 ? "rgba(51,153,255,0.6)" : i % 3 === 1 ? "rgba(167,139,250,0.6)" : "rgba(255,255,255,0.4)"}`,
                  animation: `sparkle-pulse ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite alternate`,
                }} />
              ))}
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5 relative z-10" style={{ fontFamily: "'Playfair Display', serif" }}>This is Business DNA.</h2>
            <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto relative z-10">The intelligence layer that turns your company's history into a digitalized CEO.</p>
          </div>

          {/* Business DNA comparison cards */}
          <div className="grid md:grid-cols-2 gap-5 mb-24">
            <GrainCard filterId="grain-left" seed={0}>
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#ef4444" }}>What others call "AI Automation"</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Chatbots, agents and workflows.</h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(0 0% 50%)" }}>Other tools connect apps to move data. That's plumbing — not leadership.</p>
            </GrainCard>
            <GrainCard filterId="grain-right" seed={5} borderColor="hsl(0 0% 20%)">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#3399ff" }}>What we mean by Business DNA</p>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Every decision your company has</h3>
              <p className="text-sm leading-relaxed" style={{ color: "hsl(0 0% 50%)" }}>The way you close deals. The way you solve churn. The way you scale culture. TimeWarp learns the "Why" behind your success — and runs the company based on that intelligence.</p>
            </GrainCard>
          </div>

          {/* Evolution Title */}
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Evolving manual labor.</h3>
          </div>

          {/* Evolution cards with scroll animation */}
          <EvolutionFlow />
        </div>
      </section>

      {/* ── Why the AI CEO wins ── */}
      <section className="relative z-10 py-24 lg:py-32" style={{ background: "hsl(0 0% 10%)" }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Why the AI CEO wins</h3>
            <p className="text-base sm:text-lg text-white/50 max-w-2xl mx-auto">What a human manager misses</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#ef4444" }}>TRADITIONAL CEO</p>
              <GrainCard filterId="grain-cmp-left" seed={20}>
                <div className="space-y-3">
                  {[
                    { label: "Decision Speed", value: "Days / Weeks" },
                    { label: "Context", value: "Limited to reports" },
                    { label: "Bias", value: "Emotional / Subjective" },
                    { label: "Cost", value: "$250k+ / Year" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 16%)" }}>
                      <span className="text-sm text-white/50">{item.label}</span>
                      <span className="text-sm font-medium" style={{ color: "#ef4444" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </GrainCard>
            </div>
            <div className="flex flex-col">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#22c55e" }}>TIMEWARP AI CEO</p>
              <GrainCard filterId="grain-cmp-right" seed={25} borderColor="hsl(0 0% 20%)">
                <div className="space-y-3">
                  {[
                    { label: "Decision Speed", value: "Milliseconds" },
                    { label: "Context", value: "Every data point in company history" },
                    { label: "Bias", value: "Purely ROI-driven" },
                    { label: "Cost", value: "Fractions of a salary" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3" style={{ background: "hsl(0 0% 11%)", border: "1px solid hsl(0 0% 16%)" }}>
                      <span className="text-sm text-white/50">{item.label}</span>
                      <span className="text-sm font-medium" style={{ color: "#22c55e" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </GrainCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── Autonomy Loop ── */}
      <Section className="relative z-10" dark>
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">The TimeWarp Autonomy Loop</h3>
        </div>
        <div className="max-w-xl mx-auto">
          <LoopStep number="01" title="Ingest — Business DNA" description="TimeWarp scans your files, Microsoft, financials, and SOPs to map your unique DNA." icon={Brain} />
          <LoopStep number="02" title="Deploy — The AI CEO" description="The system takes over executive functions: resource allocation, task delegation, and strategy." icon={Cpu} />
          <LoopStep number="03" title="Execute — Replace Jobs" description="Autonomous employees perform the roles of SDRs, Accountants, and Project Managers." icon={UserCheck} />
          <div className="relative flex gap-5">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <span className="text-xs font-mono text-primary/60 tracking-wider">04</span>
              <h4 className="text-lg font-bold text-foreground mt-1">UHI — Profit Distribution</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">As labor costs drop to zero, profit margins explode, enabling the shift toward Universal High Income for stakeholders.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Who is TimeWarp for? ── */}
      <Section className="relative z-10">
        <div className="text-center mb-12">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">Who is TimeWarp for?</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <PersonaCard icon={Rocket} title="Visionary Founders" description={'Founders who want to exit the "daily grind" and move toward a truly passive, autonomous enterprise.'} />
          <PersonaCard icon={TrendingUp} title="Hyper-Scale Startups" description="Companies that need to scale from $1M to $100M without the friction of hiring 200 people." />
          <PersonaCard icon={Building2} title="Efficiency-First Enterprises" description={'Legacy businesses looking to strip away the "management tax" and install a data-driven AI CEO.'} />
        </div>
      </Section>

      {/* ── Bottom CTA ── */}
      <Section className="relative z-10 text-center pb-28 lg:pb-36" dark>
        <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">See your company's autonomous future</h3>
        <p className="text-muted-foreground mb-10 text-lg">Paste your website URL. Get your Business DNA &amp; Autonomy Report in 60 seconds.</p>
        <div className="max-w-xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <input
                type="url"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://YourBusiness.com"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-card border border-border/60 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/50 transition-colors"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
            </div>
            <Button onClick={handleAnalyze} className="h-12 px-6 gap-2">
              Analyze My Business
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center gap-4 mt-5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
              <span className="text-xs text-muted-foreground">No credit card</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[#3399ff]" />
              <span className="text-xs text-muted-foreground">15-90 Seconds</span>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
