import { Hexagon, Triangle, Circle, Square, Command, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NewValueComparison() {
  return (
    <section className="py-12 sm:py-20 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Logo List */}
        <div className="text-center mb-16 sm:mb-24">
          <p className="text-xs sm:text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6 sm:mb-8">
            Trusted by innovative teams worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 md:gap-16 opacity-40 grayscale">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Hexagon className="w-5 h-5 sm:w-7 sm:h-7" />
              <span className="text-lg sm:text-2xl font-bold tracking-tight">AcmeCorp</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Triangle className="w-5 h-5 sm:w-7 sm:h-7" />
              <span className="text-lg sm:text-2xl font-bold tracking-tight">GlobalTech</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Circle className="w-5 h-5 sm:w-7 sm:h-7" />
              <span className="text-lg sm:text-2xl font-bold tracking-tight">Quantum</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Square className="w-5 h-5 sm:w-7 sm:h-7" />
              <span className="text-lg sm:text-2xl font-bold tracking-tight">Nexus</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Command className="w-5 h-5 sm:w-7 sm:h-7" />
              <span className="text-lg sm:text-2xl font-bold tracking-tight">Stark</span>
            </div>
          </div>
        </div>

        {/* Two Modes Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 max-w-6xl mx-auto">
          {/* Card 1: Co Work */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[350px] sm:h-[450px]">
            <div className="p-6 sm:p-8 pb-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">Co Work</h3>
              <p className="text-base sm:text-lg text-slate-600">Work alongside your AI assistant directly in your browser.</p>
            </div>
            <div className="flex-1 relative mt-4 bg-slate-50 border-t border-slate-100 overflow-hidden">
              <div className="absolute inset-0 p-6 flex gap-6">
                <div className="w-1/4 h-full flex flex-col gap-4">
                  <div className="w-full h-5 bg-slate-200 rounded animate-pulse" />
                  <div className="w-3/4 h-5 bg-slate-200 rounded animate-pulse" />
                  <div className="w-5/6 h-5 bg-slate-200 rounded animate-pulse" />
                  <div className="w-full h-5 bg-slate-200 rounded animate-pulse mt-4" />
                  <div className="w-2/3 h-5 bg-slate-200 rounded animate-pulse" />
                </div>
                <div className="flex-1 flex flex-col gap-6">
                  <div className="w-1/3 h-8 bg-slate-200 rounded animate-pulse" />
                  <div className="w-full h-32 bg-slate-200 rounded-xl animate-pulse" />
                  <div className="w-full h-24 bg-slate-200 rounded-xl animate-pulse" />
                </div>
              </div>
              <motion.div 
                initial={{ x: 50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="absolute right-2 sm:right-6 top-2 sm:top-6 w-40 sm:w-72 h-48 sm:h-auto sm:bottom-6 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
              >
                <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50">
                  <Sparkles className="w-5 h-5 text-[#3399ff]" />
                  <span className="text-sm font-bold text-slate-700">TimeWarp</span>
                </div>
                <div className="flex-1 p-4 flex flex-col gap-4 overflow-hidden">
                  <div className="bg-slate-100 rounded-xl p-3 text-xs text-slate-600 w-5/6 self-start leading-relaxed">
                    How can I help you on this page?
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 1 }}
                    className="hidden sm:block bg-[#3399ff]/10 rounded-xl p-3 text-xs text-[#3399ff] font-medium w-5/6 self-end leading-relaxed"
                  >
                    Summarize this data and draft an email to the team.
                  </motion.div>
                </div>
                <div className="p-3 border-t border-slate-100 bg-white">
                  <div className="h-10 bg-slate-100 rounded-xl flex items-center px-3">
                    <span className="text-xs text-slate-400">Ask anything...</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Card 2: AI Employees */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col h-[350px] sm:h-[450px]">
            <div className="p-6 sm:p-8 pb-4">
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 sm:mb-3">AI Employees</h3>
              <p className="text-base sm:text-lg text-slate-600">Autonomous agents executing tasks across your entire stack.</p>
            </div>
            <div className="flex-1 relative mt-4 bg-slate-900 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:24px_24px]" />
              
              <motion.div 
                animate={{ y: [0, -10, 0] }} 
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[5%] sm:left-[10%] top-[10%] sm:top-[15%] w-40 sm:w-48 h-28 sm:h-32 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 opacity-95"
              >
                <div className="h-6 bg-slate-100 border-b border-slate-200 flex items-center px-2 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="ml-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Salesforce</span>
                </div>
                <div className="p-3 flex flex-col gap-2.5 relative h-full">
                  <div className="w-full h-2 bg-slate-100 rounded" />
                  <div className="w-3/4 h-2 bg-slate-100 rounded" />
                  <div className="w-5/6 h-2 bg-slate-100 rounded" />
                  <div className="absolute bottom-3 right-3 w-7 h-7 bg-[#3399ff] rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }} 
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute right-[5%] sm:right-[10%] bottom-[10%] sm:bottom-[15%] w-40 sm:w-48 h-28 sm:h-32 bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-700 opacity-95"
              >
                <div className="h-6 bg-slate-100 border-b border-slate-200 flex items-center px-2 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="ml-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Gmail</span>
                </div>
                <div className="p-3 flex flex-col gap-2.5 relative h-full">
                  <div className="w-full h-2 bg-slate-100 rounded" />
                  <div className="w-5/6 h-2 bg-slate-100 rounded" />
                  <div className="w-4/6 h-2 bg-slate-100 rounded" />
                  <div className="absolute top-3 right-3 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              </motion.div>

              <div className="relative z-10 w-20 h-20 bg-slate-800 rounded-2xl border border-slate-600 flex items-center justify-center shadow-2xl">
                <Sparkles className="w-8 h-8 text-[#3399ff]" />
                <div className="absolute -inset-4 rounded-3xl border border-[#3399ff]/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
