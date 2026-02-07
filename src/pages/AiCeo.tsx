import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import researcherIllustration from "@/assets/researcher-illustration.png";

const AiCeo = () => {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: "linear-gradient(180deg, #0f1629 0%, #1a2454 25%, #2a3a7c 45%, #4a5aaa 65%, #7a6eb8 80%, #b08abf 90%, #d4a0c0 100%)",
      }}
    >
      {/* Subtle gradient overlays */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 30% 20%, rgba(30, 60, 160, 0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(180, 120, 200, 0.25) 0%, transparent 60%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
          Get business decisions<br />completed in seconds
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-white/70 max-w-xl mb-12">
          AI CEO runs deep research on your business and turns your data into
          levers pulled–for you
        </p>

        {/* Phone mockup */}
        <div className="relative w-[300px] sm:w-[340px] mx-auto mb-10">
          {/* Phone frame */}
          <div className="rounded-[2.5rem] border-[3px] border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pt-3 pb-1 text-white/60 text-[11px]">
              <span>9:41</span>
              <div className="absolute left-1/2 -translate-x-1/2 top-2 w-24 h-6 bg-black rounded-full" />
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11a2 2 0 0 0-2-2h-6l.9-4.3a.5.5 0 0 0 0-.2c0-.3-.1-.6-.3-.8L14.2 2 7.6 8.6C7.2 9 7 9.5 7 10v10a2 2 0 0 0 2 2h9c.8 0 1.5-.5 1.8-1.2l3-7c.1-.2.2-.5.2-.8v-2z" /></svg>
              </div>
            </div>

            {/* App content */}
            <div className="px-4 pb-5 pt-2">
              {/* Ready to research badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />
                <span className="text-white text-sm font-medium">Ready to research</span>
              </div>

              {/* Chat area */}
              <div className="rounded-2xl border border-blue-500/30 bg-[#131b2e] p-4 mb-4">
                {/* User message */}
                <div className="flex justify-end mb-3">
                  <div className="bg-[#1e2a45] rounded-full px-4 py-2 text-white/80 text-xs flex items-center gap-2">
                    how much do we spend per day?
                    <span className="h-5 w-5 rounded-full bg-blue-500/40 flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                    </span>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-2 mb-5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="bg-[#1e2a45] rounded-xl px-3 py-2 text-white/70 text-xs leading-relaxed">
                    your biggest spend is employees, all costs results to 13,018$ per day
                  </div>
                </div>

                {/* Illustration */}
                <div className="flex justify-center mb-3">
                  <img
                    src={researcherIllustration}
                    alt="Research documents illustration"
                    className="h-28 w-auto object-contain"
                  />
                </div>

                {/* Label */}
                <div className="text-center">
                  <h3 className="text-white font-semibold text-lg">Researcher</h3>
                  <p className="text-white/50 text-sm">Reveals what to do next</p>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                asChild
                className="w-full rounded-xl h-12 text-base font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg shadow-blue-500/20"
              >
                <Link to="/auth?mode=signup">Run AI CEO</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-8 text-sm text-white/70">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span>No credit card</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
            <span>15-90 Seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCeo;
