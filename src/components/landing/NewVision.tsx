import { motion } from 'framer-motion';
import { Globe, ArrowRight, Lock, Zap } from 'lucide-react';
import { TypewriterInput } from './TypewriterInput';
import futureCity from '@/assets/future-city.jpeg';

export default function NewVision() {
  return (
    <section className="py-16 sm:py-32 text-white relative overflow-hidden">
      <img src={futureCity} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/60" />
      <div className="max-w-4xl mx-auto px-6 lg:px-8 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight mb-4 sm:mb-8">
            Making work <span className="text-black">optional.</span>
          </h2>
          <p className="text-base sm:text-xl md:text-3xl text-slate-600 leading-relaxed font-light mb-8 sm:mb-16">
            For centuries, human potential has been chained to the desk, bound by the necessity of economic survival. By replacing the CEO and the operational workforce with autonomous intelligence, we are accelerating the transition to a post-labor economy.
          </p>

          <div className="flex flex-col items-center gap-3 sm:gap-4 w-full max-w-lg mt-4 sm:mt-8">
            <h3 className="text-2xl sm:text-4xl font-extrabold text-slate-900 text-center mb-1 sm:mb-2">Get levers pulled for you.</h3>
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
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-1 sm:mt-2">
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
        </motion.div>
      </div>
    </section>
  );
}
