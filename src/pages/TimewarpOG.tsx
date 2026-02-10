import { useNavigate } from "react-router-dom";
import { useState, useRef } from "react";
import { 
  Rocket, Brain, Database, Zap, Target, TrendingUp, 
  Link2, Search, Play, Crown, Users, Infinity,
  Globe, Heart, Clock, ArrowRight, Sparkles, Send, CheckCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

export default function TimewarpOG() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #05070f 0%, #0d1528 30%, #0a1020 60%, #05070f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "32px 16px 60px",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* Background glows */}
      <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: 800, height: 800, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "75%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ maxWidth: 960, width: "100%", position: "relative", zIndex: 1 }}>

        {/* Badge */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 20, background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))", border: "1px solid rgba(251,191,36,0.3)", fontSize: 13, fontWeight: 600, color: "#fbbf24", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            <Crown size={14} /> Exclusive Early Access
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(32px, 8vw, 72px)", fontWeight: 900, color: "#fff", textAlign: "center", letterSpacing: "-0.04em", lineHeight: 1.05, marginBottom: isMobile ? 32 : 48 }}>
          TimeWarp <span style={{ color: "#fbbf24" }}>OG</span>
        </h1>

        {/* Opening - The Problem */}
        <Section>
          <div style={{ display: "flex", gap: 10, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
            <IconPill icon={<Database size={16} />} label="Databases in space" />
            <IconPill icon={<Rocket size={16} />} label="Robotics" />
            <IconPill icon={<Zap size={16} />} label="Self-driving cars" />
          </div>
          <P>It's only been <B>3 years of this madness</B> — yet it feels like there is <B>no chance to compete</B> with the big companies.</P>
          <P>Nobody wants to stay up late at night wondering about the <B>next steps to take</B> to ensure survival.</P>
        </Section>

        {/* The Solution */}
        <Section>
          <Divider icon={<Brain size={20} />} />
          <P>That's why we built the <B>first AI CEO</B> — that runs deep into your company data and tells you <B>what to do next</B> and <B>does it for you!</B></P>
          <Highlight>Your own Elon Musk...</Highlight>
        </Section>

        {/* Historical Context */}
        <Section>
          <Divider icon={<Sparkles size={20} />} />
          <P>Alexander The Great had <B>Aristotle.</B></P>
          <P style={{ color: "rgba(255,255,255,0.4)" }}>Who did the poor have?</P>
          <P style={{ color: "rgba(255,255,255,0.4)" }}>Pastors. Noblemen, maybe investors?</P>
          <P><B>It's not your fault.</B></P>
          <P>The opportunity has lied in the hands of <B>the powerful.</B></P>
          <Highlight>But it's changed...</Highlight>
          <P>AI CEO lets <B>modern day Aristotle</B> run your business.</P>
          <div style={{ textAlign: "center", margin: "24px 0 0" }}>
            <ApplyButton onClick={() => setShowForm(true)} isMobile={isMobile} />
          </div>
        </Section>

        {/* What AI CEO Does */}
        <Section>
          <Divider icon={<Target size={20} />} />
          <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "24px 0" }}>
            <ActionCard icon={<TrendingUp size={20} />} problem="Sales are down?" solution="AI CEO finds cause." />
            <ActionCard icon={<Globe size={20} />} problem="Market is saturated?" solution="AI CEO provides strategy." />
            <ActionCard icon={<Play size={20} />} problem="Execute strategy?" solution="AI CEO does it." />
          </div>
        </Section>

        {/* Differentiation */}
        <Section>
          <P>This is <B>not another</B> "give your data to ChatGPT or Google."</P>
          <Highlight>It's your own private CEO for your business.</Highlight>
        </Section>

        {/* How It Works */}
        <Section>
          <SectionTitle>How it works</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "24px 0" }}>
            <StepCard num="1" icon={<Link2 size={20} />} text="Connect your business data." />
            <StepCard num="2" icon={<Search size={20} />} text="Let AI CEO analyze!" />
            <StepCard num="3" icon={<Play size={20} />} text="Get AI CEO to execute for you. Voilà!" />
          </div>
          <P>AI CEO runs deep into your data and exposes the <B>biggest lever to pull</B> and <B>pulls it for you.</B></P>
          <P><B>No meetings, no middle man</B> — just you and modern day Aristotle.</P>
          <P style={{ color: "rgba(255,255,255,0.4)" }}>Instead of letting golden data sit around in hundred different CRMs, softwares, and systems — <B style={{ color: "rgba(255,255,255,0.7)" }}>AI CEO connects it for you.</B></P>
        </Section>

        {/* OG Benefits */}
        <Section>
          <SectionTitle>Benefits of being a TimeWarp OG</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, margin: "24px 0" }}>
            <BenefitCard icon={<Users size={22} />} title="1-on-1 Build" desc="We work with you personally to build AI CEO after your bottlenecks." />
            <BenefitCard icon={<Crown size={22} />} title="First In Line" desc="You get in before the herd." />
            <BenefitCard icon={<Infinity size={22} />} title="Unlimited Forever" desc="Unlimited AI CEO — FOREVER. No limited generations or top-up credits." />
          </div>
          <div style={{ textAlign: "center", margin: "8px 0 0" }}>
            <ApplyButton onClick={() => setShowForm(true)} isMobile={isMobile} />
          </div>
        </Section>

        {/* Pricing Cards */}
        <Section>
          <SectionTitle>What it costs at launch</SectionTitle>
          <P style={{ textAlign: "center", marginBottom: 24 }}>These plans are <B>not available yet</B> — OGs get unlimited access forever.</P>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 16, margin: "24px 0" }}>
            <PricingCard
              title="Monthly"
              price="€499"
              period="/month"
              tagline="Instant wins. Cancel anytime."
              features={["Full Business Connection", "CEO, CMO, CFO", "Support Line", "20 Task Executions"]}
            />
            <PricingCard
              title="Quarterly"
              price="€1,499"
              period="/quarter"
              tagline="Commit to growth."
              features={["Everything in Monthly", "Whole C-Suite", "VIP-Support (jump the line)", "100 Task Executions"]}
            />
            <PricingCard
              title="Semi-Annual"
              price="€2,499"
              period="/6 months"
              tagline="Smart choice. Unlimited growth."
              popular
              saving="Save €495"
              features={["Everything in Monthly", "Whole C-Suite", "VIP-Support (jump the line)", "200 Task Executions"]}
            />
          </div>
        </Section>


        {/* Vision */}
        <Section>
          <SectionTitle>Our Vision</SectionTitle>
          <P>If speed is time, then moving faster allows <B>Usain Bolt</B> to reach the goal line before Kevin Hart.</P>
          <P>So if businesses move faster — they produce <B>better products</B> and <B>better services.</B> The real metric for helping us tackle real problems: <B>climate change, diseases, and natural disasters.</B></P>
          
          <div style={{ margin: "24px 0", padding: isMobile ? "16px" : "24px", borderRadius: 16, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Heart size={18} style={{ color: "#818cf8" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#818cf8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Why we build</span>
            </div>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", lineHeight: 1.7, margin: 0 }}>
              We're building TimeWarp because <B>too much human potential</B> is stuck in emails, reports, and repetitive work. By giving businesses an <B>AI-powered C-Suite</B>, we give people back <B>time, freedom, and clarity.</B>
            </p>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, margin: "12px 0 0" }}>
              Not just to make more money — but to <B>solve bigger problems, faster</B>, and create something <B>valuable for humanity.</B>
            </p>
          </div>
        </Section>

        {/* Final CTA */}
        <div style={{ textAlign: "center", margin: "32px 0 48px" }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              fontSize: isMobile ? 15 : 18,
              fontWeight: 700,
              color: "#0a0a0a",
              background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
              border: "none",
              borderRadius: 16,
              padding: isMobile ? "14px 32px" : "18px 48px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 0 40px rgba(251,191,36,0.3)",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 0 60px rgba(251,191,36,0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 0 40px rgba(251,191,36,0.3)";
            }}
          >
            Apply Now <ArrowRight size={20} />
          </button>
        </div>

        {/* Application Form Modal */}
        {showForm && <ApplicationFormModal onClose={() => setShowForm(false)} />}

        {/* Back */}
        <div style={{ textAlign: "center", marginTop: 32 }}>
          <button
            onClick={() => navigate("/ai-ceo")}
            style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.7)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function ApplyButton({ onClick, isMobile }: { onClick: () => void; isMobile: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontSize: isMobile ? 15 : 18, fontWeight: 700, color: "#0a0a0a",
        background: "linear-gradient(135deg, #fbbf24, #f59e0b)", border: "none",
        borderRadius: 16, padding: isMobile ? "14px 32px" : "18px 48px",
        cursor: "pointer", transition: "all 0.3s ease",
        boxShadow: "0 0 40px rgba(251,191,36,0.3)",
        display: "inline-flex", alignItems: "center", gap: 10,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 0 60px rgba(251,191,36,0.5)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(251,191,36,0.3)"; }}
    >
      Apply Now <ArrowRight size={20} />
    </button>
  );
}

function B({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <strong style={{ color: "#fff", fontWeight: 700, ...style }}>{children}</strong>;
}

function P({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ fontSize: "clamp(15px, 3.5vw, 17px)", color: "rgba(255,255,255,0.55)", lineHeight: 1.75, margin: "0 0 14px", ...style }}>{children}</p>;
}

function Section({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 40 }}>{children}</div>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", marginBottom: 8, textAlign: "center" }}>
      {children}
    </h2>
  );
}

