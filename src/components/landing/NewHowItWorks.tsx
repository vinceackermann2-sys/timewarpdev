import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Dna, Brain, Globe, Search, FileText, LayoutTemplate, Table, BarChart, Mail, Code2, Sparkles, ArrowRight, Rocket, X, Database, Check, CheckCircle2, Loader2 } from 'lucide-react';

export const steps = [
  {
    number: '01',
    title: 'Enter Business URL',
    description: 'Provide your website or data room. Our system initiates a deep crawl of your entire digital footprint to understand your baseline.',
  },
  {
    number: '02',
    title: 'Extract Business DNA',
    description: 'We analyze your brand voice, operational mechanics, and strategic positioning, extracting it into a concentrated digital DNA.',
  },
  {
    number: '03',
    title: 'Inject into AI Brain',
    description: 'This unique DNA is injected into our advanced cognitive architecture, aligning the AI\'s neural pathways with your exact vision.',
  },
  {
    number: '04',
    title: 'Your AI CEO is Ready',
    description: 'Your autonomous agent comes online. It\'s ready to chat, strategize, and execute complex tasks 24/7, perfectly aligned with your goals.',
  }
];

export const STEP_DURATIONS = [3500, 6000, 6000, 6000];

export const Screen1 = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.05)_0%,transparent_70%)]" />
    
    <motion.div 
      initial={{ scale: 0.75, x: 0, y: 0 }}
      animate={{ 
        scale: [0.75, 0.75, 1.1, 1.1],
        x: [0, 0, "-1%", "-1%"],
        y: [0, 0, "1%", "1%"]
      }}
      transition={{ 
        duration: 3.5, 
        times: [0, 0.14, 0.6, 1],
        ease: "easeInOut"
      }}
      className="w-full max-w-md space-y-6 relative z-10 flex flex-col items-start"
    >
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none text-slate-900 m-0">
          The future of <span className="text-[#4a86ff] italic" style={{ fontFamily: 'cursive' }}>business</span>
        </h2>
        <p className="text-xs sm:text-sm font-normal text-slate-600 m-0">
          Data driven levers pulled for you.
        </p>
      </div>

      <div className="flex items-center bg-white rounded-2xl p-1.5 sm:p-2 w-full shadow-lg border border-slate-200">
        <div className="flex items-center flex-1 min-w-0 px-2 sm:px-4">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 shrink-0 text-slate-400" />
          <div className="flex">
            {"yourcompany.com".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, display: "none" }}
                animate={{ opacity: 1, display: "inline-block" }}
                transition={{ 
                  delay: 0.5 + (i * 0.07), 
                  duration: 0 
                }}
                className="text-slate-700 font-sans text-sm sm:text-base"
              >
                {char}
              </motion.span>
            ))}
            <motion.div 
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
              className="w-0.5 h-5 bg-[#4a86ff] ml-0.5 self-center"
            />
          </div>
        </div>
        <motion.button 
          animate={{ scale: [1, 1, 0.95, 1], backgroundColor: ["#4a86ff", "#4a86ff", "#2875ff", "#4a86ff"] }}
          transition={{ duration: 3.5, times: [0, 0.8, 0.85, 0.9] }}
          className="shrink-0 px-4 py-2 sm:px-6 sm:py-3 rounded-xl text-white font-bold text-xs sm:text-sm border-none shadow-[0_0_20px_rgba(51,153,255,0.4)] flex items-center gap-1.5 sm:gap-2"
        >
          Get DNA
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={2.5} />
        </motion.button>
      </div>
    </motion.div>
  </div>
);

