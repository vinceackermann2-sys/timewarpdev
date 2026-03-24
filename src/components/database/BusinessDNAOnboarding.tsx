import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Telescope, Dna, ArrowRight, Globe } from "lucide-react";

const STEP_1_TEXTS = [
  "Scanning website architecture...",
  "Extracting core value propositions...",
  "Identifying market opportunities...",
  "Analyzing competitor landscape...",
  "Mapping target audience...",
];

const STEP_2_TEXTS = [
  "Synthesizing brand voice...",
  "Structuring core offerings...",
  "Defining unique selling points...",
  "Generating positioning strategy...",
  "Finalizing business profile...",
];

const SOURCES = [
  "pinterest.com/search",
  "reddit.com/r/business",
  "twitter.com/search",
  "linkedin.com/company",
  "news.ycombinator.com",
  "instagram.com/explore",
  "tiktok.com/search",
  "crunchbase.com/organization",
  "github.com/search",
];

interface BusinessDNAOnboardingProps {
  onComplete: (agentName: string) => void;
}

export function BusinessDNAOnboarding({ onComplete }: BusinessDNAOnboardingProps) {
  const [step, setStep] = useState(1);
  const [textIndex, setTextIndex] = useState(0);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [agentName, setAgentName] = useState("");
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step < 3) {
      const interval = setInterval(() => {
        setSourceIndex((prev) => (prev + 1) % SOURCES.length);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [step]);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 13600;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(Math.floor((elapsed / duration) * 100), 100);
      setProgress(p);
      if (p >= 100) clearInterval(timer);
    }, 50);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (step === 1) {
      const interval = setInterval(() => {
        setTextIndex((prev) => {
          if (prev >= STEP_1_TEXTS.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              setStep(2);
              setTextIndex(0);
            }, 800);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
      return () => clearInterval(interval);
    } else if (step === 2) {
      const interval = setInterval(() => {
        setTextIndex((prev) => {
          if (prev >= STEP_2_TEXTS.length - 1) {
            clearInterval(interval);
            setTimeout(() => {
              setStep(3);
            }, 800);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [step]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
      {/* Background Lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top 3-bump progress bar */}
      <div className="absolute top-0 left-0 w-full p-8 flex justify-center z-50">
        <div className="flex items-center gap-3 bg-card border border-border shadow-sm rounded-full px-5 py-3">
          {[1, 2, 3].map((i, index) => (
            <div key={i} className="flex items-center gap-3">
              <motion.div
                layout
                className={`rounded-full transition-all duration-500 ${
                  step === i
                    ? "w-10 h-2.5 bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                    : step > i
                      ? "w-2.5 h-2.5 bg-primary"
                      : "w-2.5 h-2.5 bg-muted"
                }`}
              />
              {index < 2 && (
                <div
                  className={`h-[2px] w-8 sm:w-12 transition-colors duration-500 ${
                    step > i ? "bg-primary/50" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Header & Progress */}
      <div className="flex flex-col items-center mb-8 mt-12">
        <AnimatePresence mode="wait">
          {step < 3 && (
            <motion.h1
              key="loading-title"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl sm:text-3xl font-extrabold mb-6 tracking-tight text-center onboarding-text-shine"
            >
              Forging your business DNA
            </motion.h1>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step < 3 && (
            <motion.div
              key="loading-progress"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-80 mt-2"
            >
              <div className="flex justify-center w-full mb-3 px-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Deep business research in progress...
                </p>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.1, ease: "linear" }}
                />
              </div>
              <div className="flex justify-end w-full px-1">
                <p className="text-sm font-bold text-primary">{progress}%</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="max-w-5xl w-full relative z-10 px-4">
        <AnimatePresence mode="wait">
          {step < 3 && (
            <motion.div
              key="analyzing-container"
              className="flex flex-col md:flex-row gap-6 w-full items-stretch justify-center mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4 }}
            >
              {/* Left Card */}
              <div className="bg-card rounded-3xl border border-border shadow-2xl shadow-primary/10 p-10 sm:p-14 flex flex-col items-center justify-center w-full md:w-1/2">
                <div className="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 relative">
                  <AnimatePresence mode="wait">
                    {step === 1 ? (
                      <motion.div
                        key="search"
                        initial={{ scale: 0, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="absolute"
                      >
                        <Telescope className="w-14 h-14 text-primary" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="dna"
                        initial={{ scale: 0, opacity: 0, rotate: -90 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0, opacity: 0, rotate: 90 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className="absolute"
                      >
                        <Dna className="w-14 h-14 text-primary" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="text-sm font-bold tracking-widest text-muted-foreground mb-4 uppercase">
                  STEP {step} OF 3
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-foreground text-center tracking-tight mb-3">
                  {step === 1 ? "Researching your business" : "Forging your business DNA."}
                </h2>

                <div className="h-6 flex items-center justify-center overflow-hidden w-full">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={`${step}-${textIndex}`}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-medium text-muted-foreground text-center"
                    >
                      {step === 1 ? STEP_1_TEXTS[textIndex] : STEP_2_TEXTS[textIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Card: Sources */}
              <div className="bg-card rounded-3xl border border-border shadow-2xl shadow-primary/10 p-8 sm:p-10 flex flex-col items-start justify-start w-full md:w-1/2">
                <div className="mb-6">
                  <Globe className="w-6 h-6 text-primary" />
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <div className="text-sm font-bold tracking-widest text-foreground uppercase">
                    Scanning Sources
                  </div>
                  <div className="flex gap-1">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} />
                  </div>
                </div>

                <div className="h-6 flex items-center overflow-hidden w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={sourceIndex}
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -10, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-sm font-medium text-muted-foreground flex items-center gap-2 w-full"
                    >
                      <span className="truncate">https://{SOURCES[sourceIndex]}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="result-card"
              className="w-full max-w-md mx-auto flex flex-col items-center"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.2 }}
            >
              {/* Orb */}
              <div className="orb-stage mb-12 mt-4">
                <div className="orb-wrapper">
                  <div className="orb-glow-aura"></div>
                  <div className="orb-connectors">
                    <div className="silver-connector silver-connector-1"></div>
                    <div className="silver-connector silver-connector-2"></div>
                  </div>
                  <div className="orb-container"></div>
                </div>
              </div>

              {/* Agent Name Input */}
              <div className="w-full flex flex-col items-center min-h-[120px] justify-center">
                <AnimatePresence mode="wait">
                  {!isNameSubmitted ? (
                    <motion.div
                      key="input-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="w-full"
                    >
                      <label
                        htmlFor="agentName"
                        className="flex items-center justify-center text-sm font-bold text-muted-foreground mb-4 uppercase tracking-wide"
                      >
                        Agent Name
                      </label>
                      <input
                        id="agentName"
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && agentName.trim().length > 0) {
                            setIsNameSubmitted(true);
                          }
                        }}
                        placeholder=""
                        className="w-full px-5 py-4 text-center text-lg bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all outline-none text-foreground font-medium shadow-sm"
                        autoFocus
                      />
                      <AnimatePresence>
                        {agentName.trim().length > 0 && (
                          <motion.p
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="text-center text-xs text-muted-foreground mt-3"
                          >
                            Press Enter to continue
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="button-view"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className="w-full flex flex-col items-center"
                    >
                      <button
                        onClick={() => onComplete(agentName.trim())}
                        className="w-full bg-card border border-border shadow-sm text-foreground hover:bg-muted px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      >
                        Take Me To {agentName.trim()}
                        <ArrowRight className="w-5 h-5 text-primary" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