function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, color: "#fbbf24", textAlign: "center", margin: "20px 0", lineHeight: 1.4 }}>
      {children}
    </p>
  );
}

function Divider({ icon }: { icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "32px 0 24px" }}>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
      <div style={{ color: "rgba(255,255,255,0.2)" }}>{icon}</div>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
    </div>
  );
}

function IconPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
      {icon} {label}
    </span>
  );
}

function ActionCard({ icon, problem, solution }: { icon: React.ReactNode; problem: string; solution: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", transition: "background 0.2s" }}>
      <div style={{ color: "#fbbf24", flexShrink: 0 }}>{icon}</div>
      <div>
        <span style={{ fontSize: 15, color: "rgba(255,255,255,0.45)" }}>{problem} </span>
        <span style={{ fontSize: 15, color: "#fff", fontWeight: 700 }}>{solution}</span>
      </div>
    </div>
  );
}

function StepCard({ num, icon, text }: { num: string; icon: React.ReactNode; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 14, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "#818cf8", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>{num}</div>
      <div style={{ color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{text}</span>
    </div>
  );
}

function BenefitCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "20px 24px", borderRadius: 16, background: "linear-gradient(135deg, rgba(251,191,36,0.06), rgba(245,158,11,0.03))", border: "1px solid rgba(251,191,36,0.15)" }}>
      <div style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{desc}</div>
      </div>
    </div>
  );
}