export const SkeletonCards = () => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setActive(a => (a + 1) % 6), 1000);
    return () => clearInterval(interval);
  }, []);

  const cards = [
    <motion.div key="web" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1"><LayoutTemplate className="w-4 h-4 text-blue-400"/><div className="h-2 w-16 bg-slate-200 rounded" /></div>
      <div className="h-10 w-full bg-slate-100 rounded-md" />
      <div className="h-2 w-3/4 bg-slate-200 rounded" />
      <div className="h-2 w-1/2 bg-slate-200 rounded" />
    </motion.div>,
    <motion.div key="sheet" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1"><Table className="w-4 h-4 text-emerald-400"/><div className="h-2 w-16 bg-slate-200 rounded" /></div>
      <div className="grid grid-cols-3 gap-1">
        {[...Array(9)].map((_, i) => <div key={i} className="h-2.5 bg-slate-100 rounded-sm" />)}
      </div>
    </motion.div>,
    <motion.div key="doc" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-purple-400"/><div className="h-2 w-16 bg-slate-200 rounded" /></div>
      {[...Array(4)].map((_, i) => <div key={i} className="h-2 w-full bg-slate-100 rounded" />)}
      <div className="h-2 w-2/3 bg-slate-100 rounded" />
    </motion.div>,
    <motion.div key="chart" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1"><BarChart className="w-4 h-4 text-amber-400"/><div className="h-2 w-16 bg-slate-200 rounded" /></div>
      <div className="flex items-end gap-1 h-12 mt-2">
        {[40, 70, 45, 90, 65].map((h, i) => <div key={i} className="w-full bg-slate-100 rounded-t-sm" style={{ height: `${h}%` }} />)}
      </div>
    </motion.div>,
    <motion.div key="mail" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1"><Mail className="w-4 h-4 text-red-400"/><div className="h-2 w-16 bg-slate-200 rounded" /></div>
      <div className="flex gap-2 mb-2"><div className="w-6 h-6 rounded-full bg-slate-100" /><div className="flex-1 space-y-1"><div className="h-2 w-1/2 bg-slate-200 rounded" /><div className="h-2 w-1/3 bg-slate-100 rounded" /></div></div>
      <div className="h-2 w-full bg-slate-100 rounded" />
    </motion.div>,
    <motion.div key="code" initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-xl">
      <div className="flex items-center gap-2 mb-1"><Code2 className="w-4 h-4 text-pink-400"/><div className="h-2 w-16 bg-slate-200 rounded" /></div>
      <div className="space-y-1.5 pl-2 border-l-2 border-slate-200">
        <div className="h-2 w-3/4 bg-slate-200 rounded" />
        <div className="h-2 w-1/2 bg-slate-100 rounded ml-2" />
        <div className="h-2 w-2/3 bg-slate-100 rounded ml-2" />
        <div className="h-2 w-1/4 bg-slate-200 rounded" />
      </div>
    </motion.div>
  ];

  return (
    <div className="relative w-48 h-32 mb-4 overflow-hidden rounded-xl">
      <AnimatePresence mode="wait">
        {cards[active]}
      </AnimatePresence>
      <motion.div
        animate={{ top: ["-10%", "110%", "-10%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_2px_rgba(96,165,250,0.8)] z-20"
      />
    </div>
  );
};

export const Screen2 = () => (
  <div className="flex flex-col items-center justify-center h-full p-6 relative">
    <SkeletonCards />
    <div className="relative">
      <Dna className="w-16 h-16 text-slate-200" strokeWidth={1.5} />
      <motion.div 
        className="absolute inset-0"
        initial={{ clipPath: "inset(100% 0 0 0)" }}
        animate={{ clipPath: "inset(0% 0 0 0)" }}
        transition={{ duration: 6, ease: "linear" }}
      >
        <Dna className="w-16 h-16 text-blue-400" strokeWidth={1.5} />
      </motion.div>
    </div>
    <div className="mt-4 text-xs font-mono text-blue-400">Synthesizing DNA...</div>
  </div>
);

export const Screen3 = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 relative overflow-hidden bg-white">
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full">
        <motion.div
          animate={{
            rotateY: [0, 720, 1080, 1080],
            scale: [1, 1.2, 0.95, 0.95],
            y: [0, 0, -30, -30],
          }}
          transition={{ duration: 6, times: [0, 0.25, 0.4, 1], ease: "easeInOut" }}
          className="absolute z-20"
        >
          <Dna className="w-16 h-16 text-blue-400" strokeWidth={1.5} />
        </motion.div>

        <motion.div
          animate={{ opacity: [0, 0, 1, 1], y: [0, 0, -70, -70], scale: [1, 1, 1.05, 1.05] }}
          transition={{ duration: 6, times: [0, 0.4, 0.5, 1] }}
          className="absolute z-30 text-blue-400 font-bold text-xs tracking-widest uppercase drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]"
        >
          Business DNA
        </motion.div>

        {[
          { rotate: -25, x: -60, y: 30, delay: 0 },
          { rotate: 0, x: 0, y: 40, delay: 0.05 },
          { rotate: 25, x: 60, y: 30, delay: 0.1 }
        ].map((pos, i) => (
          <motion.div
            key={i}
            animate={{
              opacity: [0, 0, 1, 1],
              scale: [0, 0, 1.1, 1.1],
              x: [0, 0, pos.x, pos.x],
              y: [-30, -30, pos.y, pos.y],
              rotate: [0, 0, pos.rotate, pos.rotate]
            }}
            transition={{
              duration: 6,
              times: [0, 0.4 + pos.delay, 0.55 + pos.delay, 1],
              ease: "easeOut"
            }}
            className="absolute z-10 w-24 h-32 bg-white border border-blue-200 rounded-xl p-2.5 flex flex-col gap-2 shadow-[0_0_20px_rgba(59,130,246,0.15)]"
            style={{ transformOrigin: "bottom center" }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Dna className="w-3 h-3 text-blue-400"/>
              <div className="h-1.5 w-10 bg-slate-200 rounded" />
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded" />
            <div className="h-1.5 w-full bg-slate-100 rounded" />
            <div className="h-1.5 w-3/4 bg-slate-100 rounded" />
            <div className="mt-auto h-6 w-full bg-blue-50 rounded border border-blue-200 flex flex-col justify-center gap-1 p-1">
               <div className="h-1 w-full bg-blue-400/40 rounded" />
               <div className="h-1 w-4/5 bg-blue-400/40 rounded" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const CEO_COMMANDS = [
  "Draft a Q3 marketing strategy...",
  "Analyze competitor pricing...",
  "Write an email to the board...",
  "Summarize the weekly sales report...",
  "Create a new ad campaign..."
];

export const Screen4 = () => {
  const [text, setText] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentCommand = CEO_COMMANDS[commandIndex];
    const typingSpeed = isDeleting ? 30 : 60;
    const delay = text === currentCommand && !isDeleting ? 2000 : text === "" && isDeleting ? 500 : typingSpeed;

    const timeout = setTimeout(() => {
      if (!isDeleting && text === currentCommand) {
        setIsDeleting(true);
      } else if (isDeleting && text === "") {
        setIsDeleting(false);
        setCommandIndex((prev) => (prev + 1) % CEO_COMMANDS.length);
      } else {
        setText(currentCommand.substring(0, text.length + (isDeleting ? -1 : 1)));
      }
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, commandIndex]);

  return (
    <div className="flex flex-col h-full p-5 relative bg-white">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div 
          className="relative flex items-center justify-center mb-6" 
          style={{ '--sz': '80px' } as React.CSSProperties}
        >
          <div 
            className="absolute rounded-full animate-pulse-slow"
            style={{ 
              inset: '-20px', 
              background: 'radial-gradient(circle, rgba(133,176,255,0.3) 0%, transparent 70%)' 
            }}
          />
          <div className="absolute inset-0">
            <div className="absolute border-solid border-transparent pointer-events-none silver-connector-1 animate-edge-rotate" />
            <div className="absolute border-solid border-transparent pointer-events-none silver-connector-2 animate-edge-rotate" />
          </div>
          <div 
            className="orb-container-original relative rounded-full overflow-hidden z-10 sm:w-[100px] sm:h-[100px] sm:min-w-[100px] sm:min-h-[100px]" 
            style={{ width: 'var(--sz)', height: 'var(--sz)', minWidth: 'var(--sz)', minHeight: 'var(--sz)' }}
          />
        </div>
        <h4 className="text-slate-900 font-bold text-lg sm:text-xl tracking-tight">Your Company</h4>
      </div>
      <div className="w-11/12 mx-auto bg-white/80 backdrop-blur-md border border-slate-300 rounded-full p-1.5 pl-5 flex items-center gap-3 shadow-lg mb-2">
        <div className="flex-1 overflow-hidden whitespace-nowrap">
          <span className="text-slate-900 text-xs sm:text-sm font-medium">{text}<span className="animate-pulse">|</span></span>
        </div>
        <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0 border border-slate-700 shadow-sm">
          <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const nodesData = [
  {s:8, end: 10, i: <Dna className="w-5 h-5"/>, t: "Business DNA", log: "Checking business dna..."},
  {s:10, end: 12, i: <Globe className="w-5 h-5"/>, t: "Web Search", log: "Matching with real time data..."},
  {s:12, end: 14, i: <LayoutTemplate className="w-5 h-5"/>, t: "Strategy Plan", log: "Crafting plan..."}
];

const NodeWithLog = ({ icon, title, stepNum, status, logText, xOffset = -20, size = "md" }: { icon: React.ReactNode, title: string, stepNum: number, status: 'waiting' | 'thinking' | 'completed', logText: string, xOffset?: number, size?: "sm" | "md" }) => {
  if (status === 'waiting') return null;

  const isSm = size === "sm";

  return (
    <motion.div initial={{ opacity: 0, x: xOffset }} animate={{ opacity: 1, x: 0 }} className={`bg-emerald-50 border-2 border-emerald-200 rounded-xl ${isSm ? 'p-2.5 gap-1.5' : 'p-3.5 gap-2.5'} flex flex-col shadow-lg shadow-emerald-100/50 w-full h-full justify-center`}>
      <div className={`flex items-center ${isSm ? 'gap-2' : 'gap-3'}`}>
        <div className={`${isSm ? 'w-7 h-7' : 'w-9 h-9'} rounded-lg bg-blue-50 text-[#4a86ff] flex items-center justify-center shrink-0`}>
          <div className={isSm ? 'scale-75' : ''}>{icon}</div>
        </div>
        <div className="flex flex-col">
          <span className={`${isSm ? 'text-[8px]' : 'text-[9px]'} font-bold text-slate-400 uppercase tracking-widest leading-none ${isSm ? 'mb-0.5' : 'mb-1'}`}>Step {stepNum}</span>
          <span className={`${isSm ? 'text-[10px]' : 'text-sm'} font-bold text-slate-700 leading-none`}>{title}</span>
        </div>
      </div>
      <div className={`flex items-center ${isSm ? 'gap-1.5 px-0.5' : 'gap-2 px-1'} overflow-hidden`}>
        {status === 'thinking' ? (
          <>
            <Loader2 className={`${isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-700 animate-spin shrink-0`} />
            <span className={`${isSm ? 'text-[8px]' : 'text-[10px]'} font-mono text-slate-800 truncate animate-pulse-slow`}>
              {logText}
            </span>
          </>
        ) : (
          <>
            <CheckCircle2 className={`${isSm ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-500 shrink-0`} />
            <span className={`${isSm ? 'text-[8px]' : 'text-[10px]'} font-mono text-emerald-600 truncate`}>
              Complete
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
};

const DesktopFlow = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [step, setStep] = useState(0); 

  useEffect(() => {
    if (isInView) {
      const timers: NodeJS.Timeout[] = [];
      timers.push(setTimeout(() => setStep(1), 100));
      timers.push(setTimeout(() => setStep(2), 1600));
      timers.push(setTimeout(() => setStep(3), 2000));
      timers.push(setTimeout(() => setStep(4), 2800));
      timers.push(setTimeout(() => setStep(5), 3800));
      timers.push(setTimeout(() => setStep(6), 4600));
      timers.push(setTimeout(() => setStep(7), 5300));
      timers.push(setTimeout(() => setStep(8), 5800));
      timers.push(setTimeout(() => setStep(9), 7300));
      timers.push(setTimeout(() => setStep(10), 8800));
      timers.push(setTimeout(() => setStep(11), 10300));
      timers.push(setTimeout(() => setStep(12), 11800));
      timers.push(setTimeout(() => setStep(13), 13300));
      timers.push(setTimeout(() => setStep(14), 14800));
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isInView]);

  const getCameraState = (currentStep: number) => {
    if (currentStep < 8) return { scale: 1.4, x: 350, y: 120 };
    if (currentStep < 10) return { scale: 1.4, x: -80, y: 60 };
    if (currentStep < 14) return { scale: 1.4, x: -80, y: -60 };
    return { scale: 1.05, x: 0, y: 0 };
  };

  return (
    <div ref={containerRef} className="hidden lg:block w-full max-w-[1200px] mx-auto overflow-visible pb-12 pt-8 px-4">
      <motion.div 
        initial={{ scale: 1.4, x: 350, y: 120 }}
        animate={getCameraState(step)}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="grid grid-cols-[180px_60px_220px_60px_220px_60px_220px] grid-rows-4 items-center gap-y-6 relative origin-center"
      >
        <div className="col-start-1 row-start-1 row-span-4 flex items-center justify-end pr-2 relative z-20">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            className="flex items-center gap-3 bg-white border-2 border-slate-100 px-5 py-3.5 rounded-full shadow-lg"
          >
            <div className="w-7 h-7 rounded-full border-[3px] border-slate-100 flex items-center justify-center bg-slate-50">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            </div>
            <div className="relative flex items-center">
              <div className="flex">
                {"Grow my business".split("").map((char, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={step >= 1 ? { opacity: 1 } : {}}
                    transition={{ delay: i * 0.07, duration: 0 }}
                    className="text-base font-semibold text-slate-700"
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="col-start-2 row-start-1 row-span-4 h-full relative">
          {step >= 3 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 400">
              <motion.path d="M 0 200 C 50 200, 50 150, 100 150" fill="none" stroke="#fecaca" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
              {step >= 5 && (
                <motion.path d="M 0 200 C 50 200, 50 250, 100 250" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
              )}
            </svg>
          )}
        </div>

        <div className="col-start-3 row-start-2 pl-2">
          {step >= 4 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 0.6, x: 0 }} className="bg-red-50/30 border-2 border-red-100 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 h-[110px] w-full">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-slate-700">"You should sell more"</span>
              </div>
              <span className="bg-red-100/50 text-red-500 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-center">OTHER AIS</span>
            </motion.div>
          )}
        </div>

        <div className="col-start-3 row-start-3 pl-2">
          {step >= 6 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 shadow-lg shadow-emerald-100/50 h-[110px] w-full">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <p className="text-xs text-slate-700 font-semibold italic">"Let me find the best way"</p>
              </div>
              <div className="flex items-center justify-center gap-2 bg-emerald-100/50 rounded-lg px-2.5 py-1.5 self-center mt-1">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">TimeWarp</span>
              </div>
            </motion.div>
          )}
        </div>

        <div className="col-start-4 row-start-2 row-span-3 h-full relative">
          {step >= 7 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 300">
              <motion.path d="M 0 150 C 50 150, 50 50, 100 50" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              {step >= 9 && <motion.path d="M 0 150 C 50 150, 50 150, 100 150" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />}
              {step >= 11 && <motion.path d="M 0 150 C 50 150, 50 250, 100 250" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />}
            </svg>
          )}
        </div>

        <div className="col-start-5 row-start-2 row-span-3 flex flex-col gap-6 pl-2">
          {nodesData.map((node, i) => {
            const status = step < node.s ? 'waiting' : step < node.end ? 'thinking' : 'completed';
            return (
              <div key={i} className="h-[110px] flex items-center">
                <NodeWithLog 
                  icon={node.i} 
                  title={node.t} 
                  stepNum={i + 1} 
                  status={status} 
                  logText={node.log} 
                  xOffset={-20}
                />
              </div>
            );
          })}
        </div>

        <div className="col-start-6 row-start-2 row-span-3 h-full relative">
          {step >= 13 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 300">
              <motion.path d="M 0 50 C 50 50, 50 150, 100 150" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              <motion.path d="M 0 150 C 50 150, 50 150, 100 150" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              <motion.path d="M 0 250 C 50 250, 50 150, 100 150" fill="none" stroke="#a7f3d0" strokeWidth="3" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
            </svg>
          )}
        </div>

        <div className="col-start-7 row-start-2 row-span-3 flex items-center pl-2">
          {step >= 14 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border-2 border-emerald-200 rounded-2xl p-4 flex flex-col gap-3 shadow-xl shadow-emerald-100/50 w-full relative">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800">Proposed Strategy</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-100" />
                  <div className="h-2 rounded-full bg-slate-100 flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-100" />
                  <div className="h-2 rounded-full bg-slate-100 w-3/4" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-emerald-100" />
                  <div className="h-2 rounded-full bg-slate-100 w-5/6" />
                </div>
              </div>
              
              <button className="w-full bg-emerald-500 text-white text-[11px] font-bold py-2 rounded-lg shadow-sm hover:bg-emerald-600 transition-colors mt-1">
                Do it for me
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};



const CompactNode = ({ node, currentStep, startStep, endStep }: { node: any, currentStep: number, startStep: number, endStep: number }) => {
  const status = currentStep < startStep ? 'waiting' : currentStep < endStep ? 'thinking' : 'completed';
  if (status === 'waiting') return null;
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-2 flex flex-col items-center gap-1.5 shadow-lg shadow-emerald-100/50 w-full h-full justify-start text-center">
      <div className="w-7 h-7 rounded-md bg-blue-50 text-[#4a86ff] flex items-center justify-center shrink-0">
        <div className="scale-75">{node.i}</div>
      </div>
      <span className="text-[9px] font-bold text-slate-700 leading-tight">{node.t}</span>
      <div className="mt-auto pt-1">
        {status === 'thinking' ? (
          <Loader2 className="w-3.5 h-3.5 text-slate-700 animate-spin" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        )}
      </div>
    </motion.div>
  );
};

const MobileTreeFlow = () => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-50px" });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isInView) {
      const timers: NodeJS.Timeout[] = [];
      timers.push(setTimeout(() => setStep(1), 100));
      timers.push(setTimeout(() => setStep(2), 1600));
      timers.push(setTimeout(() => setStep(3), 2000));
      timers.push(setTimeout(() => setStep(4), 2800));
      timers.push(setTimeout(() => setStep(5), 3800));
      timers.push(setTimeout(() => setStep(6), 4600));
      timers.push(setTimeout(() => setStep(7), 5300));
      timers.push(setTimeout(() => setStep(8), 5800));
      timers.push(setTimeout(() => setStep(9), 7300));
      timers.push(setTimeout(() => setStep(10), 8800));
      timers.push(setTimeout(() => setStep(11), 10300));
      timers.push(setTimeout(() => setStep(12), 11800));
      timers.push(setTimeout(() => setStep(13), 13300));
      timers.push(setTimeout(() => setStep(14), 14800));
      return () => timers.forEach(t => clearTimeout(t));
    }
  }, [isInView]);

  const getCameraState = (currentStep: number) => {
    if (currentStep < 2) return { y: 0, scale: 0.9 };
    if (currentStep < 6) return { y: -5, scale: 0.9 };
    if (currentStep < 13) return { y: -10, scale: 0.9 };
    return { y: -20, scale: 0.85 };
  };

  return (
    <div ref={containerRef} className="block lg:hidden w-full max-w-md mx-auto overflow-hidden h-[550px] relative border border-slate-100 rounded-3xl bg-slate-50/50 shadow-inner">
      <motion.div 
        animate={getCameraState(step)}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        className="relative w-full pt-12 pb-32 px-2 flex flex-col items-center origin-top"
      >
        {/* Row 1: Input */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          className="flex items-center gap-2 bg-white border-2 border-slate-100 px-4 py-2.5 rounded-full shadow-lg z-20"
        >
          <div className="w-5 h-5 rounded-full border-[2px] border-slate-100 flex items-center justify-center bg-slate-50">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
          </div>
          <div className="flex">
            {"Grow my business".split("").map((char, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0 }}
                animate={step >= 1 ? { opacity: 1 } : {}}
                transition={{ delay: i * 0.07, duration: 0 }}
                className="text-sm font-semibold text-slate-700"
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Row 2: SVG Split */}
        <div className="w-full h-12 relative z-10 -mt-2">
          {step >= 2 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 350 48" preserveAspectRatio="none">
              <motion.path d="M 175 0 C 175 24, 91.5 24, 91.5 48" fill="none" stroke="#fecaca" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
              {step >= 4 && (
                <motion.path d="M 175 0 C 175 24, 258.5 24, 258.5 48" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8 }} />
              )}
            </svg>
          )}
        </div>

        {/* Row 3: Generic & TimeWarp */}
        <div className="flex w-full gap-4 z-20 px-4">
          <div className="flex-1 flex justify-center">
            {step >= 3 ? (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 0.6, y: 0 }} className="bg-red-50/30 border-2 border-red-100 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 h-[80px] w-full relative">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="text-[10px] font-medium text-slate-700 leading-tight">"You should sell more"</span>
                </div>
                <span className="bg-red-100/50 text-red-500 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">OTHER AIS</span>
              </motion.div>
            ) : <div className="h-[80px] w-full" />}
          </div>
          <div className="flex-1 flex justify-center">
            {step >= 5 ? (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 flex flex-col items-center justify-center text-center gap-2 shadow-lg shadow-emerald-100/50 h-[80px] w-full">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-[10px] text-slate-700 font-semibold italic leading-tight">"Let me find the best way"</p>
                </div>
                <div className="flex items-center justify-center gap-1 bg-emerald-100/50 rounded-md px-2 py-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                  <span className="text-[8px] font-bold text-emerald-700 uppercase tracking-wider">TimeWarp</span>
                </div>
              </motion.div>
            ) : <div className="h-[80px] w-full" />}
          </div>
        </div>

        {/* Row 4: SVG from TimeWarp to 3 Nodes */}
        <div className="w-full h-16 relative z-10 -mt-2">
          {step >= 6 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 350 64" preserveAspectRatio="none">
              <motion.path d="M 258.5 0 C 258.5 32, 61 32, 61 64" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              {step >= 8 && <motion.path d="M 258.5 0 C 258.5 32, 175 32, 175 64" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />}
              {step >= 10 && <motion.path d="M 258.5 0 C 258.5 32, 289 32, 289 64" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />}
            </svg>
          )}
        </div>

        {/* Row 5: 3 Parallel Nodes */}
        <div className="flex w-full gap-2 z-20 px-2">
           <div className="flex-1 h-[100px]">
             {step >= 7 && <CompactNode node={nodesData[0]} currentStep={step} startStep={7} endStep={8} />}
           </div>
           <div className="flex-1 h-[100px]">
             {step >= 9 && <CompactNode node={nodesData[1]} currentStep={step} startStep={9} endStep={10} />}
           </div>
           <div className="flex-1 h-[100px]">
             {step >= 11 && <CompactNode node={nodesData[2]} currentStep={step} startStep={11} endStep={12} />}
           </div>
        </div>

        {/* Row 6: SVG from 3 Nodes to Proposed */}
        <div className="w-full h-16 relative z-10 -mt-2">
          {step >= 13 && (
            <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 350 64" preserveAspectRatio="none">
              <motion.path d="M 61 0 C 61 32, 175 32, 175 64" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              <motion.path d="M 175 0 L 175 64" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
              <motion.path d="M 289 0 C 289 32, 175 32, 175 64" fill="none" stroke="#a7f3d0" strokeWidth="2.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6 }} />
            </svg>
          )}
        </div>

        {/* Row 7: Proposed Strategy */}
        <div className="w-full px-8 z-20">
          {step >= 14 ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white border-2 border-emerald-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-xl shadow-emerald-100/50 w-full">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800">Proposed Strategy</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-100" />
                  <div className="h-2 rounded-full bg-slate-100 flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-100" />
                  <div className="h-2 rounded-full bg-slate-100 w-3/4" />
                </div>
              </div>
              
              <button className="w-full bg-emerald-500 text-white text-[11px] font-bold py-2 rounded-lg shadow-sm hover:bg-emerald-600 transition-colors mt-1">
                Do it for me
              </button>
            </motion.div>
          ) : <div className="h-[140px] w-full" />}
        </div>
      </motion.div>
    </div>
  );
};

export default function HowItWorks() {
  return (
    <section className="pt-8 pb-32 bg-white relative z-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16 relative z-20">
          <h3 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            The Difference is in the DNA
          </h3>
        </div>
        <DesktopFlow />
        <MobileTreeFlow />
      </div>
    </section>
  );
}
