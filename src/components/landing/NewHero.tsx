import { useEffect, useState } from 'react';
import { Globe, ArrowRight, Sparkles, Lock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Screen1, Screen2, Screen3, Screen4, steps, STEP_DURATIONS } from './NewHowItWorks';
import { TypewriterInput } from './TypewriterInput';

const BrowserMockup = ({ activeStep }: { activeStep: number }) => {
  return (
    <div className="relative w-full aspect-square sm:aspect-[16/10] bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
      <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2 shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex justify-center items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#4a86ff]" />
          <span className="text-[11px] text-slate-600 font-medium tracking-wide">AI CEO</span>
        </div>
      </div>

      <div className="flex gap-1 px-4 pt-3 pb-2 bg-white border-b border-slate-100 shrink-0">
        {steps.map((_, i) => (
          <div key={i} className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              key={`${activeStep}-${i}`}
              className="h-full bg-[#4a86ff]"
              initial={{ width: i < activeStep ? "100%" : "0%" }}
              animate={{ width: i <= activeStep ? "100%" : "0%" }}
              transition={{ duration: i === activeStep ? STEP_DURATIONS[i] / 1000 : 0.3, ease: "linear" }}
            />
          </div>
        ))}
      </div>

      <div className="relative flex-1 overflow-hidden bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -10 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {activeStep === 0 && <Screen1 />}
            {activeStep === 1 && <Screen2 />}
            {activeStep === 2 && <Screen3 />}
            {activeStep === 3 && <Screen4 />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

interface NewHeroProps {
  onGetDNA?: (url: string) => void;
}

export default function NewHero({ onGetDNA }: NewHeroProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (activeStep === 3) return;
    const timer = setTimeout(() => {
      setActiveStep((prev) => prev + 1);
    }, STEP_DURATIONS[activeStep]);
    return () => clearTimeout(timer);
  }, [activeStep]);

  const handleGetDNA = () => {
    onGetDNA?.(url);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-48px)] overflow-hidden flex flex-col lg:flex-row items-center justify-center bg-white py-12 sm:py-20 px-4 sm:px-6 pt-28 sm:pt-32">
      <div className="max-w-[90rem] w-full mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-center relative z-10">
        <div className="flex flex-col items-start gap-6 sm:gap-8 max-w-xl">
          <div className="flex flex-col items-start gap-3 sm:gap-4 w-full">
            <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-none text-slate-900 m-0">
              The future of <span className="text-[#4a86ff] italic" style={{ fontFamily: 'cursive' }}>business</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl font-normal text-slate-600 m-0">
              Ai powered businesses
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:gap-4 w-full max-w-md">
            <p className="text-[10px] sm:text-xs font-medium text-[#4a86ff] uppercase tracking-wider">Paste company url</p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-2xl p-2 w-full shadow-lg border border-slate-200 gap-2 sm:gap-0">
              <div className="flex items-center flex-1 min-w-0 px-4 py-2 sm:py-0">
                <Globe className="w-5 h-5 mr-3 shrink-0 text-slate-400" />
                <TypewriterInput value={url} onChange={setUrl} className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-sm sm:text-base" />
              </div>
              <button onClick={handleGetDNA} className="bg-[#4a86ff] hover:bg-[#2875ff] shrink-0 px-6 py-3 rounded-xl text-white font-bold text-sm border-none cursor-pointer transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                Get DNA <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 sm:mt-2">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-sm font-medium text-slate-600">30 seconds</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end w-full">
          <BrowserMockup activeStep={activeStep} />
        </div>
      </div>
    </div>
  );
}
