import { 
  Zap, Brain, Users, Building2, Rocket, TrendingUp,
  Clock, Eye, Heart, DollarSign, ArrowRight, Link2, Globe,
  CheckCircle, ChevronRight, Cpu, UserCheck, BarChart3,
  Briefcase, Target, Shield
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";


/* ─────────────────────── Grain card wrapper ─────────────────────── */
function GrainCard({ children, filterId, seed = 0 }: { children: React.ReactNode; filterId: string; seed?: number }) {
  const isMobile = useIsMobile();
  return (
    <div className="rounded-2xl p-7 sm:p-8 relative overflow-hidden bg-card border border-border dark:bg-[hsl(0_0%_14%)] dark:border-[hsl(0_0%_20%)]">
      {!isMobile && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-80" style={{ mixBlendMode: "soft-light" }}>
          <filter id={filterId}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={4} seed={seed} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
          <rect width="100%" height="100%" filter={`url(#${filterId})`} />
        </svg>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─────────────────────── Business DNA side-by-side cards ─── */
function BusinessDNACard() {
  return (
    <div className="relative z-20 py-24 lg:py-32 bg-background dark:bg-[hsl(0_0%_10%)]">
      {/* Top glow — received from stat section above */}
      <div className="absolute pointer-events-none dark:opacity-100 opacity-40" style={{ width: "100%", height: 300, top: -100, left: 0, background: "radial-gradient(ellipse 50% 100% at center top, rgba(51,153,255,0.08) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)", filter: "blur(50px)" }} />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
        <div className="text-center mb-10">
          <div className="relative inline-block px-8 py-4">
            {/* Sparkles — behind heading only, both light and dark */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden hidden sm:block">
              {[...Array(12)].map((_, i) => (
                <div key={`sparkle-${i}`} className="absolute rounded-full" style={{
                  left: `${5 + Math.random() * 90}%`, top: `${5 + Math.random() * 90}%`,
                  width: `${2 + Math.random() * 3}px`, height: `${2 + Math.random() * 3}px`,
                  background: i % 3 === 0 ? "#3399ff" : i % 3 === 1 ? "#a78bfa" : "#94a3b8",
                  opacity: 0.3 + Math.random() * 0.5,
                  boxShadow: `0 0 ${4 + Math.random() * 8}px ${i % 3 === 0 ? "rgba(51,153,255,0.6)" : i % 3 === 1 ? "rgba(167,139,250,0.6)" : "rgba(148,163,184,0.4)"}`,
                  animation: `sparkle-pulse ${1.5 + Math.random() * 2}s ease-in-out ${Math.random() * 2}s infinite alternate`,
                }} />
              ))}
            </div>
            <h2 className="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white" style={{ fontFamily: "'Playfair Display', serif" }}>This is Business DNA.</h2>
          </div>
          <p className="text-base sm:text-lg text-muted-foreground dark:text-white/50 max-w-2xl mx-auto mt-5">The intelligence layer that turns your company's history into a digitalized CEO.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Card 1 */}
          <GrainCard filterId="grain-dna-1" seed={0}>
            <p className="text-xs tracking-[0.2em] uppercase mb-4 text-destructive" style={{ color: "#ef4444" }}>What others call "AI Automation"</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white mb-4">Chatbots, agents and workflows.</h3>
            <p className="text-sm leading-relaxed text-muted-foreground dark:text-[hsl(0_0%_50%)]">Other tools connect apps to move data. That's plumbing — not leadership.</p>
          </GrainCard>

          {/* Card 2 */}
          <GrainCard filterId="grain-dna-2" seed={5}>
            <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#3399ff" }}>What we mean by Business DNA</p>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground dark:text-white mb-4">Every decision your company has</h3>
            <p className="text-sm leading-relaxed text-muted-foreground dark:text-[hsl(0_0%_50%)]">The way you close deals. The way you solve churn. The way you scale culture. TimeWarp learns the "Why" behind your success — and runs the company based on that intelligence.</p>
          </GrainCard>
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
      <div className="absolute inset-0 pointer-events-none hidden dark:block" style={{
        background: `linear-gradient(to bottom, hsl(230 30% 3%) 0%, hsl(228 28% 5%) 30%, hsl(225 25% 4%) 60%, hsl(230 30% 3%) 100%)`
      }} />

      {/* ── Hero headline — stat banner ── */}
      <section className="relative z-10 py-20 lg:py-28 overflow-hidden bg-background dark:bg-[hsl(0_0%_10%)]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(51,153,255,0.3) 30%, rgba(139,92,246,0.3) 70%, transparent 100%)" }} />
        {/* Bottom light glow — fades into next section */}
        <div className="absolute pointer-events-none" style={{ width: "100%", height: 400, bottom: -200, left: 0, background: "radial-gradient(ellipse 60% 100% at center top, rgba(51,153,255,0.10) 0%, rgba(51,153,255,0.04) 40%, transparent 70%)", filter: "blur(50px)" }} />
        <div className="absolute pointer-events-none dark:opacity-100 opacity-40" style={{ width: 700, height: 350, bottom: -150, left: "50%", transform: "translateX(-50%)", background: "radial-gradient(ellipse at center, rgba(139,92,246,0.08) 0%, rgba(51,153,255,0.06) 30%, transparent 70%)", filter: "blur(60px)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl text-center relative z-10">
          <p className="text-xs tracking-[0.35em] uppercase text-muted-foreground dark:text-white/50 font-mono mb-10">AI CEO — Replacing human labor</p>
          <div className="flex items-center justify-center gap-6 sm:gap-20 lg:gap-32 mb-10">
            <div>
              <span className="text-3xl sm:text-5xl lg:text-8xl font-bold text-foreground dark:text-white leading-none">+100%</span>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-white/50 mt-3">More freedom</p>
            </div>
            <div>
              <span className="text-3xl sm:text-5xl lg:text-8xl font-bold text-foreground dark:text-white leading-none">-100%</span>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-white/50 mt-3">Less work</p>
            </div>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-white/50 max-w-2xl mx-auto">
            Not from hiring more employees. From <span className="font-semibold text-foreground dark:text-white">levers pulled for you</span> – built on the DNA already running through your business.
          </p>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(51,153,255,0.2) 50%, transparent 100%)" }} />
      </section>

      {/* ── Business DNA ── */}
      <BusinessDNACard />

      {/* ── Evolution of Labor ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden bg-background dark:bg-[hsl(0_0%_10%)]">
        {/* Bottom glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 hidden dark:block" style={{ height: 500, bottom: -100, background: "radial-gradient(ellipse 100% 80% at center bottom, rgba(51,153,255,0.14) 0%, rgba(51,153,255,0.06) 30%, transparent 70%)" }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Evolving manual labor.</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <GrainCard filterId="grain-evo-0" seed={10}>
              <div className="space-y-5">
                <p className="text-xs tracking-[0.2em] uppercase" style={{ color: "#ef4444" }}>The old way: Hiring humans for every role</p>
                <ul className="space-y-3">
                  {["High churn, high cost, and human error.", 'Scaling requires more "managed" hours.', "Knowledge walks out the door when an employee leaves."].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground dark:text-[hsl(0_0%_50%)]">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 bg-muted-foreground/50 dark:bg-[hsl(0_0%_35%)]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-border dark:border-[hsl(0_0%_20%)]">
                  <p className="text-sm font-semibold text-muted-foreground dark:text-[hsl(0_0%_50%)]">
                    The Ceiling: <span className="italic">You can only grow as fast as you can hire.</span>
                  </p>
                </div>
              </div>
            </GrainCard>
            <GrainCard filterId="grain-evo-1" seed={15}>
              <div className="space-y-5">
                <p className="text-xs tracking-[0.2em] uppercase" style={{ color: "#3399ff" }}>The TimeWarp way: Replacing all jobs</p>
                <ul className="space-y-3">
                  {["Infinite scale with zero headcount increase.", "The AI CEO manages specialized employees that never sleep.", "Your Business DNA is preserved and perfected forever."].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground dark:text-[hsl(0_0%_50%)]">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ background: "#3399ff" }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="pt-3 border-t border-border dark:border-[hsl(0_0%_20%)]">
                  <p className="text-sm font-semibold text-muted-foreground dark:text-[hsl(0_0%_50%)]">
                    The Reality: <span className="italic">Universal High Income (UHI) powered by autonomous productivity.</span>
                  </p>
                </div>
              </div>
            </GrainCard>
          </div>
        </div>
      </section>

      {/* ── Why the AI CEO wins ── */}
      <section className="relative z-10 py-24 lg:py-32 bg-muted/30 dark:bg-[#1D1D1D]">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-5" style={{ fontFamily: "'Playfair Display', serif" }}>Why the AI CEO wins</h3>
            <p className="text-base sm:text-lg text-muted-foreground dark:text-white/50 max-w-2xl mx-auto">What a human manager misses</p>
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
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 bg-background border border-border dark:bg-[hsl(0_0%_11%)] dark:border-[hsl(0_0%_16%)]">
                      <span className="text-sm text-muted-foreground dark:text-white/50">{item.label}</span>
                      <span className="text-sm font-medium" style={{ color: "#ef4444" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </GrainCard>
            </div>
            <div className="flex flex-col">
              <p className="text-xs tracking-[0.2em] uppercase mb-4" style={{ color: "#22c55e" }}>TIMEWARP AI CEO</p>
              <GrainCard filterId="grain-cmp-right" seed={25}>
                <div className="space-y-3">
                  {[
                    { label: "Decision Speed", value: "Milliseconds" },
                    { label: "Context", value: "Every data point in company history" },
                    { label: "Bias", value: "Purely ROI-driven" },
                    { label: "Cost", value: "Fractions of a salary" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 bg-background border border-border dark:bg-[hsl(0_0%_11%)] dark:border-[hsl(0_0%_16%)]">
                      <span className="text-sm text-muted-foreground dark:text-white/50">{item.label}</span>
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
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden bg-background dark:bg-[hsl(0_0%_10%)]">
        {/* Bottom glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 hidden dark:block" style={{ height: 500, bottom: -100, background: "radial-gradient(ellipse 100% 80% at center bottom, rgba(51,153,255,0.14) 0%, rgba(51,153,255,0.06) 30%, transparent 70%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <div className="text-center mb-16">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>The TimeWarp Autonomy Loop</h3>
          </div>
          <div className="max-w-xl mx-auto">
            {[
              { number: "01", title: "Ingest — Business DNA", description: "TimeWarp scans digital footprint, and defines a business dna.", icon: Brain },
              { number: "02", title: "Deploy — The AI CEO", description: "The system takes over executive functions: resource allocation, task delegation, and strategy.", icon: Cpu },
              { number: "03", title: "Execute — Replace Jobs", description: "Autonomous employees perform the roles of SDRs, Accountants, and Project Managers.", icon: UserCheck },
            ].map((step, i) => (
              <div key={i} className="relative flex gap-5">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20" style={{ background: "rgba(51,153,255,0.1)", borderColor: "rgba(51,153,255,0.2)" }}>
                    <step.icon className="h-5 w-5 text-primary" style={{ color: "#3399ff" }} />
                  </div>
                  <div className="w-px flex-1 mt-2 bg-border dark:bg-[hsl(0_0%_20%)]" />
                </div>
                <div className="pb-12">
                  <span className="text-xs font-mono tracking-wider text-primary/50" style={{ color: "rgba(51,153,255,0.5)" }}>{step.number}</span>
                  <h4 className="text-lg font-bold text-foreground dark:text-white mt-1">{step.title}</h4>
                  <p className="text-sm mt-2 leading-relaxed text-muted-foreground dark:text-[hsl(0_0%_50%)]">{step.description}</p>
                </div>
              </div>
            ))}
            {/* Last step */}
            <div className="relative flex gap-5">
              <div className="flex flex-col items-center">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(51,153,255,0.15)", border: "1px solid rgba(51,153,255,0.3)" }}>
                  <BarChart3 className="h-5 w-5" style={{ color: "#3399ff" }} />
                </div>
              </div>
              <div>
                <span className="text-xs font-mono tracking-wider" style={{ color: "rgba(51,153,255,0.5)" }}>04</span>
                <h4 className="text-lg font-bold text-foreground dark:text-white mt-1">UHI — Profit Distribution</h4>
                <p className="text-sm mt-2 leading-relaxed text-muted-foreground dark:text-[hsl(0_0%_50%)]">As labor costs drop to zero, profit margins explode, enabling the shift toward Universal High Income for stakeholders.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Who is TimeWarp for? ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden bg-background dark:bg-[hsl(0_0%_10%)]">
        {/* Ambient glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 hidden dark:block" style={{ height: 400, bottom: 0, background: "radial-gradient(ellipse 80% 100% at center bottom, rgba(120,80,220,0.12) 0%, rgba(51,153,255,0.06) 40%, transparent 70%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <div className="text-center mb-6">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Who is TimeWarp for?</h3>
            <p className="text-base text-muted-foreground dark:text-white/50 max-w-xl mx-auto">If you've ever said "Why is my business not growing faster?" — Then this is for you.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 mt-14 max-w-4xl mx-auto">
            {[
              { title: "Visionary Founders", description: 'Founders who want to exit the "daily grind" and move toward a truly passive, autonomous enterprise.' },
              { title: "Hyper-Scale Startups", description: "Companies that need to scale from $1M to $100M without the friction of hiring 200 people." },
              { title: "Efficiency-First Enterprises", description: 'Legacy businesses looking to strip away the "management tax" and install a data-driven AI CEO.' },
              { title: "Solo Operators & Small Teams", description: "Entrepreneurs running lean who want enterprise-level execution without enterprise-level headcount." },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl p-7 sm:p-8 transition-colors bg-card border border-border hover:border-primary/30 dark:bg-[hsl(0_0%_14%)] dark:border-[hsl(0_0%_20%)]">
                <h4 className="text-lg font-bold text-foreground dark:text-white mb-3">{card.title}</h4>
                <p className="text-sm leading-relaxed text-muted-foreground dark:text-[hsl(0_0%_50%)]">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="relative z-10 py-24 lg:py-32 overflow-hidden text-center bg-background dark:bg-[hsl(0_0%_10%)]">
        {/* Top glow — dark only */}
        <div className="absolute pointer-events-none left-0 right-0 hidden dark:block" style={{ height: 400, top: 0, background: "radial-gradient(ellipse 80% 100% at center top, rgba(51,153,255,0.08) 0%, transparent 60%)" }} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl relative z-10">
          <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground dark:text-white mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>See your company's autonomous future</h3>
          <p className="text-base text-muted-foreground dark:text-white/50 mb-12 max-w-xl mx-auto">Paste your website URL. Get your Business DNA &amp; Autonomy Report in 60 seconds.</p>

          {/* Hero-style input card */}
          <div className="max-w-xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center rounded-[14px] p-2 sm:p-[0.5rem_0.5rem_0.5rem_1rem] sm:h-16 bg-card border border-border shadow-md dark:bg-[rgba(255,255,255,0.06)] dark:border-[rgba(255,255,255,0.1)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
              <div className="flex items-center flex-1 px-3 sm:px-0">
                <Globe size={20} className="text-primary opacity-70 mr-3 shrink-0" style={{ color: "#3399ff" }} />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://YourBusiness.com"
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                  className="flex-1 border-none bg-transparent text-foreground dark:text-white placeholder:text-muted-foreground/40 dark:placeholder:text-white/30 outline-none py-3 sm:py-0"
                  style={{ fontFamily: "'Outfit', sans-serif", fontSize: "1rem" }}
                />
              </div>
              <button
                onClick={handleAnalyze}
                className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors mt-2 sm:mt-0 h-12 sm:h-full"
                style={{ padding: "0 1.5rem", borderRadius: 10, fontSize: "1rem", whiteSpace: "nowrap", border: "none", fontFamily: "'Outfit', sans-serif", fontWeight: 500, cursor: "pointer" }}
              >
                Analyze →
              </button>
            </div>

            <div className="flex items-center justify-center gap-4 mt-5">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#22c55e]" />
                <span className="text-xs text-muted-foreground dark:text-white/40">No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-[#3399ff]" />
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
