import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dna, Globe, Search, FileText, LayoutTemplate, Table, BarChart, Mail, Code2 } from "lucide-react";
import BusinessBrainOrb from "@/components/ui/business-brain-orb";

const steps = [
  { number: "01", title: "Enter Business URL", description: "Provide your website or data room. Our system initiates a deep crawl of your entire digital footprint." },
  { number: "02", title: "Extract Business DNA", description: "We analyze your brand voice, operational mechanics, and strategic positioning into a concentrated digital DNA." },
  { number: "03", title: "Inject into AI Brain", description: "This unique DNA is injected into our advanced cognitive architecture, aligning the AI's neural pathways with your vision." },
  { number: "04", title: "Your AI CEO is Ready", description: "Your autonomous agent comes online. Ready to chat, strategize, and execute complex tasks 24/7." },
];

const STEP_DURATIONS = [3500, 6000, 6000, 6000];

const Screen1 = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 relative">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
    <div className="w-full max-w-[240px] space-y-6 relative z-10">
      <div className="flex flex-col items-center mb-8">
        <Globe className="w-12 h-12 text-primary mb-4" />
        <h4 className="text-foreground font-medium text-center">Connect Business</h4>
      </div>
      <div className="bg-muted p-3 rounded-xl border border-border flex items-center gap-3 shadow-inner">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="overflow-hidden flex-1">
          <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 2, ease: "linear", delay: 0.5 }} className="whitespace-nowrap overflow-hidden text-primary font-mono text-sm">
            yourcompany.com
          </motion.div>
        </div>
      </div>
      <motion.div
        animate={{ scale: [1, 1, 0.95, 1], backgroundColor: ["hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--primary))", "hsl(var(--primary))"] }}
        transition={{ duration: 3.5, times: [0, 0.8, 0.85, 0.9] }}
        className="w-full bg-primary text-primary-foreground py-3 rounded-xl text-sm font-bold text-center shadow-[0_0_20px_rgba(37,99,235,0.4)]"
      >
        Activate CEO
      </motion.div>
    </div>
  </div>
);

