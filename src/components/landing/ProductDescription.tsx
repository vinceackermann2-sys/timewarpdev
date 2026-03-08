import { 
  Zap, Brain, Users, Building2, Rocket, TrendingUp,
  Clock, Eye, Heart, DollarSign, ArrowRight, Link2,
  CheckCircle, ChevronRight, Cpu, UserCheck, BarChart3,
  Briefcase, Target, Shield
} from "lucide-react";
import { useState } from "react";
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

/* ─────────────────────── Comparison table row ─────────────────── */
function CompareRow({ label, traditional, timewarp }: { label: string; traditional: string; timewarp: string }) {
  return (
    <div className="grid grid-cols-3 gap-4 py-4 border-b border-border/30 last:border-0 items-center">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-muted-foreground/70 text-center">{traditional}</span>
      <span className="text-sm font-semibold text-primary text-center">{timewarp}</span>
    </div>
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

      {/* ── Hero headline ── */}
      <Section className="relative z-10 text-center pt-28 lg:pt-36">
        <p className="text-xs tracking-[0.35em] uppercase text-primary/80 font-mono mb-6">
          AI CEO — Replacing human labor
        </p>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
          100% more freedom<br />
          <span className="text-primary">100% less work</span>
        </h2>
        <p className="mt-8 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Not from hiring more employees. From levers pulled for you — built on the DNA already running through your business.
        </p>
      </Section>

      {/* ── Business DNA intro ── */}
      <Section className="relative z-10" dark>
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-primary/20 bg-primary/5 mb-8">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">This is Business DNA</span>
          </div>
          <p className="text-xl sm:text-2xl text-foreground/90 max-w-3xl mx-auto leading-relaxed font-medium">
            The intelligence layer that turns your company's history into a <span className="italic text-primary">digitalized CEO</span>.
          </p>
        </div>
      </Section>

      {/* ── What others call vs what we mean ── */}
      <Section className="relative z-10">
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          {/* Left: what others call */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              <h3 className="text-xs tracking-[0.25em] uppercase text-muted-foreground font-mono">
                What others call "AI Automation"
              </h3>
            </div>
            <p className="text-2xl font-bold text-foreground/60">
              Chatbots, agents and workflows.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Other tools connect apps to move data. That's plumbing — <span className="italic">not leadership</span>.
            </p>
          </div>

          {/* Right: what we mean */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <h3 className="text-xs tracking-[0.25em] uppercase text-primary font-mono">
                What we mean by Business DNA
              </h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              Every decision, SOP, and winning pivot your company has ever made.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The way you close deals. The way you solve churn. The way you scale culture. TimeWarp learns the <span className="italic text-foreground">"Why"</span> behind your success — and runs the company based on that intelligence.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Evolution of Labor ── */}
      <Section className="relative z-10" dark>
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            The Evolution of Labor
          </h3>
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Old way */}
          <div className="rounded-2xl border border-border/50 bg-card/40 p-8 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h4 className="text-lg font-bold text-muted-foreground">The old way: Hiring humans for every role</h4>
            </div>
            <ul className="space-y-3">
              {[
                "High churn, high cost, and human error.",
                'Scaling requires more "managed" hours.',
                "Knowledge walks out the door when an employee leaves.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm font-semibold text-muted-foreground/80">
                The Ceiling: <span className="italic">You can only grow as fast as you can hire.</span>
              </p>
            </div>
          </div>

          {/* TimeWarp way */}
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-8 space-y-5">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h4 className="text-lg font-bold text-foreground">The TimeWarp way: Replacing all jobs</h4>
            </div>
            <ul className="space-y-3">
              {[
                "Infinite scale with zero headcount increase.",
                "The AI CEO manages specialized employees that never sleep.",
                "Your Business DNA is preserved and perfected forever.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
                  <CheckCircle className="mt-0.5 h-4 w-4 text-primary shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-primary/20">
              <p className="text-sm font-semibold text-primary">
                The Reality: Universal High Income (UHI) powered by autonomous productivity.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Comparison table ── */}
      <Section className="relative z-10">
        <div className="text-center mb-12">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Why the AI CEO wins
          </h3>
          <p className="text-muted-foreground">What a human manager misses</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-3 gap-4 px-6 py-4 border-b border-border/50 bg-card/80">
            <span className="text-xs font-mono tracking-wider text-muted-foreground uppercase" />
            <span className="text-xs font-mono tracking-wider text-muted-foreground/60 uppercase text-center">Traditional CEO</span>
            <span className="text-xs font-mono tracking-wider text-primary uppercase text-center">TimeWarp AI CEO</span>
          </div>
          <div className="px-6">
            <CompareRow label="Decision Speed" traditional="Days / Weeks" timewarp="Milliseconds" />
            <CompareRow label="Context" traditional="Limited to reports" timewarp="Every data point in company history" />
            <CompareRow label="Bias" traditional="Emotional / Subjective" timewarp="Purely ROI-driven" />
            <CompareRow label="Cost" traditional="$250k+ / Year" timewarp="Fractions of a salary" />
          </div>
        </div>
      </Section>

      {/* ── Autonomy Loop ── */}
      <Section className="relative z-10" dark>
        <div className="text-center mb-16">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            The TimeWarp Autonomy Loop
          </h3>
        </div>

        <div className="max-w-xl mx-auto">
          <LoopStep 
            number="01" 
            title="Ingest — Business DNA"
            description="TimeWarp scans your files, Microsoft, financials, and SOPs to map your unique DNA."
            icon={Brain}
          />
          <LoopStep 
            number="02" 
            title="Deploy — The AI CEO"
            description="The system takes over executive functions: resource allocation, task delegation, and strategy."
            icon={Cpu}
          />
          <LoopStep 
            number="03" 
            title="Execute — Replace Jobs"
            description="Autonomous employees perform the roles of SDRs, Accountants, and Project Managers."
            icon={UserCheck}
          />
          <div className="relative flex gap-5">
            <div className="flex flex-col items-center">
              <div className="h-12 w-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div>
              <span className="text-xs font-mono text-primary/60 tracking-wider">04</span>
              <h4 className="text-lg font-bold text-foreground mt-1">UHI — Profit Distribution</h4>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                As labor costs drop to zero, profit margins explode, enabling the shift toward Universal High Income for stakeholders.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ── Who is TimeWarp for? ── */}
      <Section className="relative z-10">
        <div className="text-center mb-12">
          <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Who is TimeWarp for?
          </h3>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <PersonaCard
            icon={Rocket}
            title="Visionary Founders"
            description={'Founders who want to exit the "daily grind" and move toward a truly passive, autonomous enterprise.'}
          />
          <PersonaCard
            icon={TrendingUp}
            title="Hyper-Scale Startups"
            description="Companies that need to scale from $1M to $100M without the friction of hiring 200 people."
          />
          <PersonaCard
            icon={Building2}
            title="Efficiency-First Enterprises"
            description="Legacy businesses looking to strip away the "management tax" and install a data-driven AI CEO."
          />
        </div>
      </Section>

      {/* ── Bottom CTA ── */}
      <Section className="relative z-10 text-center pb-28 lg:pb-36" dark>
        <h3 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
          See your company's autonomous future
        </h3>
        <p className="text-muted-foreground mb-10 text-lg">
          Paste your website URL. Get your Business DNA &amp; Autonomy Report in 60 seconds.
        </p>

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
            <Button
              onClick={handleAnalyze}
              className="h-12 px-6 gap-2"
            >
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