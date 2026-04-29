import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Rocket, 
  BarChart2, 
  Zap, 
  ChevronDown,
  Dna,
  Brain,
  Code,
  DollarSign,
  Target,
  Bot,
  PanelRight,
  FileText,
  Clock,
  Plus,
  Database,
  MessageSquare,
  Send,
  ArrowUp,
  CheckCircle2,
  Users,
  AlertCircle,
  Check,
  Crown
} from 'lucide-react';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 px-6 transition-all duration-300 flex items-center justify-between ${isScrolled ? 'py-3 bg-white/40 backdrop-blur-xl shadow-sm text-gray-900 border-none' : 'py-5 bg-transparent border-transparent text-white/90'}`}>
      <div className="flex items-center space-x-8">
        <div className="text-xl font-black tracking-tighter">TimeWarp</div>
      </div>
      <div className="flex items-center space-x-4">
        <Link to="/auth" className={`text-sm font-medium transition-colors ${isScrolled ? 'hover:text-gray-600' : 'hover:text-white'}`}>Log in</Link>
        <Link to="/auth?mode=signup" className={`text-sm font-semibold px-4 py-1.5 rounded-full transition-colors shadow-sm ${isScrolled ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>
          Start free
        </Link>
      </div>
    </nav>
  );
};

import { IntegrationIcons } from './DataIcons';