const SkeletonCards = () => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActive((a) => (a + 1) % 6), 1000);
    return () => clearInterval(interval);
  }, []);

  const cardClass = "absolute inset-0 bg-card border border-border rounded-xl p-3 flex flex-col gap-2 shadow-xl";
  const barClass = "h-2 bg-muted rounded";
  const anim = { initial: { opacity: 0, y: 20, scale: 0.9 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -20, scale: 0.9 }, transition: { duration: 0.3 } };

  const cards = [
    <motion.div key="web" {...anim} className={cardClass}><div className="flex items-center gap-2 mb-1"><LayoutTemplate className="w-4 h-4 text-primary" /><div className="h-2 w-16 bg-muted rounded" /></div><div className="h-10 w-full bg-muted rounded-md" /><div className={barClass + " w-3/4"} /><div className={barClass + " w-1/2"} /></motion.div>,
    <motion.div key="sheet" {...anim} className={cardClass}><div className="flex items-center gap-2 mb-1"><Table className="w-4 h-4 text-status-success" /><div className="h-2 w-16 bg-muted rounded" /></div><div className="grid grid-cols-3 gap-1">{[...Array(9)].map((_, i) => <div key={i} className="h-2.5 bg-muted rounded-sm" />)}</div></motion.div>,
    <motion.div key="doc" {...anim} className={cardClass}><div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-accent" /><div className="h-2 w-16 bg-muted rounded" /></div>{[...Array(4)].map((_, i) => <div key={i} className="h-2 w-full bg-muted rounded" />)}<div className="h-2 w-2/3 bg-muted rounded" /></motion.div>,
    <motion.div key="chart" {...anim} className={cardClass}><div className="flex items-center gap-2 mb-1"><BarChart className="w-4 h-4 text-status-warning" /><div className="h-2 w-16 bg-muted rounded" /></div><div className="flex items-end gap-1 h-12 mt-2">{[40, 70, 45, 90, 65].map((h, i) => <div key={i} className="w-full bg-muted rounded-t-sm" style={{ height: `${h}%` }} />)}</div></motion.div>,
    <motion.div key="mail" {...anim} className={cardClass}><div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-destructive" /><div className="h-2 w-16 bg-muted rounded" /></div><div className="flex gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-muted" /><div className="flex-1 space-y-1"><div className="h-2 w-1/2 bg-muted rounded" /><div className="h-2 w-1/3 bg-muted rounded" /></div></div><div className="h-2 w-full bg-muted rounded" /></motion.div>,
    <motion.div key="code" {...anim} className={cardClass}><div className="flex items-center gap-2 mb-1"><Code2 className="w-4 h-4 text-pink-400" /><div className="h-2 w-16 bg-muted rounded" /></div><div className="space-y-1.5 pl-2 border-l-2 border-border"><div className="h-2 w-3/4 bg-muted rounded" /><div className="h-2 w-1/2 bg-muted rounded ml-2" /><div className="h-2 w-2/3 bg-muted rounded ml-2" /><div className="h-2 w-1/4 bg-muted rounded" /></div></motion.div>,
  ];

  return (
    <div className="relative w-48 h-32 mb-4 overflow-hidden rounded-xl">
      <AnimatePresence mode="wait">{cards[active]}</AnimatePresence>
      <motion.div animate={{ top: ["-10%", "110%", "-10%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_2px_rgba(96,165,250,0.8)] z-20" />
    </div>
  );
};

const Screen2 = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 relative">
    <SkeletonCards />
    <div className="relative">
      <Dna className="w-16 h-16 text-muted" strokeWidth={1.5} />
      <motion.div className="absolute inset-0" initial={{ clipPath: "inset(100% 0 0 0)" }} animate={{ clipPath: "inset(0% 0 0 0)" }} transition={{ duration: 6, ease: "linear" }}>
        <Dna className="w-16 h-16 text-primary" strokeWidth={1.5} />
      </motion.div>
    </div>
    <div className="mt-4 text-xs font-mono text-primary">Synthesizing DNA...</div>
  </div>
);

const Screen3 = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 relative overflow-hidden bg-card">
    <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
      <motion.div animate={{ rotateY: [0, 720, 1080, 1080], scale: [1, 1.2, 0.8, 0.8], y: [0, 0, -50, -50] }} transition={{ duration: 6, times: [0, 0.25, 0.4, 1], ease: "easeInOut" }} className="absolute z-20">
        <Dna className="w-16 h-16 text-primary" strokeWidth={1.5} />
      </motion.div>
      <motion.div animate={{ opacity: [0, 0, 1, 1], y: [0, 0, -90, -90] }} transition={{ duration: 6, times: [0, 0.4, 0.5, 1] }} className="absolute z-30 text-primary font-bold text-xs tracking-widest uppercase drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]">
        Business DNA
      </motion.div>
      {[
        { rotate: -25, x: -55, y: 10, delay: 0 },
        { rotate: 0, x: 0, y: 20, delay: 0.05 },
        { rotate: 25, x: 55, y: 10, delay: 0.1 },
      ].map((pos, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0, 0, 1, 1], scale: [0, 0, 1, 1], x: [0, 0, pos.x, pos.x], y: [-50, -50, pos.y, pos.y], rotate: [0, 0, pos.rotate, pos.rotate] }}
          transition={{ duration: 6, times: [0, 0.4 + pos.delay, 0.55 + pos.delay, 1], ease: "easeOut" }}
          className="absolute z-10 w-24 h-32 bg-card border border-primary/20 rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
          style={{ transformOrigin: "bottom center" }}
        >
          <div className="flex items-center gap-2 mb-1"><Dna className="w-3 h-3 text-primary" /><div className="h-1.5 w-10 bg-muted rounded" /></div>
          <div className="h-1.5 w-full bg-muted rounded" />
          <div className="h-1.5 w-full bg-muted rounded" />
          <div className="h-1.5 w-3/4 bg-muted rounded" />
          <div className="mt-auto h-6 w-full bg-primary/5 rounded border border-primary/20 flex flex-col justify-center gap-1 p-1">
            <div className="h-1 w-full bg-primary/40 rounded" />
            <div className="h-1 w-4/5 bg-primary/40 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

const CEO_COMMANDS = ["Draft a Q3 marketing strategy...", "Analyze competitor pricing...", "Write an email to the board...", "Summarize the weekly sales report...", "Create a new ad campaign..."];

const Screen4 = () => {
  const [text, setText] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const cmd = CEO_COMMANDS[commandIndex];
    const speed = isDeleting ? 30 : 60;
    const delay = text === cmd && !isDeleting ? 2000 : text === "" && isDeleting ? 500 : speed;
    const timeout = setTimeout(() => {
      if (!isDeleting && text === cmd) setIsDeleting(true);
      else if (isDeleting && text === "") { setIsDeleting(false); setCommandIndex((p) => (p + 1) % CEO_COMMANDS.length); }
      else setText(cmd.substring(0, text.length + (isDeleting ? -1 : 1)));
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, isDeleting, commandIndex]);

  return (
    <div className="flex flex-col h-full p-5 relative bg-card">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="mb-6">
          <BusinessBrainOrb size={100} />
        </div>
        <h4 className="text-foreground font-bold text-xl tracking-tight">Your Company</h4>
      </div>
      <div className="w-full bg-muted border border-border rounded-full p-1.5 pl-5 flex items-center gap-3 shadow-sm mb-2">
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <span className="text-muted-foreground text-sm font-medium">{text}<span className="animate-pulse">|</span></span>
        </div>
        <div className="w-9 h-9 rounded-full bg-card flex items-center justify-center shrink-0 border border-border">
          <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const PhoneMockup = ({ activeStep }: { activeStep: number }) => (
  <div className="force-light relative mx-auto w-[280px] h-[580px] sm:w-[320px] sm:h-[650px] bg-card rounded-[3rem] border-[8px] border-foreground dark:border-[#b0b0b0] shadow-2xl overflow-hidden flex-shrink-0">
    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-foreground dark:bg-[#b0b0b0] rounded-b-2xl z-20" />
    <div className="relative w-full h-full bg-card flex flex-col">
      <div className="pt-10 px-5 pb-4 z-20 relative bg-card/90 backdrop-blur-md border-b border-border/50">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div key={i} className="h-1 flex-1 bg-muted rounded-full overflow-hidden">
              <motion.div key={`${activeStep}-${i}`} className="h-full bg-primary" initial={{ width: i < activeStep ? "100%" : "0%" }} animate={{ width: i <= activeStep ? "100%" : "0%" }} transition={{ duration: i === activeStep ? STEP_DURATIONS[i] / 1000 : 0.3, ease: "linear" }} />
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden bg-card">
        <AnimatePresence mode="wait">
          <motion.div key={activeStep} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0">
            {activeStep === 0 && <Screen1 />}
            {activeStep === 1 && <Screen2 />}
            {activeStep === 2 && <Screen3 />}
            {activeStep === 3 && <Screen4 />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  </div>
);

export default function ZipHowItWorks() {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep === 3) return;
    const timer = setTimeout(() => setActiveStep((p) => p + 1), STEP_DURATIONS[activeStep]);
    return () => clearTimeout(timer);
  }, [activeStep]);

  return (
    <section className="py-24 lg:py-32 bg-background relative z-10 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="max-w-xl">
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              How we clone your genius.
            </h3>
            <p className="text-xl text-muted-foreground leading-relaxed">Millions of data points analyzed in seconds.</p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup activeStep={activeStep} />
          </div>
        </div>
      </div>
    </section>
  );
}
