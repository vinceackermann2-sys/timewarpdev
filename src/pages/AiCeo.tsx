import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import researcherIllustration from "@/assets/researcher-illustration.png";

const AiCeo = () => {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(180deg, #0a0e1a 0%, #111a35 20%, #1a2a5c 40%, #2d3d7a 55%, #4a5499 68%, #6a62a8 78%, #9878b8 87%, #c092c0 93%, #d4a4c8 100%)",
      }}
    >
      {/* Subtle ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 90%, rgba(160, 120, 200, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 30% 10%, rgba(20, 40, 120, 0.2) 0%, transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-16 flex flex-col items-center text-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-5">
          Get business decisions
          <br />
          completed in seconds
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-white/60 max-w-xl mb-12 leading-relaxed">
          AI CEO runs deep research on your business and turns your data into
          levers pulled–for you
        </p>

        {/* Phone mockup */}
        <div className="relative w-[280px] sm:w-[320px] mx-auto mb-10">
          {/* Phone frame */}
          <div className="rounded-[2.2rem] border-[2.5px] border-white/[0.08] bg-[#0d1117] shadow-[0_20px_80px_-10px_rgba(0,0,0,0.6)] overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pt-3 pb-1 text-white/50 text-[11px] relative">
              <span className="font-medium">9:41</span>
              {/* Notch */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1 w-[90px] h-[26px] bg-black rounded-full" />
              {/* Status icons */}
              <div className="flex items-center gap-1">
                {/* Signal bars */}
                <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
                  <rect x="0" y="8" width="2.5" height="3" rx="0.5" />
                  <rect x="4" y="5.5" width="2.5" height="5.5" rx="0.5" />
                  <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
                  <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
                </svg>
                {/* WiFi */}
                <svg width="14" height="11" viewBox="0 0 24 18" fill="currentColor">
                  <path d="M1 5.5C4.8 1.8 8.2 0 12 0s7.2 1.8 11 5.5l-2.2 2.2C17.8 4.8 15 3.2 12 3.2S6.2 4.8 3.2 7.7L1 5.5z" />
                  <path d="M5.5 10C7.3 8.2 9.5 7 12 7s4.7 1.2 6.5 3l-2.2 2.2C15 11 13.5 10.2 12 10.2s-3 .8-4.3 2L5.5 10z" />
                  <circle cx="12" cy="15.5" r="2" />
                </svg>
                {/* Battery */}
                <svg width="22" height="11" viewBox="0 0 28 13" fill="currentColor">
                  <rect x="0" y="0" width="24" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="2.5" y="2.5" width="19" height="8" rx="1.5" />
                  <rect x="25" y="4" width="3" height="5" rx="1" />
                </svg>
              </div>
            </div>

            {/* App content */}
            <div className="px-4 pb-5 pt-2">
              {/* Ready to research badge */}
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-400/90" />
                <span className="text-white/90 text-sm font-medium">
                  Ready to research
                </span>
              </div>

              {/* Chat area */}
              <div className="rounded-2xl border border-blue-500/20 bg-[#111827]/80 p-4 mb-4">
                {/* User message */}
                <div className="flex justify-end mb-3">
                  <div className="bg-[#1e2a45]/80 rounded-full px-4 py-2 text-white/70 text-xs flex items-center gap-2">
                    how much do we spend per day?
                    <span className="h-5 w-5 rounded-full bg-blue-500/30 flex items-center justify-center">
                      <span className="h-2 w-2 rounded-full bg-blue-400" />
                    </span>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-2 mb-5">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0 mt-0.5" />
                  <div className="bg-[#1e2a45]/80 rounded-xl px-3 py-2 text-white/60 text-xs leading-relaxed">
                    your biggest spend is employees, all costs results to
                    13,018$ per day
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
                  <h3 className="text-white font-semibold text-lg">
                    Researcher
                  </h3>
                  <p className="text-white/40 text-sm">
                    Reveals what to do next
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                asChild
                className="w-full rounded-xl h-12 text-base font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-lg shadow-blue-500/15 border-0"
              >
                <Link to="/auth?mode=signup">Run AI CEO</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-8 text-sm text-white/55">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-400" />
            <span>No credit card</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span>15-90 Seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCeo;
