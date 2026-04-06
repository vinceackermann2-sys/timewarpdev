import { motion } from "framer-motion";

export default function ZipGreaterGood() {
  return (
    <section className="py-16 lg:py-32 bg-background text-foreground relative overflow-hidden z-10 min-h-[60vh] sm:min-h-[80vh] flex items-center">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[800px] h-[400px] sm:h-[800px] bg-primary/10 rounded-full blur-[120px] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-primary/5 rounded-full blur-[80px] opacity-50" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-10 sm:mb-16">
          <h2
            className="text-3xl sm:text-4xl md:text-6xl font-extrabold mb-3 sm:mb-4 tracking-tight text-foreground"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            This Is TimeWarp
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground font-light">
            Enjoy life without being chained to your work
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-12">
          <motion.div
            className="bg-card p-6 rounded-3xl shadow-lg border border-border"
            whileHover={{ y: -10 }}
          >
            <img
              src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop"
              alt="You are offline"
              className="w-full h-64 object-cover rounded-2xl mb-6"
              referrerPolicy="no-referrer"
              loading="eager"
            />
            <h3 className="text-2xl font-bold mb-2 text-foreground">You are offline</h3>
            <p className="text-muted-foreground">Living your life, free from the constraints of the office.</p>
          </motion.div>

          <motion.div
            className="bg-card p-6 rounded-3xl shadow-lg border border-border"
            whileHover={{ y: -10 }}
          >
            <img
              src="https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop"
              alt="Your CEO is working"
              className="w-full h-64 object-cover rounded-2xl mb-6"
              referrerPolicy="no-referrer"
              loading="eager"
            />
            <h3 className="text-2xl font-bold mb-2 text-foreground">Your CEO is working</h3>
            <p className="text-muted-foreground">Autonomous intelligence handling the business 24/7.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