function PricingCard({ title, price, period, tagline, features, popular, saving }: { title: string; price: string; period: string; tagline: string; features: string[]; popular?: boolean; saving?: string }) {
  return (
    <div style={{
      padding: "24px 20px",
      borderRadius: 18,
      background: "rgba(255,255,255,0.03)",
      border: popular
        ? "2px solid rgba(251,191,36,0.5)"
        : "1px solid rgba(251,191,36,0.25)",
      position: "relative",
      display: "flex",
      flexDirection: "column",
    }}>
      {popular && (
        <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px", borderRadius: 20, background: "linear-gradient(135deg, #fbbf24, #f59e0b)", fontSize: 12, fontWeight: 700, color: "#0a0a0a", textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
          ⭐ Most Popular
        </div>
      )}
      <div style={{ marginBottom: 12, textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{title}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic", marginTop: 4 }}>{tagline}</div>
      </div>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 32, fontWeight: 900, color: "#fbbf24" }}>{price}</span>
        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>{period}</span>
        {saving && <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", marginTop: 4 }}>{saving}</div>}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>What's included</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
            <span style={{ color: "#fbbf24", fontSize: 11 }}>✓</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function ApplicationFormModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", website: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await supabase.from("waitlist").insert({
        name: form.name,
        email: form.email,
        phone: form.phone,
      });
      setSubmitted(true);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={(e) => e.stopPropagation()} style={{ textAlign: "center", padding: "48px 24px", borderRadius: 20, background: "#0d1528", border: "1px solid rgba(251,191,36,0.2)", maxWidth: 500, width: "100%" }}>
          <CheckCircle size={48} style={{ color: "#fbbf24", marginBottom: 16 }} />
          <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Application Received!</h3>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.7, maxWidth: 400, margin: "0 auto 24px" }}>
            We review every application personally. If we think we're a good fit for each other, we'll reach out soon.
          </p>
          <button onClick={onClose} style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 24px", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontSize: 15,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500, width: "100%", padding: "28px 20px", borderRadius: 20, background: "#0d1528", border: "1px solid rgba(251,191,36,0.2)" }}>
        <h3 style={{ fontSize: 24, fontWeight: 800, color: "#fff", textAlign: "center", marginBottom: 8 }}>Apply to become a TimeWarp OG</h3>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", textAlign: "center", marginBottom: 28, lineHeight: 1.6 }}>
          We review every application personally. If we think we're a good fit for each other, we'll contact you.
        </p>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 480, margin: "0 auto" }}>
        <input
          required
          placeholder="Your Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
        <input
          required
          type="email"
          placeholder="Email Address"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
        <input
          required
          type="tel"
          placeholder="Phone Number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
        <input
          placeholder="Company Name"
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
        <input
          placeholder="Website (optional)"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          style={inputStyle}
          onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(251,191,36,0.5)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#0a0a0a",
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            border: "none",
            borderRadius: 14,
            padding: "16px 32px",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "all 0.3s ease",
            boxShadow: "0 0 30px rgba(251,191,36,0.25)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 4,
          }}
        >
          {loading ? "Submitting..." : "Apply Now"} <Send size={18} />
        </button>
      </form>
      </div>
    </div>
  );
}
