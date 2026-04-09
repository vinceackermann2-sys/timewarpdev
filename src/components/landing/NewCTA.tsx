import { motion } from 'framer-motion';
import { Globe, ArrowRight, Lock, Zap } from 'lucide-react';
import { TypewriterInput } from './TypewriterInput';

export default function NewCTA() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left – CTA */}
        <div className="flex flex-col items-start gap-3 sm:gap-4 w-full max-w-lg">
          <h3 className="text-2xl sm:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">Get levers pulled for you.</h3>
          <p className="text-[10px] sm:text-xs font-medium text-[#3399ff] uppercase tracking-wider">Paste company url</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center bg-white rounded-2xl p-2 w-full shadow-xl shadow-slate-200/50 border border-slate-200 gap-2 sm:gap-0">
            <div className="flex items-center flex-1 min-w-0 px-4 py-2 sm:py-0">
              <Globe className="w-5 h-5 mr-3 shrink-0 text-slate-400" />
              <TypewriterInput className="w-full bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400 text-sm sm:text-base" />
            </div>
            <button className="bg-[#3399ff] hover:bg-[#287acc] shrink-0 px-6 py-3 rounded-xl text-white font-bold text-sm border-none cursor-pointer transition-colors whitespace-nowrap flex items-center justify-center gap-2">
              Get DNA <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1 sm:mt-2">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-medium text-slate-500">No credit card</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-sm font-medium text-slate-500">30 seconds</span>
            </div>
          </div>
        </div>

        {/* Right – Vision text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4 sm:mb-6">
            Making work optional.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-light">
            For centuries, human potential has been chained to the desk, bound by the necessity of economic survival. By replacing the CEO and the operational workforce with autonomous intelligence, we are accelerating the transition to a post-labor economy.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
