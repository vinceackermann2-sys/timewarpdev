import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import researcherIllustration from "@/assets/researcher-illustration.png";
const AiCeo = () => {
  return <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-start" style={{
    background: "linear-gradient(180deg, #0a0e1a 0%, #0d1428 10%, #112050 25%, #1a3a80 40%, #2a5ab0 55%, #3a70c8 65%, #5588d8 75%, #8090d0 82%, #b090c8 88%, #d0a0b8 93%, #c898b8 100%)"
  }}>
      {/* Stardust overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
      backgroundImage: "url('/stardust.png')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: 0.4
    }} />

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
      background: "radial-gradient(ellipse at 50% 60%, rgba(60, 100, 220, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 30% 10%, rgba(10, 20, 60, 0.3) 0%, transparent 50%)"
    }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-16 pb-8 flex flex-col items-center text-center">
        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.08] tracking-tight mb-5 font-sans">
          Get business decisions
          <br />
          completed in seconds
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-white/55 max-w-lg mb-12 leading-relaxed">
          AI CEO runs deep research on your business and turns your data into
          levers pulled–for you
        </p>

        {/* Phone mockup */}
        <div className="w-[280px] sm:w-[320px] mb-10">
          <div className="rounded-[2rem] overflow-hidden" style={{
          background: "#181d2a",
          padding: "10px",
          boxShadow: "0 30px 80px -15px rgba(0,0,0,0.5)"
        }}>
            {/* Status bar */}
            <div className="relative flex items-center justify-between px-6 pt-2.5 pb-1 text-white/50 text-[11px]">
              <span className="font-medium">9:41</span>
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[80px] h-[24px] rounded-b-2xl" style={{
              background: "#101420"
            }} />
              <div className="flex items-center gap-1.5">
                <svg width="14" height="10" viewBox="0 0 15 11" fill="currentColor">
                  <rect x="0" y="8" width="2.5" height="3" rx="0.5" />
                  <rect x="4" y="5.5" width="2.5" height="5.5" rx="0.5" />
                  <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
                  <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
                </svg>
                <svg width="13" height="10" viewBox="0 0 24 18" fill="currentColor">
                  <path d="M1 5.5C4.8 1.8 8.2 0 12 0s7.2 1.8 11 5.5l-2.2 2.2C17.8 4.8 15 3.2 12 3.2S6.2 4.8 3.2 7.7L1 5.5z" />
                  <path d="M5.5 10C7.3 8.2 9.5 7 12 7s4.7 1.2 6.5 3l-2.2 2.2C15 11 13.5 10.2 12 10.2s-3 .8-4.3 2L5.5 10z" />
                  <circle cx="12" cy="15.5" r="2" />
                </svg>
                <svg width="20" height="10" viewBox="0 0 28 13" fill="currentColor">
                  <rect x="0" y="0" width="24" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="2.5" y="2.5" width="19" height="8" rx="1.5" />
                  <rect x="25" y="4" width="3" height="5" rx="1" />
                </svg>
              </div>
            </div>

            {/* Screen content */}
            <div className="px-3 pt-2 pb-3">
              {/* Ready to research badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="h-3 w-1.5 rounded-sm bg-green-500" />
                <span className="text-white/80 text-xs font-medium">Ready to research</span>
              </div>

              {/* Chat container */}
              <div className="rounded-xl overflow-hidden mb-4" style={{
              border: "1.5px solid rgba(59, 130, 246, 0.4)",
              background: "#1e2738"
            }}>
                {/* Chat bubbles */}
                <div className="p-3" style={{
                background: "#252e42"
              }}>
                  <div className="flex justify-end mb-2.5">
                    <div className="rounded-full px-3.5 py-1.5 text-white/55 text-[10px] flex items-center gap-2" style={{
                    border: "1px solid rgba(150, 160, 200, 0.15)",
                    background: "#1e2738"
                  }}>
                      <span>how much do we spend per day?</span>
                      <span className="h-4 w-4 rounded-full bg-purple-400/30 flex items-center justify-center flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="h-5 w-5 rounded-full bg-purple-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                    </span>
                    <div className="rounded-xl px-3.5 py-1.5 text-white/45 text-[10px] leading-relaxed" style={{
                    border: "1px solid rgba(150, 160, 200, 0.15)",
                    background: "#1e2738"
                  }}>
                      your biggest spend is employees, all costs results to 13,018$ per day
                    </div>
                  </div>
                </div>

                {/* Illustration + label */}
                <div className="flex flex-col items-center py-5 px-4" style={{
                background: "#161c28"
              }}>
                  <img src={researcherIllustration} alt="Research documents illustration" className="h-24 w-auto object-contain mb-3" />
                  <h3 className="text-white font-semibold text-base mb-0.5">Researcher</h3>
                  <p className="text-white/40 text-xs">Reveals what to do next</p>
                </div>
              </div>

              {/* CTA Button */}
              <Button asChild className="w-full rounded-xl h-11 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white border-0">
                <Link to="/auth?mode=signup">Run AI CEO</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-8 text-sm text-white/50">
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
    </div>;
};
export default AiCeo;