const AnimSinglePath = ({ 
  d, 
  duration = 3, 
  delay = 0, 
  color = "#9CA3AF", 
  hideTrack = false, 
  mobile = false,
}: { 
  d: string, 
  duration?: number, 
  delay?: number, 
  color?: string, 
  hideTrack?: boolean, 
  mobile?: boolean,
}) => {
  const trackWidth = mobile ? 0.4 : 1.5;
  const animWidth = mobile ? 0.7 : 2.5;

  return (
    <>
      {!hideTrack && <path 
        d={d} 
        stroke="#E5E7EB" 
        strokeWidth={trackWidth} 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />}
      {/* Animated Path loop */}
      <motion.path
        d={d}
        stroke={color}
        strokeOpacity="1"
        strokeWidth={animWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        strokeDasharray="20 100"
        initial={{ strokeDashoffset: 20 }}
        animate={{ strokeDashoffset: -100 }}
        transition={{ 
          duration: duration, 
          repeat: Infinity, 
          ease: "linear",
          delay: delay
        }}
      />
    </>
  );
};

const GrowBusiness = () => {
  return (
    <div className="relative w-full mx-auto flex flex-col items-center justify-start bg-transparent text-gray-900 rounded-[24px] overflow-hidden font-sans">
      
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[#fdfcfd] z-0"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:40px_40px] z-0 pointer-events-none"></div>

      {/* DESKTOP LAYOUT (Tree) hidden on mobile */}
      <div className="hidden md:block relative w-full h-[500px] z-10 max-w-5xl mx-auto">
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1000 500" preserveAspectRatio="none">
          {/* Path 1: TimeWarp -> Step 1 -> Strategy */}
          <AnimSinglePath d="M 140 200 C 245 200, 245 300, 350 300 C 475 300, 475 200, 600 200 C 725 200, 725 300, 850 300" duration={10} delay={0} />
          
          {/* Path 2: TimeWarp -> Step 2 -> Strategy */}
          <AnimSinglePath d="M 140 200 C 245 200, 245 300, 350 300 C 475 300, 475 300, 600 300 L 850 300" duration={10} delay={0} />

          {/* Path 3: TimeWarp -> Step 3 -> Strategy */}
          <AnimSinglePath d="M 140 200 C 245 200, 245 300, 350 300 C 475 300, 475 400, 600 400 C 725 400, 725 300, 850 300" duration={10} delay={0} />

          {/* Other AIs (Failure Route) */}
          <AnimSinglePath d="M 140 200 C 245 200, 245 100, 350 100" duration={10} delay={0} />
        </svg>

        {/* Node: Title */}
        <div className="absolute top-[40%] left-[14%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="bg-[#ffffff] text-gray-700 px-4 py-2.5 rounded-2xl shadow-sm font-semibold text-[13px] border border-gray-200 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-[#3B82F6]"></div>
             Grow my business
          </motion.div>
        </div>

        {/* Node: Other AIs */}
        <div className="absolute top-[20%] left-[35%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col gap-2 px-3 py-2.5 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-red-500">
                   <div className="w-2 h-2 rounded-full bg-red-500"></div>
                 </div>
                 <p className="text-[13px] font-medium text-gray-700 pr-2 tracking-tight">Other AIs</p>
             </div>
             <p className="text-[11px] text-gray-500 font-medium bg-[#f2f4f6] px-2.5 py-1.5 rounded-lg border border-gray-100">"You should sell more"</p>
          </motion.div>
        </div>

        {/* Node: TimeWarp */}
        <div className="absolute top-[60%] left-[35%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col gap-2 px-3 py-2.5 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                   <Zap className="w-4 h-4 text-[#3B82F6]" />
                 </div>
                 <p className="text-[13px] font-medium text-gray-700 pr-2 tracking-tight">TimeWarp</p>
             </div>
             <p className="text-[11px] text-gray-500 font-medium bg-[#f2f4f6] px-2.5 py-1.5 rounded-lg border border-gray-100">Let me look at the data</p>
          </motion.div>
        </div>

        {/* Node: Step 1 */}
        <div className="absolute top-[40%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="w-8 h-8 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                 <Brain className="w-4 h-4" />
             </div>
             <p className="text-[13px] font-medium text-gray-700 pr-2">Business DNA</p>
          </motion.div>
        </div>

        {/* Node: Step 2 */}
        <div className="absolute top-[60%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="w-8 h-8 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                 <Database className="w-4 h-4" />
             </div>
             <p className="text-[13px] font-medium text-gray-700 pr-2">Data Search</p>
          </motion.div>
        </div>

        {/* Node: Step 3 */}
        <div className="absolute top-[80%] left-[60%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="w-8 h-8 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                 <Target className="w-4 h-4" />
             </div>
             <p className="text-[13px] font-medium text-gray-700 pr-2">Strategy Plan</p>
          </motion.div>
        </div>

        {/* Node: Strategy */}
        <div className="absolute top-[60%] left-[85%] -translate-x-1/2 -translate-y-1/2 w-48 z-20">
          <motion.div className="px-4 py-3.5 rounded-2xl bg-[#ffffff] border border-gray-100 shadow-sm">
             <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-[#f2f4f6] flex items-center justify-center">
                    <Zap className="w-3 h-3 text-[#3B82F6] fill-current" />
                  </div>
                  <h3 className="text-gray-900 font-bold tracking-tight text-xs uppercase">Strategy</h3>
                </div>
                <div className="h-1.5 w-full bg-gray-100 rounded-full"></div>
                <div className="h-1.5 w-[85%] bg-gray-100 rounded-full"></div>
                <div className="h-1.5 w-[90%] bg-gray-100 rounded-full"></div>
                <div className="h-1.5 w-[60%] bg-gray-100 rounded-full mt-1"></div>
             </div>
          </motion.div>
        </div>

      </div>

      {/* MOBILE LAYOUT (Stack) */}
      <div className="md:hidden relative w-full h-[450px] z-10 max-w-sm mx-auto overflow-hidden mt-6 mb-8 font-sans">
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Path 1: Title -> TimeWarp -> Step 1 -> Strategy */}
          <AnimSinglePath d="M 50 8 C 50 18, 75 18, 75 35 C 75 50, 20 50, 20 65 C 20 80, 50 80, 50 92" duration={10} delay={0} mobile={true} />
          
          {/* Path 3: Title -> TimeWarp -> Step 3 -> Strategy */}
          <AnimSinglePath d="M 50 8 C 50 18, 75 18, 75 35 C 75 50, 80 50, 80 65 C 80 80, 50 80, 50 92" duration={10} delay={0} mobile={true} />
          
          {/* Animated Main Path: Title -> TimeWarp -> Step 2 -> Strategy */}
          <AnimSinglePath d="M 50 8 C 50 18, 75 18, 75 35 C 75 50, 50 50, 50 65 L 50 92" duration={10} delay={0} mobile={true} />
          
          {/* Other AIs (Failure Route) */}
          <AnimSinglePath d="M 50 8 C 50 18, 25 18, 25 35" duration={10} delay={0} mobile={true} />
        </svg>

        {/* Node: Title */}
        <div className="absolute top-[8%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="bg-[#ffffff] text-gray-700 px-3 py-2 rounded-2xl shadow-sm font-semibold text-[11px] border border-gray-200 flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></div>
             Grow my business
          </motion.div>
        </div>

        {/* Node: Other AIs */}
        <div className="absolute top-[35%] left-[25%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col gap-1.5 px-3 py-2 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="flex flex-col items-center gap-1.5">
                 <div className="w-6 h-6 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-red-500">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                 </div>
                 <p className="text-[10px] font-medium text-gray-700 tracking-tight">Other AIs</p>
             </div>
             <p className="text-[9px] text-gray-500 font-medium bg-[#f2f4f6] px-2 py-1 rounded border border-gray-100 text-center">"You should<br />sell more"</p>
          </motion.div>
        </div>

        {/* Node: TimeWarp */}
        <div className="absolute top-[35%] left-[75%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col gap-1.5 px-3 py-2 rounded-2xl bg-[#ffffff] shadow-sm border border-gray-100 mb-2">
             <div className="flex flex-col items-center gap-1.5 z-20">
                 <div className="w-6 h-6 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                   <Zap className="w-3 h-3" />
                 </div>
                 <p className="text-[10px] font-medium text-gray-700 tracking-tight">TimeWarp</p>
             </div>
             <p className="text-[9px] text-gray-500 font-medium bg-[#f2f4f6] px-2 py-1 rounded border border-gray-100 text-center z-20">Let me look at<br />the data</p>
          </motion.div>
        </div>

        {/* Node: Step 1 */}
        <div className="absolute top-[65%] left-[20%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="w-6 h-6 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                 <Brain className="w-3 h-3" />
             </div>
             <p className="text-[8px] font-medium text-gray-700 text-center w-12 leading-tight">Business DNA</p>
          </motion.div>
        </div>

        {/* Node: Step 2 */}
        <div className="absolute top-[65%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="w-6 h-6 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                 <Database className="w-3 h-3" />
             </div>
             <p className="text-[8px] font-medium text-gray-700 text-center w-12 leading-tight">Data Search</p>
          </motion.div>
        </div>

        {/* Node: Step 3 */}
        <div className="absolute top-[65%] left-[80%] -translate-x-1/2 -translate-y-1/2 w-max z-20">
          <motion.div className="flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#ffffff] shadow-sm border border-gray-100">
             <div className="w-6 h-6 rounded-xl bg-[#f2f4f6] flex items-center justify-center shrink-0 text-[#3B82F6]">
                 <Target className="w-3 h-3" />
             </div>
             <p className="text-[8px] font-medium text-gray-700 text-center w-12 leading-tight">Strategy Plan</p>
          </motion.div>
        </div>

        {/* Node: Strategy */}
        <div className="absolute top-[92%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-40 z-20">
          <motion.div className="px-3 py-3 rounded-2xl bg-[#ffffff] border border-gray-100 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-12 h-12 bg-blue-50/50 rounded-bl-full pointer-events-none"></div>
             <div className="flex flex-col gap-2 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <div className="w-5 h-5 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Zap className="w-2.5 h-2.5 text-[#3B82F6]" />
                  </div>
                  <h3 className="text-gray-900 font-bold tracking-tight text-[10px] uppercase">Strategy</h3>
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full"></div>
                <div className="h-1 w-[85%] bg-gray-100 rounded-full"></div>
                <div className="h-1 w-[60%] bg-gray-100 rounded-full"></div>
             </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

const PromptBox = () => {
  const [inputValue, setInputValue] = useState("");
  const [integrationIndex, setIntegrationIndex] = useState(0);
  const [placeholderText, setPlaceholderText] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const integrations = [
    { name: "Stripe", icon: StripeIcon },
    { name: "Gmail", icon: GmailIcon },
    { name: "Outlook", icon: OutlookIcon },
    { name: "Zoom", icon: ZoomIcon },
    { name: "Slack", icon: SlackIcon },
    { name: "Hubspot", icon: HubspotIcon }
  ];

  const placeholders = React.useMemo(() => [
    "Ask TimeWarp to run employee audit...",
    "Ask TimeWarp to draft a marketing brief...",
    "Ask TimeWarp to find our churn rate...",
    "Ask TimeWarp to review Q3 financials...",
    "Ask TimeWarp to plan a new ad campaign..."
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setIntegrationIndex((prev) => (prev + 1) % integrations.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentFullText = placeholders[placeholderIndex];
    
    if (isDeleting) {
      if (placeholderText === "") {
        setIsDeleting(false);
        setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
        timer = setTimeout(() => {}, 500);
      } else {
        timer = setTimeout(() => {
          setPlaceholderText(currentFullText.substring(0, placeholderText.length - 1));
        }, 30);
      }
    } else {
      if (placeholderText === currentFullText) {
        timer = setTimeout(() => setIsDeleting(true), 3000);
      } else {
        timer = setTimeout(() => {
          setPlaceholderText(currentFullText.substring(0, placeholderText.length + 1));
        }, 50);
      }
    }
    
    return () => clearTimeout(timer);
  }, [placeholderText, isDeleting, placeholderIndex, placeholders]);

  return (
    <div className="w-full bg-[#fcfafd] rounded-[32px] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] flex flex-col text-left">
       <div className="px-4 py-4 md:py-6">
          <input 
             type="text" 
             value={inputValue}
             onChange={(e) => setInputValue(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') setInputValue("");
             }}
             placeholder={placeholderText || " "} 
             className="w-full bg-transparent border-none outline-none text-gray-800 placeholder-gray-400 text-lg md:text-xl font-medium"
           />
       </div>
       <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-2">
             <button className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
                 <Plus className="w-5 h-5" />
             </button>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors bg-white shadow-sm text-sm font-semibold text-gray-700 min-w-[124px] relative overflow-hidden cursor-pointer h-9">
                 <span className="whitespace-nowrap">Connect to</span>
                 <AnimatePresence mode="popLayout">
                    <motion.div
                       key={integrations[integrationIndex].name}
                       initial={{ y: 20, opacity: 0 }}
                       animate={{ y: 0, opacity: 1 }}
                       exit={{ y: -20, opacity: 0 }}
                       transition={{ duration: 0.3 }}
                       className="flex items-center absolute left-[88px]"
                    >
                       {React.createElement(integrations[integrationIndex].icon, { className: "w-5 h-5 rounded-full" })}
                    </motion.div>
                 </AnimatePresence>
             </div>
          </div>
          <button 
             onClick={() => setInputValue("")}
             className="w-10 h-10 bg-black text-white rounded-2xl flex items-center justify-center hover:bg-gray-800 transition-colors shadow-md group"
          >
             <ArrowUp className="w-5 h-5 stroke-[2.5] group-hover:-translate-y-0.5 transition-transform" />
          </button>
       </div>
    </div>
  );
};

const Hero = () => {
  const bgImage = "https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&q=80";
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);

  return (
    <section className="relative isolate pt-28 pb-12 px-4 flex flex-col items-center justify-center text-center overflow-hidden">
      {/* Background Image / Gradient */}
      <div 
        className="absolute inset-0 z-[-20] bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url('${bgImage}')` }}
      />
      <div className="absolute inset-0 z-[-10] bg-[#3B82F6]/80 mix-blend-multiply" />
      <div className="absolute inset-0 z-[-5] bg-gradient-to-b from-transparent via-transparent to-[#fdfcfd]" />
      
      <motion.h1 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-5xl md:text-7xl font-bold text-white max-w-4xl tracking-tight leading-[1.1] mb-6 relative z-10"
      >
        The future of business.
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="text-lg md:text-xl text-white/90 max-w-2xl mb-10 font-medium relative z-10"
      >
        AI that runs your business for you.
      </motion.p>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="w-full max-w-3xl mx-auto flex flex-col gap-6 mb-16 relative z-20"
      >
        <PromptBox />

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/auth?mode=signup" className="bg-[#3B82F6] text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-[#2563EB] transition-colors shadow-[0_0_20px_rgba(168,113,182,0.4)] border border-white/20">
            Start for free ✨
          </Link>
        </div>
      </motion.div>
  
      <motion.div
        id="chat-mockup-section"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.6 }}
        className="relative w-full max-w-7xl rounded-3xl overflow-hidden shadow-2xl p-2 bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-sm border border-white/20 mt-4"
      >
        <ChatMockupAnimation activeStoryIdx={activeStoryIdx} onStoryChange={setActiveStoryIdx} />
      </motion.div>
    </section>
  );
};

const FeatureShowcase = () => {
  const tabs = ["Business DNA", "Backed actions", "Levers pulled", "Growing"];
  const [activeTab, setActiveTab] = useState(0);

  const tabContents = [
    {
      tag: "Business DNA",
      title: "Forge your DNA instantly.",
      description: "Connect data points and TimeWarp runs deep into your data and builds your DNA.",
      visual: (
         <div className="relative z-10 w-full h-full bg-[#fdfcfd] overflow-hidden p-6 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
               {/* Incoming Data Points */}
               <div className="absolute left-0 w-1/3 h-full flex flex-col justify-between py-6">
                 {IntegrationIcons.map((Icon, i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -40, opacity: 0, rotate: i % 2 === 0 ? -5 : 5, scale: 0.8 }}
                      animate={{ x: 100, opacity: [0, 1, 0], rotate: 0, scale: 1 }}
                      transition={{ 
                         duration: 2.5, 
                         repeat: Infinity, 
                         delay: i * 0.5,
                         ease: "easeInOut"
                      }}
                      className="absolute bg-white border border-gray-100 rounded-lg shadow-sm p-1.5 w-16 md:w-24 md:p-2 flex flex-col items-center justify-center gap-1.5 md:flex-row md:items-start"
                      style={{ top: `${8 + i * 14}%` }}
                    >
                       <div className="w-6 h-6 md:w-8 md:h-8 flex-shrink-0 flex items-center justify-center"><Icon className="w-full h-full" /></div>
                       <div className="hidden md:block w-full mt-1">
                          <div className="w-full h-1.5 bg-gray-200 rounded-full mb-1.5"></div>
                          <div className="flex gap-1 mb-1.5">
                             <div className="w-1/2 h-1 bg-gray-100 rounded-full"></div>
                             <div className="w-1/4 h-1 bg-gray-100 rounded-full"></div>
                          </div>
                          <div className="w-3/4 h-1 bg-gray-100 rounded-full"></div>
                       </div>
                    </motion.div>
                 ))}
               </div>

               {/* Central DNA Forge */}
               <div className="relative z-20 flex flex-col items-center">
                  <motion.div 
                     animate={{ rotateY: 360 }} 
                     transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                     className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-blue-400 flex items-center justify-center shadow-lg"
                  >
                     <Dna className="w-8 h-8 text-white" />
                  </motion.div>
                  <div className="mt-4 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-blue-400 px-3 py-1 rounded-full shadow-sm border border-transparent">
                     Analyzing Data...
                  </div>
               </div>

               {/* Forged DNA Outgoing: Multiple cards swarming */}
               <div className="absolute right-0 w-1/3 h-full flex items-center justify-end pr-4 py-8">
                 {[0, 1, 2, 3, 4].map((i) => (
                    <motion.div 
                      key={i}
                      initial={{ x: -80, opacity: 0, scale: 0.5, rotate: 0 }}
                      animate={{ x: 20, opacity: [0, 1, 0], scale: 1, rotate: i % 2 === 0 ? 15 : -15 }}
                      transition={{ 
                         duration: 2.5, 
                         repeat: Infinity, 
                         delay: i * 0.4,
                         ease: "easeOut"
                      }}
                      className="absolute bg-blue-50 border border-blue-200 rounded-xl p-2.5 shadow-md w-[120px] ml-auto origin-left"
                      style={{ top: `${20 + i * 15}%`, right: `${10 + (Math.random() * 20)}%` }}
                    >
                       <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full p-1.5 shadow-sm z-10 transform scale-110 rotate-[20deg]">
                           <Dna className="w-4 h-4" />
                       </div>
                       <div className="flex gap-2 mb-2 items-center">
                          <div className="w-6 h-6 rounded bg-blue-200 flex-shrink-0"></div>
                          <div className="w-full h-1.5 bg-blue-300 rounded-full"></div>
                       </div>
                       <div className="space-y-1.5 mt-2">
                          <div className="w-full h-1 bg-blue-200 rounded-full"></div>
                          <div className="w-5/6 h-1 bg-blue-200 rounded-full"></div>
                          <div className="w-4/6 h-1 bg-blue-200 rounded-full"></div>
                       </div>
                    </motion.div>
                 ))}
               </div>
            </div>
         </div>
      )
    },
    {
      tag: "Backed Actions",
      title: "Everything has your fingerprint on it.",
      description: "Every action leaves your fingerprint on it backed by your DNA. No back-and-forth. No tab switching.",
      visual: (
        <div className="relative z-10 w-full h-full bg-[#fdfcfd] flex flex-col overflow-hidden p-6 gap-4">
           <div className="flex-1 flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fdfcfd] z-10" />
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                className="bg-white border w-full border-gray-100 rounded-lg p-5 shadow-sm text-left relative z-20"
              >
                 <div className="flex gap-4 items-center">
                    <div className="text-4xl text-gray-900 font-serif leading-none">Aa</div>
                    <div>
                       <div className="font-bold text-gray-900 border-b border-gray-100 pb-1 mb-1">Typography</div>
                       <div className="text-xs text-gray-500 font-medium">Inter, Space Grotesk</div>
                    </div>
                 </div>
                 <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="font-bold text-gray-900 text-sm mb-2">Color Palette</div>
                    <div className="grid grid-cols-4 gap-2">
                       <div className="aspect-square rounded-md bg-[#0f172a] shadow-inner" />
                       <div className="aspect-square rounded-md bg-[#334155] shadow-inner" />
                       <div className="aspect-square rounded-md bg-[#e2e8f0] shadow-inner" />
                       <div className="aspect-square rounded-md bg-[#3B82F6] shadow-inner flex items-center justify-center">
                          <Check className="w-4 h-4 text-white opacity-50" />
                       </div>
                    </div>
                 </div>
              </motion.div>
           </div>
        </div>
      )
    },
    {
      tag: "Levers Pulled",
      title: "AI pulling levers for you while you sleep.",
      description: "Launch AI agents and employees that pull levers for you while you sleep. Wake up with a brief in the morning.",
      visual: (
        <div className="relative z-10 w-full h-full bg-[#fdfcfd] flex flex-col overflow-hidden p-6">
           <div className="flex-1 flex flex-col justify-center gap-0 relative mt-4">
              {/* Employee Dictating */}
              <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex justify-center relative z-20">
                 <div className="bg-white border border-gray-200 rounded-full shadow-sm px-3 py-1.5 flex items-center gap-2">
                    <div className="bg-yellow-100 p-1 rounded-full"><Crown className="w-3.5 h-3.5 text-yellow-600" /></div>
                    <span className="font-bold text-gray-800 text-xs pr-2">COO</span>
                 </div>
              </motion.div>

              {/* Connecting Lines Tree */}
              <div className="relative w-full flex flex-col items-center">
                 <div className="w-0.5 h-6 bg-gray-200"></div>
                 <div className="w-[60%] h-0.5 bg-gray-200"></div>
                 <div className="w-[60%] flex justify-between">
                    <div className="w-0.5 h-6 bg-gray-200"></div>
                    <div className="w-0.5 h-6 bg-gray-200"></div>
                 </div>
              </div>

              {/* Agents Working */}
              <div className="flex justify-center gap-2 md:gap-8 relative z-20 px-1 md:px-8 w-full">
                 {/* Coding Agent */}
                 <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white p-1.5 md:p-2 rounded-xl border border-gray-100 shadow-sm w-1/2 md:w-[45%] flex flex-col items-center relative">
                    <div className="bg-blue-50 px-1.5 py-0.5 md:px-2 rounded-full border border-blue-100 shadow-sm absolute -top-3 flex items-center gap-1 md:gap-1.5 backdrop-blur-sm z-30 whitespace-nowrap">
                       <Bot className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                       <span className="text-[7.5px] md:text-[10px] font-bold text-blue-700 truncate">Coding Agent</span>
                    </div>
                    <div className="w-full bg-[#1e1e1e] rounded flex flex-col p-1.5 md:p-2 mb-1 mt-2.5 md:mt-3 shadow-inner h-[45px] md:h-[60px] overflow-hidden text-left">
                       <div className="text-[6.5px] md:text-[8px] text-[#569cd6] font-mono leading-tight truncate">const <span className="text-[#dcdcaa]">optimize</span><span className="text-white">=()=&gt;{'{'}</span></div>
                       <div className="text-[6.5px] md:text-[8px] text-[#9cdcfe] font-mono leading-tight ml-1 md:ml-2 truncate">runAds(data);</div>
                       <div className="text-[6.5px] md:text-[8px] text-white font-mono leading-tight">{'}'}</div>
                    </div>
                 </motion.div>

                 {/* Messaging Agent */}
                 <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-white p-1.5 md:p-2 rounded-xl border border-gray-100 shadow-sm w-1/2 md:w-[45%] flex flex-col items-center relative">
                    <div className="bg-blue-50 px-1.5 py-0.5 md:px-2 rounded-full border border-blue-100 shadow-sm absolute -top-3 flex items-center gap-1 md:gap-1.5 backdrop-blur-sm z-30 whitespace-nowrap">
                       <Bot className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                       <span className="text-[7.5px] md:text-[10px] font-bold text-blue-700 truncate">Messaging Agent</span>
                    </div>
                    <div className="w-full rounded border border-gray-100 p-1.5 md:p-2 bg-[#fdfcfd] flex flex-col gap-1 mb-1 mt-2.5 md:mt-3 h-[45px] md:h-[60px] shadow-inner justify-center text-left">
                       <div className="text-[6.5px] md:text-[8px] text-gray-600 leading-tight line-clamp-2 md:line-clamp-none">Hey team! Ads are updated and live.</div>
                    </div>
                 </motion.div>
              </div>
           </div>
        </div>
      )
    },
    {
      tag: "Growing",
      title: "Compounding knowledge from every move.",
      description: "TimeWarp learns from every action, what worked, what didn't work? No more guessing. No more randomness.",
      visual: (
        <div className="relative z-10 w-full h-full bg-[#fdfcfd] flex flex-col overflow-hidden p-6 gap-4">
           <div className="flex-1 w-full bg-white rounded-lg border border-gray-100 p-4 shadow-sm flex flex-col justify-end gap-1.5 overflow-hidden relative group">
             {/* Graph Bars Container */}
             <div className="w-full h-full flex items-end justify-between gap-1 mt-12">
                {[15, 20, 18, 30, 25, 45, 40, 60, 55, 80].map((h, i) => (
                   <div key={i} className="w-full h-full flex flex-col justify-end relative group-hover:opacity-80 transition-opacity">
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${h}%` }} 
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`w-full rounded-t-sm z-0 relative ${i === 2 || i === 4 || i === 8 ? 'bg-red-400' : 'bg-emerald-400'}`}
                      />
                   </div>
                ))}
             </div>
           </div>
        </div>
      )
    }
  ];

  const currentTabInfo = tabContents[activeTab];

  return (
    <section className="py-24 px-4 bg-transparent text-center">
      <h2 className="text-3xl md:text-5xl font-bold mb-10 max-w-2xl mx-auto tracking-tight text-gray-900 leading-tight">
        A future to be excited about
      </h2>
      
      <div className="hidden md:flex flex-wrap justify-center gap-2 mb-12">
        {tabs.map((tab, idx) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(idx)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === idx ? "bg-[#DDE7FF] text-[#0F2638] shadow-md shadow-gray-200/50 ring-1 ring-gray-200" : "text-gray-500 hover:bg-[#fdfcfd] hover:text-gray-900"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="max-w-5xl mx-auto bg-[#DDE7FF] backdrop-blur-xl border border-white/60 ring-1 ring-[#3B82F6]/15 shadow-[0_8px_40px_-12px_rgba(168,113,182,0.15)] rounded-[32px] p-8 md:p-12 text-left flex flex-col md:flex-row gap-12 items-center min-h-[480px]">
        <div className="md:w-1/3">
          <p className="text-sm text-gray-500 tracking-wide mb-4">{currentTabInfo.tag}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-6">{currentTabInfo.title}</h3>
          <p className="text-gray-600 leading-relaxed mb-8">
            {currentTabInfo.description}
          </p>
        </div>
        <div className="md:w-2/3 w-full rounded-[32px] shadow-2xl p-4 md:p-6 overflow-hidden h-[420px] relative bg-[conic-gradient(from_180deg_at_50%_50%,#E195AB_0deg,#9B7BB6_120deg,#7E99C9_240deg,#E195AB_360deg)]">
            <div className="w-full h-full bg-[#fdfcfd] rounded-2xl overflow-hidden relative shadow-xl flex flex-col">
              <div className="h-10 w-full flex items-center px-4 shrink-0 bg-[#fdfcfd] z-30">
                 <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                 </div>
              </div>
              <div className="relative flex-1 bg-[#fdfcfd] overflow-hidden">
                 {currentTabInfo.visual}
              </div>
           </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between max-w-5xl mx-auto mt-6 text-sm text-gray-500 font-medium px-4">
        <button 
          onClick={() => setActiveTab(t => Math.max(0, t - 1))}
          className={`flex items-center transition-colors ${activeTab === 0 ? "text-gray-300 cursor-not-allowed" : "hover:text-gray-900 cursor-pointer"}`}
          disabled={activeTab === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </button>
        <div className="flex gap-2">
          {tabs.map((_, idx) => (
            <button 
               key={idx} 
               onClick={() => setActiveTab(idx)}
               className={`h-1.5 rounded-full transition-all duration-300 ${activeTab === idx ? "w-6 bg-gray-900" : "w-1.5 bg-gray-300"}`}
               aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
        <button 
          onClick={() => setActiveTab(t => Math.min(tabs.length - 1, t + 1))}
          className={`flex items-center transition-colors ${activeTab === tabs.length - 1 ? "text-gray-300 cursor-not-allowed" : "hover:text-gray-900 cursor-pointer"}`}
          disabled={activeTab === tabs.length - 1}
        >
          Next <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </section>
  );
};


const OutlookIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: `<svg viewBox="60 90.4 570.02 539.67"><defs><linearGradient id="microsoft_outlook__a" x1="9.989" x2="30.932" y1="22.365" y2="9.375" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#20a7fa;stop-opacity:1"/><stop offset=".4" style="stop-color:#3bd5ff;stop-opacity:1"/><stop offset="1" style="stop-color:#c4b0ff;stop-opacity:1"/></linearGradient><linearGradient id="microsoft_outlook__b" x1="17.197" x2="28.856" y1="26.794" y2="8.126" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#165ad9;stop-opacity:1"/><stop offset=".501" style="stop-color:#1880e5;stop-opacity:1"/><stop offset="1" style="stop-color:#8587ff;stop-opacity:1"/></linearGradient><linearGradient id="microsoft_outlook__c" x1="25.701" x2="12.756" y1="27.048" y2="16.501" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset=".237" style="stop-color:#448aff;stop-opacity:0"/><stop offset=".792" style="stop-color:#0032b1;stop-opacity:.2"/></linearGradient><linearGradient id="microsoft_outlook__d" x1="24.053" x2="44.51" y1="31.11" y2="18.018" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#1a43a6;stop-opacity:1"/><stop offset=".492" style="stop-color:#2052cb;stop-opacity:1"/><stop offset="1" style="stop-color:#5f20cb;stop-opacity:1"/></linearGradient><linearGradient id="microsoft_outlook__e" x1="29.828" x2="17.397" y1="30.327" y2="19.571" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#0045b9;stop-opacity:0"/><stop offset=".67" style="stop-color:#0d1f69;stop-opacity:.2"/></linearGradient><linearGradient id="microsoft_outlook__g" x1="41.998" x2="23.852" y1="29.943" y2="29.943" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#4dc4ff;stop-opacity:1"/><stop offset=".196" style="stop-color:#0fafff;stop-opacity:1"/></linearGradient><linearGradient id="microsoft_outlook__k" x1="3.458" x2="20.929" y1="37.872" y2="37.86" gradientTransform="scale(15)" gradientUnits="userSpaceOnUse"><stop offset=".206" style="stop-color:#6ce0ff;stop-opacity:1"/><stop offset=".535" style="stop-color:#50d5ff;stop-opacity:0"/></linearGradient><radialGradient id="microsoft_outlook__f" cx="0" cy="0" r="1" fx="0" fy="0" gradientTransform="matrix(0 -405.04051 438.393 0 360.027 102.268)" gradientUnits="userSpaceOnUse"><stop offset=".568" style="stop-color:#275ff0;stop-opacity:0"/><stop offset=".992" style="stop-color:#002177;stop-opacity:1"/></radialGradient><radialGradient id="microsoft_outlook__h" cx="0" cy="0" r="1" fx="0" fy="0" gradientTransform="scale(173.58) rotate(-45 5.168 -1.292)" gradientUnits="userSpaceOnUse"><stop offset=".259" style="stop-color:#0060d1;stop-opacity:.4"/><stop offset=".908" style="stop-color:#0383f1;stop-opacity:0"/></radialGradient><radialGradient id="microsoft_outlook__i" cx="0" cy="0" r="1" fx="0" fy="0" gradientTransform="matrix(357.40702 -468.44593 423.59457 323.18709 159.471 697.08)" gradientUnits="userSpaceOnUse"><stop offset=".732" style="stop-color:#f4a7f7;stop-opacity:0"/><stop offset="1" style="stop-color:#f4a7f7;stop-opacity:.501961"/></radialGradient><radialGradient id="microsoft_outlook__j" cx="0" cy="0" r="1" fx="0" fy="0" gradientTransform="matrix(-170.86087 259.7254 -674.01813 -443.40415 278.562 412.979)" gradientUnits="userSpaceOnUse"><stop offset="0" style="stop-color:#49deff;stop-opacity:1"/><stop offset=".724" style="stop-color:#29c3ff;stop-opacity:1"/></radialGradient><radialGradient id="microsoft_outlook__l" cx="0" cy="0" r="1" fx="0" fy="0" gradientTransform="rotate(46.924 -378.504 245.25) scale(315.927)" gradientUnits="userSpaceOnUse"><stop offset=".039" style="stop-color:#0091ff;stop-opacity:1"/><stop offset=".919" style="stop-color:#183dad;stop-opacity:1"/></radialGradient><radialGradient id="microsoft_outlook__m" cx="0" cy="0" r="1" fx="0" fy="0" gradientTransform="matrix(0 168 -193.782 0 180 491.159)" gradientUnits="userSpaceOnUse"><stop offset=".558" style="stop-color:#0fa5f7;stop-opacity:0"/><stop offset="1" style="stop-color:#74c6ff;stop-opacity:.501961"/></radialGradient></defs><path d="m463.984 140.145-344.347 218.27-29.614-46.72v-40.257a43.26 43.26 0 0 1 19.72-36.293L309.91 105.258c30.496-19.79 69.777-19.793 100.277-.008Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__a)"/><path d="M407.102 103.34a91.293 91.293 0 0 1 3.082 1.914l156.214 101.332-387.336 245.52-59.437-93.77L403.895 177.8c26.925-17.102 28.105-55.57 3.207-74.461Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__b)"/><path d="M407.102 103.34a91.293 91.293 0 0 1 3.082 1.914l156.214 101.332-387.336 245.52-59.437-93.77L403.895 177.8c26.925-17.102 28.105-55.57 3.207-74.461Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__c)"/><path d="M333.602 498.988 179.066 452.11 507.63 243.836c27.672-17.54 27.601-57.938-.133-75.379l-1.48-.93 4.261 2.649 99.996 64.867a43.263 43.263 0 0 1 19.723 36.3v38.962Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__d)"/><path d="M333.602 498.988 179.066 452.11 507.63 243.836c27.672-17.54 27.601-57.938-.133-75.379l-1.48-.93 4.261 2.649 99.996 64.867a43.263 43.263 0 0 1 19.723 36.3v38.962Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__e)"/><path d="M410.188 105.25c-30.5-19.785-69.782-19.781-100.282.008L109.742 235.145a43.26 43.26 0 0 0-19.719 36.292v1.97a44.479 44.479 0 0 0 20.735 36.16l248.887 156.91L609.16 309.805a44.468 44.468 0 0 0 20.824-37.664v38.168l.008-38.965c0-14.66-7.426-28.32-19.722-36.301Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__f)"/><path d="M315.77 630.05h220.449c51.777 0 93.75-41.972 93.75-93.75V272.14c0 15.301-7.864 29.528-20.82 37.665l-327.907 205.89a60.712 60.712 0 0 0-28.422 51.414c.004 34.762 28.184 62.942 62.95 62.942Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__g)"/><path d="M315.77 630.05h220.449c51.777 0 93.75-41.972 93.75-93.75V272.14c0 15.301-7.864 29.528-20.82 37.665l-327.907 205.89a60.712 60.712 0 0 0-28.422 51.414c.004 34.762 28.184 62.942 62.95 62.942Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__h)"/><path d="M315.77 630.05h220.449c51.777 0 93.75-41.972 93.75-93.75V272.14c0 15.301-7.864 29.528-20.82 37.665l-327.907 205.89a60.712 60.712 0 0 0-28.422 51.414c.004 34.762 28.184 62.942 62.95 62.942Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__i)"/><path d="M405.402 630.035H183.738c-51.777 0-93.75-41.972-93.75-93.75v-264.34a44.473 44.473 0 0 0 20.754 37.621l327.582 206.52a61.737 61.737 0 0 1 28.809 52.226c-.004 34.09-27.64 61.723-61.73 61.723Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__j)"/><path d="M405.402 630.035H183.738c-51.777 0-93.75-41.972-93.75-93.75v-264.34a44.473 44.473 0 0 0 20.754 37.621l327.582 206.52a61.737 61.737 0 0 1 28.809 52.226c-.004 34.09-27.64 61.723-61.73 61.723Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__k)"/><path d="M108.75 345h142.5c26.926 0 48.75 21.824 48.75 48.75v142.5c0 26.926-21.824 48.75-48.75 48.75h-142.5C81.824 585 60 563.176 60 536.25v-142.5C60 366.824 81.824 345 108.75 345Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__l)"/><path d="M108.75 345h142.5c26.926 0 48.75 21.824 48.75 48.75v142.5c0 26.926-21.824 48.75-48.75 48.75h-142.5C81.824 585 60 563.176 60 536.25v-142.5C60 366.824 81.824 345 108.75 345Zm0 0" style="stroke:none;fill-rule:nonzero;fill:url(#microsoft_outlook__m)"/><path d="M179.387 534c-19.848 0-36.137-6.21-48.875-18.625-12.739-12.414-19.11-28.617-19.11-48.605 0-21.11 6.465-38.18 19.395-51.22C143.73 402.517 160.66 396 181.594 396c19.781 0 35.879 6.238 48.297 18.715 12.484 12.476 18.726 28.93 18.726 49.351 0 20.985-6.469 37.899-19.398 50.75C216.352 527.606 199.742 534 179.387 534Zm.574-26.352c10.816 0 19.523-3.695 26.117-11.082 6.594-7.386 9.89-17.664 9.89-30.824 0-13.719-3.202-24.394-9.6-32.031-6.403-7.637-14.95-11.453-25.638-11.453-11.011 0-19.878 3.941-26.597 11.824-6.723 7.824-10.082 18.191-10.082 31.102 0 13.101 3.36 23.468 10.082 31.101 6.719 7.574 15.328 11.363 25.828 11.363Zm0 0" style="stroke:none;fill-rule:nonzero;fill:#fff;fill-opacity:1"/><path d="M179.332 535.848c-19.77 0-36-6.375-48.691-19.13-12.688-12.753-19.036-29.398-19.036-49.929 0-21.684 6.442-39.219 19.325-52.61 12.882-13.394 29.75-20.09 50.601-20.09 19.703 0 35.742 6.411 48.114 19.227 12.437 12.82 18.652 29.72 18.652 50.7 0 21.55-6.442 38.93-19.32 52.129-12.82 13.136-29.368 19.703-49.645 19.703Zm.57-27.067c10.778 0 19.453-3.797 26.02-11.383 6.57-7.59 9.851-18.144 9.851-31.664 0-14.093-3.187-25.058-9.562-32.902-6.379-7.844-14.89-11.766-25.54-11.766-10.972 0-19.804 4.047-26.5 12.149-6.694 8.031-10.042 18.683-10.042 31.945 0 13.457 3.348 24.106 10.043 31.95 6.695 7.78 15.273 11.671 25.73 11.671Zm0 0" style="stroke:none;fill-rule:nonzero;fill:#fff;fill-opacity:1"/></svg>` }} />
);

const SlackIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 2447.6 2452.5"><g clip-rule="evenodd" fill-rule="evenodd"><path d="m897.4 0c-135.3.1-244.8 109.9-244.7 245.2-.1 135.3 109.5 245.1 244.8 245.2h244.8v-245.1c.1-135.3-109.5-245.1-244.9-245.3.1 0 .1 0 0 0m0 654h-652.6c-135.3.1-244.9 109.9-244.8 245.2-.2 135.3 109.4 245.1 244.7 245.3h652.7c135.3-.1 244.9-109.9 244.8-245.2.1-135.4-109.5-245.2-244.8-245.3z" fill="#36c5f0"/><path d="m2447.6 899.2c.1-135.3-109.5-245.1-244.8-245.2-135.3.1-244.9 109.9-244.8 245.2v245.3h244.8c135.3-.1 244.9-109.9 244.8-245.3zm-652.7 0v-654c.1-135.2-109.4-245-244.7-245.2-135.3.1-244.9 109.9-244.8 245.2v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.3z" fill="#2eb67d"/><path d="m1550.1 2452.5c135.3-.1 244.9-109.9 244.8-245.2.1-135.3-109.5-245.1-244.8-245.2h-244.8v245.2c-.1 135.2 109.5 245 244.8 245.2zm0-654.1h652.7c135.3-.1 244.9-109.9 244.8-245.2.2-135.3-109.4-245.1-244.7-245.3h-652.7c-135.3.1-244.9 109.9-244.8 245.2-.1 135.4 109.4 245.2 244.7 245.3z" fill="#ecb22e"/><path d="m0 1553.2c-.1 135.3 109.5 245.1 244.8 245.2 135.3-.1 244.9-109.9 244.8-245.2v-245.2h-244.8c-135.3.1-244.9 109.9-244.8 245.2zm652.7 0v654c-.2 135.3 109.4 245.1 244.7 245.3 135.3-.1 244.9-109.9 244.8-245.2v-653.9c.2-135.3-109.4-245.1-244.7-245.3-135.4 0-244.9 109.8-244.8 245.1 0 0 0 .1 0 0" fill="#e01e5a"/></g></svg>` }} />
);

const GmailIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 49.4 512 399.42"><g fill="none" fill-rule="evenodd"><g fill-rule="nonzero"><path fill="#4285f4" d="M34.91 448.818h81.454V251L0 163.727V413.91c0 19.287 15.622 34.91 34.91 34.91z"/><path fill="#34a853" d="M395.636 448.818h81.455c19.287 0 34.909-15.622 34.909-34.909V163.727L395.636 251z"/><path fill="#fbbc04" d="M395.636 99.727V251L512 163.727v-46.545c0-43.142-49.25-67.782-83.782-41.891z"/></g><path fill="#ea4335" d="M116.364 251V99.727L256 204.455 395.636 99.727V251L256 355.727z"/><path fill="#c5221f" fill-rule="nonzero" d="M0 117.182v46.545L116.364 251V99.727L83.782 75.291C49.25 49.4 0 74.04 0 117.18z"/></g></svg>` }} />
);

const StripeIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M14.6 13.5c0-1.2 1.1-1.7 2.9-1.7 2.4 0 4.8.9 6.8 2.3l1.8-5.3c-2.3-1.4-5.3-2.1-8.5-2.1-5.7 0-9.6 3-9.6 8 0 8.4 11.2 6.8 11.2 10.5 0 1.4-1.3 2-3.4 2-3 0-6-1.1-8.5-2.9l-1.9 5.5c2.6 1.7 6.1 2.5 9.4 2.5 6 0 10-3 10-8.2-.1-8.9-11.2-7.2-11.2-10.6" fill="#635bff" fill-rule="evenodd"/></svg>` }} />
);

const ZoomIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: `<svg preserveAspectRatio="xMidYMid" viewBox="0 0 256 256"><defs><linearGradient id="zoom__a" x1="23.666%" x2="76.334%" y1="95.6118%" y2="4.3882%"><stop offset=".00006%" stop-color="#0845BF"/><stop offset="19.11%" stop-color="#0950DE"/><stop offset="38.23%" stop-color="#0B59F6"/><stop offset="50%" stop-color="#0B5CFF"/><stop offset="67.32%" stop-color="#0E5EFE"/><stop offset="77.74%" stop-color="#1665FC"/><stop offset="86.33%" stop-color="#246FF9"/><stop offset="93.88%" stop-color="#387FF4"/><stop offset="100%" stop-color="#4F90EE"/></linearGradient></defs><path fill="url(#zoom__a)" d="M256 128c0 13.568-1.024 27.136-3.328 40.192-6.912 43.264-41.216 77.568-84.48 84.48C155.136 254.976 141.568 256 128 256c-13.568 0-27.136-1.024-40.192-3.328-43.264-6.912-77.568-41.216-84.48-84.48C1.024 155.136 0 141.568 0 128c0-13.568 1.024-27.136 3.328-40.192 6.912-43.264 41.216-77.568 84.48-84.48C100.864 1.024 114.432 0 128 0c13.568 0 27.136 1.024 40.192 3.328 43.264 6.912 77.568 41.216 84.48 84.48C254.976 100.864 256 114.432 256 128Z"/><path fill="#FFF" d="M204.032 207.872H75.008c-8.448 0-16.64-4.608-20.48-12.032-4.608-8.704-2.816-19.2 4.096-26.112l89.856-89.856H83.968c-17.664 0-32-14.336-32-32h118.784c8.448 0 16.64 4.608 20.48 12.032 4.608 8.704 2.816 19.2-4.096 26.112l-89.6 90.112h74.496c17.664 0 32 14.08 32 31.744Z"/></svg>` }} />
);

const HubspotIcon = ({ className }: { className?: string }) => (
  <span className={`inline-block ${className}`} dangerouslySetInnerHTML={{ __html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path fill="#FF7A59" d="M331.8 275.6C306.7 299.3 291 332.9 291 370.2C291 399.5 300.7 426.5 317 448.2L267.5 498C263.1 496.4 258.4 495.5 253.5 495.5C242.7 495.5 232.6 499.7 225 507.3C217.4 514.9 213.2 525.1 213.2 535.9C213.2 546.7 217.4 556.8 225 564.4C232.6 572 242.8 576 253.5 576C264.3 576 274.4 572.1 282.1 564.4C289.7 556.8 293.9 546.6 293.9 535.9C293.9 531.7 293.3 527.7 292 523.8L342 473.6C364 490.5 391.4 500.5 421.3 500.5C493.2 500.5 551.3 442.2 551.3 370.3C551.3 305.1 503.6 251.1 441.1 241.6L441.1 180C458.6 172.6 469.3 156.2 469.3 137.1C469.3 111 448.4 89.2 422.3 89.2C396.2 89.2 375.6 111 375.6 137.1C375.6 156.2 386.3 172.6 403.8 180L403.8 241.2C388.6 243.3 374.2 247.9 361.1 254.8C333.5 233.9 243.6 169.1 192.2 130C193.4 125.6 194.2 121 194.2 116.2C194.2 87.4 170.7 64 141.8 64C113 64 89.6 87.4 89.6 116.2C89.6 145.1 113 168.5 141.8 168.5C151.6 168.5 160.7 165.6 168.6 160.9L331.8 275.6zM421.3 301.2C459.4 301.2 490.3 332.1 490.3 370.2C490.3 408.3 459.4 439.2 421.3 439.2C383.2 439.2 352.3 408.3 352.3 370.2C352.3 332.1 383.2 301.2 421.3 301.2z"/></svg>` }} />
);

const TreeNodesSection = () => (
  <section className="pt-6 pb-2 md:pt-10 md:pb-4 px-4 bg-[#fdfcfd] text-center flex flex-col items-center">
    <div className="w-full max-w-6xl mx-auto rounded-[24px] overflow-hidden flex font-sans relative text-left">
      <GrowBusiness />
    </div>
  </section>
);

const ChatMockupAnimation = ({ activeStoryIdx, onStoryChange }: { activeStoryIdx: number, onStoryChange: (idx: number) => void }) => {
  const STORIES = [
    {
      query: "Hey, why is the project delayed?",
      historyText: "project delayed...",
      thinkingSteps: [
        { text: "Decoding DNA", icon: Dna },
        { text: "Stitching the facts", icon: FileText },
        { text: "Looking for delay in Gmail", icon: GmailIcon },
        { text: "Looking for delay in Slack", icon: SlackIcon },
        { text: "Looking for delay in Outlook", icon: OutlookIcon },
      ],
      result: (
        <div className="bg-white border text-left border-gray-200 rounded-xl shadow-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#0078D4]"></div>
          <div className="p-2 border-b border-gray-50 flex items-center justify-between">
             <div className="flex items-center gap-2 text-[#0078D4] text-xs font-semibold">
                 <OutlookIcon className="w-3.5 h-3.5" /> Outlook
             </div>
             <div className="text-xs text-gray-400">10:42 AM</div>
          </div>
          <div className="p-3">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#0078D4]/10 flex items-center justify-center text-[#0078D4] font-bold text-xs">JD</div>
                <div>
                   <div className="text-sm font-semibold text-gray-900 leading-tight">John Doe</div>
                   <div className="text-[11px] text-gray-500">To: Project Team</div>
                </div>
            </div>
            <div className="text-sm font-semibold text-gray-800 mb-1">Project Delta: Status Update</div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">"Hey team, just wanted to let you know the project deadline is pushed back a few days to Thursday due to minor bugs."</p>
          </div>
        </div>
      )
    },
    {
      query: "Can you fix our branding?",
      historyText: "fix our branding...",
      thinkingSteps: [
        { text: "Analyzing current brand tone", icon: FileText },
        { text: "Scanning past campaigns", icon: Database },
        { text: "Generating new brand guidelines", icon: Brain },
        { text: "Creating tone template", icon: Dna },
        { text: "Finalizing brand voice", icon: CheckCircle2 }
      ],
      result: (
        <div className="bg-white border text-left border-gray-200 rounded-xl shadow-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#3B82F6]"></div>
          <div className="p-3">
            <div className="text-sm font-semibold text-gray-800 mb-1">Brand Voice Guidelines Updated</div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl mb-3">I've adjusted the tone from 'playful' to 'authoritative but approachable'. All new copy will use this style. Here is a preview:</p>
            <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg text-sm text-blue-900 italic font-serif">
              "We build systems that scale. You focus on the vision."
            </div>
          </div>
        </div>
      )
    },
    {
      query: "Is there a bug in the software?",
      historyText: "bug in the software...",
      thinkingSteps: [
        { text: "Scanning support tickets", icon: FileText },
        { text: "Checking Sentry logs", icon: Database },
        { text: "Cross-referencing Jira", icon: Brain },
        { text: "Identifying root cause", icon: Code },
        { text: "Drafting QA report", icon: CheckCircle2 }
      ],
      result: (
         <div className="bg-white border text-left border-gray-200 rounded-xl shadow-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
          <div className="p-3">
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold mb-1.5">
               <AlertCircle className="w-3.5 h-3.5" /> Issue Detected
            </div>
            <div className="text-sm font-semibold text-gray-800 mb-1">Checkout API Timeout Error</div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">I found 14 instances of the cart timing out during checkout over the last hour. I've automatically raised a high-priority ticket in Jira for the engineering team.</p>
          </div>
        </div>
      )
    },
    {
      query: "What's the product cost?",
      historyText: "whats the product cost...",
      thinkingSteps: [
        { text: "Fetching pricing models", icon: FileText },
        { text: "Reading Stripe data", icon: DollarSign },
        { text: "Aggregating COGS", icon: Database },
        { text: "Calculating margins", icon: BarChart2 },
        { text: "Formulating summary", icon: CheckCircle2 }
      ],
      result: (
        <div className="bg-white border text-left border-gray-200 rounded-xl shadow-md w-full relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
          <div className="p-3">
            <div className="flex items-center gap-2 text-green-600 text-xs font-bold mb-3">
               <DollarSign className="w-3.5 h-3.5 -ml-0.5" /> Margins & Cost
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                  <div className="text-gray-500 text-xs">Unit Cost (Avg)</div>
                  <div className="text-lg font-bold text-gray-900">$24.50</div>
              </div>
               <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-lg">
                  <div className="text-gray-500 text-xs">Retail Price</div>
                  <div className="text-lg font-bold text-gray-900">$89.00</div>
              </div>
               <div className="bg-green-50 border border-green-100 p-2.5 rounded-lg col-span-2">
                  <div className="text-green-700 text-xs">Gross Margin</div>
                  <div className="text-xl font-black text-green-800">72.4%</div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const activeStory = STORIES[activeStoryIdx];
  const FULL_MSG = activeStory.query;

  const [step, setStep] = useState(0); // 0: typing, 1: pause full text, 2: thinking, 3: result
  const [typedMessage, setTypedMessage] = useState("");
  const [timer, setTimer] = useState(0);
  const [thinkingStep, setThinkingStep] = useState(-1);

  useEffect(() => {
    setStep(0);
    setTypedMessage("");
    setTimer(0);
    setThinkingStep(-1);
  }, [activeStoryIdx]);

  const handleStoryChange = (idx: number) => {
    onStoryChange(idx);
    setStep(0);
    setTypedMessage("");
    setTimer(0);
    setThinkingStep(-1);
  };

  // Animation Loop
  React.useEffect(() => {
    let timeout: any;
    let interval: any;

    if (step === 0) {
      if (typedMessage.length < FULL_MSG.length) {
        timeout = setTimeout(() => {
          setTypedMessage(FULL_MSG.slice(0, typedMessage.length + 1));
        }, 40);
      } else {
        timeout = setTimeout(() => setStep(1), 500); // Wait half a second before 'sending'
      }
    } else if (step === 1) {
      timeout = setTimeout(() => { setStep(2); setThinkingStep(0); }, 200); // Very short pause between 'clicking' and 'thinking'
    } else if (step === 2) {
      interval = setInterval(() => {
        setTimer(t => {
          const next = t + 1;
          if (next === 2) setThinkingStep(1);
          if (next === 4) setThinkingStep(2);
          if (next === 6) setThinkingStep(3);
          if (next === 8) setThinkingStep(4);
          if (next === 10) setThinkingStep(5);
          if (next >= 11) setStep(3);
          return next;
        });
      }, 800);
    } else if (step === 3) {
      timeout = setTimeout(() => {
        handleStoryChange((activeStoryIdx + 1) % STORIES.length);
      }, 7000);
    }

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [step, typedMessage, FULL_MSG, activeStoryIdx, STORIES.length]);

  return (
    <div className="w-full max-w-6xl mx-auto h-[650px] md:h-[700px] bg-white rounded-[24px] border border-gray-200 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] flex overflow-hidden font-sans relative text-left">
      <div className="flex-1 flex flex-col relative w-full">
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex-1"></div>
            <div className="flex items-center gap-2 font-semibold text-sm text-gray-800">
               TimeWarp Agent <Rocket className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <div className="flex-1 flex justify-end">
              <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors">
                 <PanelRight className="w-4 h-4" />
              </button>
            </div>
          </div>
  
          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4 pb-4">
             {step >= 2 && (
               <div className="flex justify-end animate-in fade-in slide-in-from-bottom-2">
                 <div className="bg-[#3B82F6]/10 text-gray-800 px-4 py-2.5 rounded-2xl text-sm max-w-sm">
                   {FULL_MSG}
                 </div>
               </div>
             )}
  
             {step >= 2 && (
               <div className="flex flex-col gap-4 max-w-3xl animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-center gap-2 text-sm text-gray-800 font-medium">
                     Thinking... <span className="text-gray-400 text-xs font-normal">{timer}s</span>
                  </div>
                  
                  <div className="pl-3 border-l-2 border-gray-100 flex flex-col gap-2 ml-1.5">
                     {activeStory.thinkingSteps.map((stepInfo, idx) => {
                       if (thinkingStep >= idx) {
                         const StepIcon = stepInfo.icon;
                         return (
                           <div key={idx} className="flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-left-2 duration-300 text-gray-600">
                             <StepIcon className="w-3.5 h-3.5" />
                             <span className={thinkingStep === idx ? "animate-shimmer" : ""}>{stepInfo.text}</span>
                             {thinkingStep > idx && <span className="text-green-500">✔</span>}
                           </div>
                         );
                       }
                       return null;
                     })}
                  </div>
               </div>
             )}
  
             {step === 3 && (
               <div className="flex flex-col gap-4 max-w-3xl animate-in fade-in slide-in-from-bottom-4">
                  <div className="text-sm text-gray-800 font-medium mb-1">Gotcha, here's what I found:</div>
                  
                  {activeStory.result}
               </div>
             )}
          </div>
  
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-2xl">
             <div className="bg-white rounded-[20px] border border-gray-200 shadow-[0_8px_30px_-5px_rgba(0,0,0,0.08)] overflow-hidden p-2 pl-3 flex items-center">
                 <button className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
                    <Plus className="w-5 h-5" />
                 </button>
                 <input type="text" readOnly placeholder="Ask me anything..." value={step <= 1 ? typedMessage : ""} className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] py-2 px-3 text-gray-800 outline-none placeholder-gray-400" />
                 <button className={`p-2 mr-1 rounded-full transition-all flex items-center justify-center shadow-sm ${step === 1 ? 'bg-[#1D4ED8] scale-95' : 'bg-[#3B82F6]'} text-white`}>
                    <Send className="w-4 h-4" />
                 </button>
             </div>
          </div>
        </div>
  
        {/* Sidebar */}
        <div className="w-64 md:w-80 bg-[#fbfbfe] border-l border-gray-100 flex-col hidden md:flex shrink-0 z-20">
           <div className="p-4 flex items-center justify-between border-b border-gray-100 flex-shrink-0 h-14">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-800">
                 <Clock className="w-4 h-4 text-gray-500" /> Chat History
              </div>
              <button className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-white"><Plus className="w-4 h-4" /></button>
           </div>
           <div className="flex-1 overflow-y-auto px-2 py-3">
             {STORIES.map((story, idx) => (
                <div 
                  key={idx} 
                  onClick={() => handleStoryChange(idx)}
                  className={`p-3 my-1 rounded-xl cursor-pointer transition-colors group ${activeStoryIdx === idx ? 'bg-gray-100/80 shadow-inner' : 'hover:bg-gray-100/50'}`}
                >
                   <p className={`text-sm truncate font-semibold ${activeStoryIdx === idx ? 'text-gray-900 group-hover:text-gray-900' : 'text-gray-600 group-hover:text-gray-900'}`}>{story.historyText}</p>
                   <p className={`text-[10px] mt-1 font-medium ${activeStoryIdx === idx ? 'text-gray-500' : 'text-gray-400'}`}>TimeWarp {new Date(Date.now() - (idx + 1) * 20 * 60000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
             ))}
           </div>
        </div>
      </div>
  );
};

const PlatformsSection = () => {
  const integrationLogos = [
    { icon: StripeIcon },
    { icon: GmailIcon },
    { icon: OutlookIcon },
    { icon: ZoomIcon },
    { icon: SlackIcon },
    { icon: HubspotIcon },
    ...IntegrationIcons.map(icon => ({ icon })),
  ];

  // Double the array for seamless infinite scroll
  const carouselItems = [...integrationLogos, ...integrationLogos, ...integrationLogos];

  return (
    <section className="py-8 md:py-10 bg-transparent overflow-hidden">
      <div className="max-w-4xl mx-auto text-center px-4 mb-10">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-gray-900">One place. Every datapoint.</h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Connect your data - TimeWarp reads it and builds everything around your DNA
        </p>
      </div>
      
      <div className="w-full overflow-hidden relative fade-edges-x">
        <motion.div 
          className="flex gap-6 w-max"
          animate={{ x: [0, -120 * integrationLogos.length] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 20,
              ease: "linear"
            }
          }}
        >
          {carouselItems.map((item, idx) => (
            <div 
              key={idx} 
              className="flex-shrink-0 w-24 h-24 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center hover:shadow-md transition-shadow hover:-translate-y-1 transform duration-300"
            >
              <item.icon className="w-12 h-12" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const FeatureCards = () => {
  const cards = [
    { 
      title: "Dashboard", 
      icon: BarChart2, 
      desc: "See what needs attention and update yourself.",
      visual: (
        <div className="w-full h-36 bg-white/60 rounded-2xl border border-white p-3 mb-5 flex flex-col gap-2 overflow-hidden ring-1 ring-inset ring-gray-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] text-[10px]">
           <div className="flex items-center gap-2 mb-1">
             <div className="w-5 h-5 rounded-md bg-blue-100 text-blue-600 flex items-center justify-center font-bold tracking-tight text-[11px]"><Zap className="w-3 h-3 fill-current" /></div>
             <span className="font-bold text-gray-800 tracking-tight">Morning Briefing</span>
           </div>
           <div className="flex gap-2 h-full">
             <div className="flex-1 bg-white rounded border border-gray-100 p-2 flex flex-col gap-1.5 shadow-sm">
                <span className="font-semibold text-gray-500 text-[8px] uppercase tracking-wider">To-Dos</span>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm border border-gray-300"></div><span className="w-16 h-1.5 bg-gray-200 rounded-full"></span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm bg-blue-500 flex items-center justify-center"><CheckCircle2 className="w-1.5 h-1.5 text-white" /></div><span className="w-12 h-1.5 bg-gray-200 rounded-full"></span></div>
                 <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm border border-gray-300"></div><span className="w-10 h-1.5 bg-gray-200 rounded-full"></span></div>
             </div>
             <div className="flex-1 flex flex-col gap-2">
                <div className="flex-[1.2] bg-white rounded border border-gray-100 p-2 shadow-sm flex flex-col justify-center">
                   <span className="font-semibold text-gray-500 text-[8px] uppercase tracking-wider mb-1">Updates</span>
                   <div className="flex items-center justify-between mb-1">
                     <span className="w-1/2 h-1.5 bg-gray-200 rounded-full"></span>
                     <span className="text-[#10B981] font-bold text-[8px]">+12%</span>
                   </div>
                </div>
                <div className="flex-1 bg-white rounded border border-gray-100 p-2 shadow-sm flex flex-col justify-center gap-1">
                   <span className="font-semibold text-gray-500 text-[8px] uppercase tracking-wider">OKR / Obj</span>
                   <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                     <div className="w-[70%] h-full bg-blue-500"></div>
                   </div>
                </div>
             </div>
           </div>
        </div>
      )
    },
    { 
      title: "Co-Working", 
      icon: Users, 
      desc: "Bounce ideas, brainstorm campaigns, and build strategies together.",
      visual: (
        <div className="w-full h-36 bg-white/60 rounded-2xl border border-white p-3 mb-5 flex relative overflow-hidden ring-1 ring-inset ring-gray-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
           {/* Website Skeleton */}
           <div className="flex-1 flex flex-col gap-2 pr-12">
             <div className="flex items-center justify-between">
                <div className="w-8 h-2 bg-gray-200 rounded-full"></div>
                <div className="w-12 h-2 bg-gray-200 rounded-full"></div>
             </div>
             <div className="w-full h-12 bg-gray-100 rounded-lg border border-gray-200 mt-1"></div>
             <div className="flex gap-2">
                <div className="flex-1 h-8 bg-gray-100 rounded-lg border border-gray-200"></div>
                <div className="flex-[2] h-8 bg-gray-100 rounded-lg border border-gray-200"></div>
             </div>
           </div>

           {/* Extension chat overlay */}
           <motion.div initial={{ x: 50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="absolute right-0 top-0 bottom-0 w-28 bg-white/95 backdrop-blur-md border-l border-white shadow-[-5px_0_20px_-5px_rgba(0,0,0,0.05)] flex flex-col p-2 z-10 rounded-r-2xl">
              <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-gray-100">
                 <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center shrink-0">
                    <Zap className="w-2.5 h-2.5 text-blue-600 fill-current" />
                 </div>
                 <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
              </div>
              <div className="flex-1 flex flex-col gap-2 justify-end mb-1 max-h-full">
                 <div className="self-end bg-blue-50 text-[7px] font-medium text-blue-800 px-2 py-1.5 rounded-lg border border-blue-100 w-4/5 leading-snug">Change banner</div>
                 <div className="self-start text-[7px] text-gray-600 flex items-start gap-1 w-[90%]">
                   <div className="w-3.5 h-3.5 bg-blue-100 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-2 h-2 text-blue-600 fill-current" />
                   </div>
                   <div className="bg-gray-50 border border-gray-100 px-2 py-1.5 rounded-lg leading-snug">Done!</div>
                 </div>
              </div>
              <div className="h-5 bg-gray-50 rounded-full w-full mt-2 border border-gray-200 flex items-center px-2 justify-between">
                 <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
              </div>
           </motion.div>
        </div>
      )
    },
    { 
      title: "AI Employee", 
      icon: Bot, 
      desc: "Delegate repetitive tasks and manage campaigns while you sleep.",
      visual: (
        <div className="w-full h-36 bg-white/60 rounded-2xl border border-white p-3 mb-5 flex flex-col items-center justify-center relative ring-1 ring-inset ring-gray-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
           {/* Top level AI COO */}
           <div className="relative z-10 flex flex-col items-center gap-1 mb-1">
             <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm border border-blue-200 relative">
               <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full border border-white animate-pulse"></div>
               <Zap className="w-3.5 h-3.5 fill-current" />
             </div>
             <div className="text-[8px] font-bold text-gray-700 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-100 uppercase tracking-wider text-center">
                AI COO
             </div>
           </div>
           
           {/* Lines */}
           <svg className="absolute top-[40px] left-[50%] -translate-x-1/2 w-32 h-10 w-[120px] -z-0" fill="none" viewBox="0 0 120 30">
              <motion.path initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} d="M60 0 L60 10 L25 10 L25 30" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
              <motion.path initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1 }} d="M60 0 L60 10 L95 10 L95 30" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
           </svg>

           {/* Sub agents */}
           <div className="flex items-start gap-1.5 sm:gap-4 z-10 mt-1 w-full justify-center px-1">
             <motion.div initial={{ y: 5, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 }} className="flex flex-col gap-1 sm:gap-1.5 bg-white p-1.5 rounded-lg border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex-1 w-1/2 max-w-[125px]">
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md flex items-center justify-center bg-indigo-50 text-indigo-500 shrink-0">
                    <Code className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </div>
                  <div className="text-[6.5px] sm:text-[7.5px] font-bold text-gray-700 leading-tight">Coding Agent</div>
                </div>
                <div className="bg-[#f8fafc] rounded p-1 sm:p-1.5 text-[5.5px] sm:text-[7px] font-mono text-gray-600 leading-[1.3] border border-gray-100 flex-1 flex flex-col justify-center overflow-hidden">
                  <div className="truncate"><span className="text-pink-600">const</span> optimize<span className="text-gray-400">=</span><span className="text-blue-500">{"()=>{"}</span></div>
                  <div className="truncate">&nbsp;runAds(data);</div>
                  <div><span className="text-blue-500">{"}"}</span></div>
                </div>
             </motion.div>
             <motion.div initial={{ y: 5, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.7 }} className="flex flex-col gap-1 sm:gap-1.5 bg-white p-1.5 rounded-lg border border-gray-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex-1 w-1/2 max-w-[125px]">
                <div className="flex items-center gap-1">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-md flex items-center justify-center bg-emerald-50 text-emerald-600 shrink-0">
                    <MessageSquare className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                  </div>
                  <div className="text-[6.5px] sm:text-[7.5px] font-bold text-gray-700 leading-tight truncate">Messaging Agent</div>
                </div>
                <div className="bg-emerald-50/50 rounded p-1 sm:p-1.5 text-[6px] sm:text-[7.5px] text-emerald-800 leading-[1.3] border border-emerald-100/50 flex-1 flex items-center">
                  <span><span className="font-semibold">Hey team!</span> Ads are updated and live.</span>
                </div>
             </motion.div>
           </div>
        </div>
      )
    },
    { 
      title: "Chat", 
      icon: MessageSquare, 
      desc: "Always available to answer questions and find your data instantly.",
      visual: (
        <div className="w-full h-36 bg-white/60 rounded-2xl border border-white p-3.5 mb-5 flex flex-col justify-end gap-2.5 text-[11px] ring-1 ring-inset ring-gray-100/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
           <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} viewport={{ once: true }} className="self-end bg-blue-500 text-white px-3 py-2 rounded-xl rounded-tr-sm max-w-[85%] shadow-sm font-medium">
              What are our product margins?
           </motion.div>
           <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} viewport={{ once: true }} className="self-start bg-white text-gray-700 px-3 py-2.5 rounded-xl rounded-tl-sm max-w-[90%] border border-gray-100 shadow-sm">
              <div className="flex items-center gap-1 mb-1.5 font-bold text-gray-900">
                 <Zap className="w-3 h-3 text-[#3B82F6] fill-current" /> TimeWarp
              </div>
              Your core product margin is <span className="text-[#10B981] font-bold">68%</span> this quarter.
           </motion.div>
        </div>
      )
    }
  ];

  return (
    <section className="py-24 bg-transparent px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 tracking-tight text-gray-900">Making work optional.</h2>
          <p className="text-gray-500 max-w-2xl mx-auto">From missed family time to stress, TimeWarp handles the work so you can focus on life.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6">
          {cards.map((card, i) => (
            <div key={i} className="flex-1 w-full max-w-[380px] sm:min-w-[300px] bg-[#DDE7FF] backdrop-blur-xl p-6 rounded-3xl border border-white/60 ring-1 ring-[#3B82F6]/15 shadow-[0_8px_30px_-5px_rgba(168,113,182,0.12)] hover:shadow-[0_15px_45px_-5px_rgba(168,113,182,0.2)] hover:-translate-y-1 transition-all duration-300">
              {card.visual}
              <div className="flex flex-col items-start gap-4 mb-3">
                <div className="bg-white p-2.5 rounded-xl text-[#3B82F6] shadow-sm border border-[#3B82F6]/10">
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQAccordion = ({ question, answer }: { question: string, answer: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full py-6 flex items-center justify-between text-left hover:text-[#3B82F6] transition-colors group"
      >
        <span className="font-medium text-gray-900 group-hover:text-[#3B82F6] transition-colors pr-8">{question}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="pb-6 text-gray-600 text-sm leading-relaxed pr-8">
           {answer}
        </div>
      )}
    </div>
  );
};

const FAQSection = () => {
  const faqs = [
    {
      question: "Im worried about data security if connect my data?",
      answer: "TimeWarp stores your data in the cloud, it is not sold, it is not used by us (it is used by your agent that uses the intellgience from Gemini.) Your data can only be accessed through your workspace. If you want to delete your data, Reach out to vincentackermann@timewarpdev.com"
    },
    {
      question: "Is this just a wrapper for ChatGPT?",
      answer: "No, we dont use ChatGPT. TimeWarp's intelligience layer is powered by Gemini-3.1-pro."
    },
    {
      question: "It sounds like I’ll spend more time managing the AI than it saves me.",
      answer: "That's the point, the better you set up your AI - the more time you will save. Setting up is as easy as chatting."
    },
    {
      question: "What happens if the AI hallucination causes a mistake?",
      answer: "We use three safety measures you can enable 1: Verification - approve every action. 2: Focus - set directions. 3: Safety - 10 preset guardrails as well as make your own. We are so sure TimeWarp doesn't make mistakes that if it does, we will give you a full refund."
    },
    {
      question: "I already have a team. Why do I need 10+ AI employees?",
      answer: "You don't, the point of AI Employees and Agents is to give you the option to stop doing the work you hate doing the most."
    },
    {
      question: "Will my customers know if its AI generated?",
      answer: "Try for yourself and if you can't tell it's AI generated, your customers most likely won't be able to tell as well. TimeWarp also supports manual editing."
    },
    {
      question: "Is TimeWarp a pay-per-employee?",
      answer: "There is no pay per message or employee cost. TimeWarp uses actions and the weight of the task determines the actions consumed."
    },
    {
      question: "Can I cancel at any time?",
      answer: "Yes. Cancel anytime from Settings → Plans & Billing. Your plan stays active until the end of your current billing period, so you keep full access until then."
    }
  ];

  return (
    <section className="py-24 bg-transparent px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 tracking-tight text-gray-900 text-center">Frequently Asked Questions</h2>
        <div className="border-t border-gray-200">
          {faqs.map((faq, i) => <div key={i}><FAQAccordion question={faq.question} answer={faq.answer} /></div>)}
        </div>
        <p className="text-center text-sm text-gray-500 mt-10">
          Need help? Reach out to <a href="mailto:vincentackermann@timewarpdev.com" className="underline">vincentackermann@timewarpdev.com</a>
        </p>
      </div>
    </section>
  );
};

const FooterCTA = () => (
  <section className="relative pt-32 pb-48 px-4 flex flex-col items-center justify-center text-center overflow-hidden">
     <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-white to-transparent" />
     <div className="absolute inset-x-0 bottom-0 top-1/2 -z-20 bg-gradient-to-t from-[#3B82F6]/60 to-[#fdfcfd]/0 opacity-80" />
     <div 
      className="absolute inset-0 -z-30 opacity-40 bg-cover bg-bottom mix-blend-overlay"
      style={{ backgroundImage: "url('https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&q=80')" }}
    />
    
    <h2 className="text-5xl md:text-7xl font-bold text-gray-900 max-w-4xl tracking-tight mb-10 relative z-10">Get some levers pulled.</h2>
    
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 mb-8 relative z-20">
      <PromptBox />
    </div>

    <div className="flex flex-col sm:flex-row gap-4 mb-4 relative z-10">
      <Link to="/auth?mode=signup" className="bg-[#3B82F6] text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-[#2563EB] transition-colors shadow-[0_0_20px_rgba(168,113,182,0.4)] border border-white/20">
        Start for free ✨
      </Link>
      <Link to="/auth?mode=signup" className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-full font-semibold flex items-center gap-2 hover:bg-black/90 transition-colors shadow-lg">
        <svg className="w-5 h-5 bg-white rounded-full p-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </Link>
    </div>
    <p className="text-xs text-gray-500">By continuing, you agree to our <Link to="/terms" className="underline">Terms of Service</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
  </section>
);

const Footer = () => (
   <footer className="bg-[#fcfcfd] pt-16 pb-8 px-6 md:px-12">
     <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between mb-16 gap-10">
        <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
           {/* Logo Component */}
           <div className="flex items-start gap-2">
             <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center shrink-0">
               <div className="w-3 h-3 bg-white/80 rounded-full blur-[1px]"></div>
             </div>
             <div className="text-xl font-bold tracking-tight text-[#1a202c]">TimeWarp</div>
           </div>

           {/* Links */}
           <div className="flex flex-wrap gap-12 md:gap-20 mt-1 md:mt-0">
             <div>
               <h5 className="font-semibold text-gray-900 mb-4 text-[13px]">Product</h5>
               <ul className="space-y-3 text-[13px] text-gray-600">
                 <li><Link to="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link></li>
               </ul>
             </div>
             <div>
               <h5 className="font-semibold text-gray-900 mb-4 text-[13px]">Resources</h5>
               <ul className="space-y-3 text-[13px] text-gray-600">
                 <li><Link to="/support" className="hover:text-gray-900 transition-colors">Support</Link></li>
               </ul>
             </div>
             <div>
               <h5 className="font-semibold text-gray-900 mb-4 text-[13px]">Legal</h5>
               <ul className="space-y-3 text-[13px] text-gray-600">
                 <li><Link to="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</Link></li>
                 <li><Link to="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
                 <li><Link to="/data-deletion" className="hover:text-gray-900 transition-colors">Data Deletion</Link></li>
               </ul>
             </div>
             <div>
               <h5 className="font-semibold text-gray-900 mb-4 text-[13px]">Community</h5>
               <ul className="space-y-3 text-[13px] text-gray-600">
                 <li><a href="https://discord.gg/" target="_blank" rel="noreferrer" className="hover:text-gray-900 transition-colors">Discord</a></li>
               </ul>
             </div>
           </div>
        </div>
     </div>
     
     <div className="max-w-7xl mx-auto pt-6 border-t border-gray-300/60 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <div>© 2026 Vincent Ackermann, All rights reserved</div>
        <div className="flex items-center gap-1.5"><span className="text-[10px] uppercase font-medium">se</span> Made in Sweden</div>
     </div>
   </footer>
);

export default function App() {
  return (
    <div className="font-sans antialiased text-gray-900 bg-[#fdfcfd] min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <FeatureShowcase />
        <TreeNodesSection />
        <PlatformsSection />
        <FeatureCards />
        <FAQSection />
        <FooterCTA />
      </main>
      <Footer />
    </div>
  );
}

