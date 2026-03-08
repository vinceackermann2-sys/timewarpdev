import { 
  Zap, Brain, Users, Building2, Rocket, TrendingUp,
  Clock, Eye, Heart, DollarSign, ArrowRight, Link2, Globe,
  CheckCircle, ChevronRight, Cpu, UserCheck, BarChart3,
  Briefcase, Target, Shield
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/* ─────────────────────── Grain card wrapper ─────────────────────── */
function GrainCard({ children, filterId, seed = 0 }: { children: React.ReactNode; filterId: string; seed?: number }) {
  return (
    <div className="rounded-2xl p-7 sm:p-8 relative overflow-hidden bg-card border border-border">
      <svg className="absolute inset-0 w-full h-full pointer-events-none dark:opacity-80 opacity-30" style={{ mixBlendMode: "soft-light" }}>
        <filter id={filterId}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={4} seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─────────────────────── Business DNA auto-swap card ─── */
function BusinessDNACard() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeCard, setActiveCard] = useState(0);
  const [hasEntered, setHasEntered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasEntered) {
          setHasEntered(true);
          timerRef.current = setTimeout(() => setActiveCard(1), 2800);
        }
      },
      { threshold: 0.5 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasEntered]);

  return (
    <div ref={sectionRef} className="relative z-20 py-24 lg:py-32 bg-background">
      {/* Sparkles — dark only */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden dark:block hidden">
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>This is Business DNA.</h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">The intelligence layer that turns your company's history into a digitalized CEO.</p>
        </div>

        {/* Card container */}
        <div className="relative max-w-2xl mx-auto" style={{ minHeight: 200 }}>
          {/* Card 1 */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: activeCard === 0 ? 1 : 0,
              transform: activeCard === 0 ? "translateY(0) scale(1)" : "translateY(-30px) scale(0.97)",
              position: activeCard === 0 ? "relative" : "absolute",
              inset: activeCard === 0 ? undefined : 0,
              pointerEvents: activeCard === 0 ? "auto" : "none",
            }}
          >
            <GrainCard filterId="grain-dna-1" seed={0}>
              <p className="text-xs tracking-[0.2em] uppercase mb-4 text-destructive">What others call "AI Automation"</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Chatbots, agents and workflows.</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">Other tools connect apps to move data. That's plumbing — not leadership.</p>
            </GrainCard>
          </div>

          {/* Card 2 */}
          <div
            className="transition-all duration-700 ease-out"
            style={{
              opacity: activeCard === 1 ? 1 : 0,
              transform: activeCard === 1 ? "translateY(0) scale(1)" : "translateY(30px) scale(0.97)",
              position: activeCard === 1 ? "relative" : "absolute",
              inset: activeCard === 1 ? undefined : 0,
              pointerEvents: activeCard === 1 ? "auto" : "none",
            }}
          >
            <GrainCard filterId="grain-dna-2" seed={5}>
              <p className="text-xs tracking-[0.2em] uppercase mb-4 text-primary">What we mean by Business DNA</p>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Every decision your company has</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">The way you close deals. The way you solve churn. The way you scale culture. TimeWarp learns the "Why" behind your success — and runs the company based on that intelligence.</p>
            </GrainCard>
          </div>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-3 mt-8">
          {[0, 1].map(i => (
            <div
              key={i}
              className="rounded-full transition-all duration-500"
              style={{
                width: activeCard === i ? 24 : 8,
                height: 8,
                background: activeCard === i ? "#3399ff" : "hsl(var(--muted))",
                boxShadow: activeCard === i ? "0 0 12px rgba(51,153,255,0.5)" : "none",
              }}
            />
          ))}
        </div>
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
      {/* Cosmic background — dark only */}
      <div className="absolute inset-0 pointer-events-none dark:block hidden" style={{
        background: `linear-gradient(to bottom, hsl(230 30% 3%) 0%, hsl(228 28% 5%) 30%, hsl(225 25% 4%) 60%, hsl(230 30% 3%) 100%)`
      }} />

      {/* ── Hero headline — stat banner ── */}
      <section className="relative z-10 py-20 lg:py-28 overflow-hidden bg-background">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        {/* Bottom light glow — dark only */}
        <div className="absolute pointer-events-none dark:block hidden" style={{ width: 600, height: 300, bottom: 0, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(ellipse at center bottom, rgba(51,153,255,0.12) 0%, rgba(51,153,255,0.04) 40%, transparent 70%)", filter: "blur(40px)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center relative z-10">
          <p className="text-xs tracking-[0.35em] uppercase text-muted-foreground font-mono mb-10">AI CEO — Replacing human labor</p>
          <div className="flex items-center justify-center gap-12 sm:gap-20 lg:gap-32 mb-10">
            <div>
              <span className="text-5xl sm:text-7xl lg:text-8xl font-bold text-foreground leading-none">+100%</span>
              <p className="text-sm sm:text-base text-muted-foreground mt-3">More freedom</p>
            </div>
            <div>
              <span className="text-5xl sm:text-7xl lg:text-8xl font-bold text-foreground leading-none">-100%</span>
              <p className="text-sm sm:text-base text-muted-foreground mt-3">Less work</p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
            Not from hiring more employees. From <span className="font-semibold text-foreground">levers pulled for you</span> – built on the DNA already running through your business.
          </p>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </section>

      {/* ── Business DNA — full-screen sticky scroll-swap ── */}
      <BusinessDNACard />

      {/* ── Evolution of Labor ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden bg-background">
        {/* Bottom glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 dark:block hidden" style={{ height: 500, bottom: -100, background: "radial-gradient(ellipse 100% 80% at center bottom, rgba(51,153,255,0.14) 0%, rgba(51,153,255,0.06) 30%, transparent 70%)" }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Evolving manual labor.</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <GrainCard filterId="grain-evo-0" seed={10}>
              <div className="space-y-5">
                <p className="text-xs tracking-[0.2em] uppercase text-destructive">The old way: Hiring humans for every role</p>
                <ul className="space-y-3">
                  {["High churn, high cost, and human error.", 'Scaling requires more "managed" hours.', "Knowledge walks out the door when an employee leaves."].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground/50" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-semibold text-muted-foreground">
                    The Ceiling: <span className="italic">You can only grow as fast as you can hire.</span>
                  </p>
                </div>
              </div>
            </GrainCard>
            <GrainCard filterId="grain-evo-1" seed={15}>
              <div className="space-y-5">
                <p className="text-xs tracking-[0.2em] uppercase text-primary">The TimeWarp way: Replacing all jobs</p>
                <ul className="space-y-3">
                  {["Infinite scale with zero headcount increase.", "The AI CEO manages specialized employees that never sleep.", "Your Business DNA is preserved and perfected forever."].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-border">
                  <p className="text-sm font-semibold text-muted-foreground">
                    The Reality: <span className="italic">Universal High Income (UHI) powered by autonomous productivity.</span>
                  </p>
                </div>
              </div>
            </GrainCard>
          </div>
        </div>
      </section>

      {/* ── Why the AI CEO wins ── */}
      <section className="relative z-10 py-24 lg:py-32 bg-muted/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Why the AI CEO wins</h3>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">What a human manager misses</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex flex-col">
              <p className="text-xs tracking-[0.2em] uppercase mb-4 text-destructive">TRADITIONAL CEO</p>
              <GrainCard filterId="grain-cmp-left" seed={20}>
                <div className="space-y-3">
                  {[
                    { label: "Decision Speed", value: "Days / Weeks" },
                    { label: "Context", value: "Limited to reports" },
                    { label: "Bias", value: "Emotional / Subjective" },
                    { label: "Cost", value: "$250k+ / Year" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 bg-background border border-border">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-destructive">{item.value}</span>
                    </div>
                  ))}
                </div>
              </GrainCard>
            </div>
            <div className="flex flex-col">
              <p className="text-xs tracking-[0.2em] uppercase mb-4 text-status-success">TIMEWARP AI CEO</p>
              <GrainCard filterId="grain-cmp-right" seed={25}>
                <div className="space-y-3">
                  {[
                    { label: "Decision Speed", value: "Milliseconds" },
                    { label: "Context", value: "Every data point in company history" },
                    { label: "Bias", value: "Purely ROI-driven" },
                    { label: "Cost", value: "Fractions of a salary" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 bg-background border border-border">
                      <span className="text-sm text-muted-foreground">{item.label}</span>
                      <span className="text-sm font-medium text-status-success">{item.value}</span>
                    </div>
                  ))}
                </div>
              </GrainCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── Autonomy Loop ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden bg-background">
        {/* Bottom glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 dark:block hidden" style={{ height: 500, bottom: -100, background: "radial-gradient(ellipse 100% 80% at center bottom, rgba(51,153,255,0.14) 0%, rgba(51,153,255,0.06) 30%, transparent 70%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>The TimeWarp Autonomy Loop</h3>
          </div>
          <div className="max-w-xl mx-auto">
            {[
              { number: "01", title: "Ingest — Business DNA", description: "TimeWarp scans digital footprint, and defines a business dna.", icon: Brain },
              { number: "02", title: "Deploy — The AI CEO", description: "The system takes over executive functions: resource allocation, task delegation, and strategy.", icon: Cpu },
              { number: "03", title: "Execute — Replace Jobs", description: "Autonomous employees perform the roles of SDRs, Accountants, and Project Managers.", icon: UserCheck },
            ].map((step, i) => (
              <div key={i} className="relative flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="w-px flex-1 mt-2 bg-border" />
                </div>
                <div className="pb-12">
                  <span className="text-xs font-mono tracking-wider text-primary/50">{step.number}</span>
                  <h4 className="text-lg font-bold text-foreground mt-1">{step.title}</h4>
                  <p className="text-sm mt-2 leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
            {/* Last step — no connecting line */}
            <div className="relative flex gap-5">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/15 border border-primary/30">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <span className="text-xs font-mono tracking-wider text-primary/50">04</span>
                <h4 className="text-lg font-bold text-foreground mt-1">UHI — Profit Distribution</h4>
                <p className="text-sm mt-2 leading-relaxed text-muted-foreground">As labor costs drop to zero, profit margins explode, enabling the shift toward Universal High Income for stakeholders.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who is TimeWarp for? ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden bg-background">
        {/* Ambient glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 dark:block hidden" style={{ height: 400, bottom: 0, background: "radial-gradient(ellipse 80% 100% at center bottom, rgba(120,80,220,0.12) 0%, rgba(51,153,255,0.06) 40%, transparent 70%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <div className="text-center mb-6">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Who is TimeWarp for?</h3>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">If you've ever said "Why is my business not growing faster?" — Then this is for you.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-14 max-w-4xl mx-auto">
            {[
              { title: "Visionary Founders", description: 'Founders who want to exit the "daily grind" and move toward a truly passive, autonomous enterprise.' },
              { title: "Hyper-Scale Startups", description: "Companies that need to scale from $1M to $100M without the friction of hiring 200 people." },
              { title: "Efficiency-First Enterprises", description: 'Legacy businesses looking to strip away the "management tax" and install a data-driven AI CEO.' },
              { title: "Solo Operators & Small Teams", description: "Entrepreneurs running lean who want enterprise-level execution without enterprise-level headcount." },
            ].map((card, i) => (
              <div
                key={i}
                className="rounded-2xl p-7 sm:p-8 transition-colors bg-card border border-border hover:border-primary/30"
              >
                <h4 className="text-lg font-bold text-foreground mb-3">{card.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden text-center bg-background">
        {/* Top glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 dark:block hidden" style={{ height: 400, top: 0, background: "radial-gradient(ellipse 80% 100% at center top, rgba(51,153,255,0.08) 0%, transparent 60%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>See your company's autonomous future</h3>
          <p className="text-base text-muted-foreground mb-12 max-w-xl mx-auto">Paste your website URL. Get your Business DNA &amp; Autonomy Report in 60 seconds.</p>

          {/* Hero-style input card */}
          <div className="max-w-xl mx-auto">
            <div className="flex items-center rounded-[14px] p-[0.5rem_0.5rem_0.5rem_1rem] h-16 bg-card border border-border shadow-md">
              <Globe size={20} className="text-primary opacity-70 mr-3 shrink-0" />
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://YourBusiness.com"
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="flex-1 border-none bg-transparent text-foreground placeholder:text-muted-foreground/40 outline-none"
                style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1rem" }}
              />
              <button
                onClick={handleAnalyze}
                className="h-full shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                style={{ padding: "0 1.5rem", borderRadius: 10, fontSize: "1rem", whiteSpace: "nowrap", border: "none", fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer" }}
              >
                Analyze →
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-5">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-status-success" />
                <span className="text-xs text-muted-foreground">No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">15-90 Seconds</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
