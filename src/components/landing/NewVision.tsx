import { motion } from 'framer-motion';

export default function NewVision() {
  return (
    <section className="py-16 sm:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <h2 className="text-3xl sm:text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-4 sm:mb-8">
            Making work <span>optional.</span>
          </h2>
          <p className="text-base sm:text-xl md:text-3xl text-slate-600 leading-relaxed font-light">
            For centuries, human potential has been chained to the desk, bound by the necessity of economic survival. By replacing the CEO and the operational workforce with autonomous intelligence, we are accelerating the transition to a post-labor economy.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
